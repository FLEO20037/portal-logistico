import os
from flask import Flask, send_from_directory, abort, request
from flask_cors import CORS
from config import Config
from extensions import db, jwt


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    jwt.init_app(app)

    frontend_url = os.environ.get(
        'FRONTEND_URL',
        'https://portal-logistico-frontend.onrender.com'
    )
    allowed_origins = {
        origin.strip().rstrip('/')
        for origin in frontend_url.split(',')
        if origin.strip()
    }

    CORS(
        app,
        resources={r'/api/*': {'origins': list(allowed_origins)}},
        supports_credentials=True,
        methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allow_headers=['Content-Type', 'Authorization'],
    )

    @app.before_request
    def handle_cors_preflight():
        if request.method == 'OPTIONS' and request.path.startswith('/api/'):
            return ('', 204)

    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get('Origin')
        if origin and origin.rstrip('/') in allowed_origins and request.path.startswith('/api/'):
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
            response.headers['Vary'] = 'Origin'
        return response

    from routes.auth import bp as auth_bp
    from routes.clientes import bp as clientes_bp
    from routes.transportadoras import bp as transportadoras_bp
    from routes.notas import bp as notas_bp
    from routes.ctes import bp as ctes_bp
    from routes.boletos import bp as boletos_bp
    from routes.dashboard import bp as dashboard_bp

    for bp in (auth_bp, clientes_bp, transportadoras_bp, notas_bp, ctes_bp, boletos_bp, dashboard_bp):
        app.register_blueprint(bp)

    @app.route('/uploads/<path:subpath>')
    def uploads(subpath):
        import storage
        from flask import redirect
        if storage.enabled():
            url = storage.presigned_url(subpath)
            if not url:
                abort(404)
            return redirect(url)
        return send_from_directory(app.config['UPLOAD_FOLDER'], subpath)

    with app.app_context():
        db.create_all()
        _migrar_boletos_para_many_to_many()
        _seed_admin()

    return app


def _migrar_boletos_para_many_to_many():
    from sqlalchemy import text
    insp = db.inspect(db.engine)
    if 'boletos' not in insp.get_table_names():
        return
    colunas = [c['name'] for c in insp.get_columns('boletos')]
    if 'cte_id' not in colunas:
        return
    with db.engine.begin() as conn:
        linhas = conn.execute(text("SELECT id, cte_id FROM boletos WHERE cte_id IS NOT NULL")).fetchall()
        for boleto_id, cte_id in linhas:
            conn.execute(text(
                "INSERT INTO boleto_ctes (boleto_id, cte_id) "
                "SELECT :b, :c WHERE NOT EXISTS (SELECT 1 FROM boleto_ctes WHERE boleto_id=:b AND cte_id=:c)"
            ), {'b': boleto_id, 'c': cte_id})
        conn.execute(text("ALTER TABLE boletos DROP COLUMN cte_id"))


def _seed_admin():
    from models import Cliente
    admin = Cliente.query.filter_by(email='admin@portal.com').first()
    if not admin:
        admin = Cliente(nome='Administrador', cnpj='00000000000000', email='admin@portal.com')
        db.session.add(admin)
    admin.nome = 'Administrador'
    admin.ativo = True
    admin.is_admin = True
    admin.set_senha('admin123')
    db.session.commit()


if __name__ == '__main__':
    create_app().run(debug=True, port=5000)
