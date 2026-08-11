from flask import Flask, send_from_directory
from flask_cors import CORS
from config import Config
from extensions import db, jwt


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    jwt.init_app(app)
    import os
    origin = os.environ.get('FRONTEND_URL', '*')
    CORS(app, resources={r"/api/*": {"origins": origin}}, supports_credentials=True)

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
        return send_from_directory(app.config['UPLOAD_FOLDER'], subpath)

    with app.app_context():
        db.create_all()
        _seed_admin()

    return app


def _seed_admin():
    from models import Cliente
    if not Cliente.query.filter_by(email='admin@portal.com').first():
        admin = Cliente(nome='Administrador', cnpj='00000000000000', email='admin@portal.com',
                         ativo=True, is_admin=True)
        admin.set_senha('admin123')
        db.session.add(admin)
        db.session.commit()


if __name__ == '__main__':
    create_app().run(debug=True, port=5000)
