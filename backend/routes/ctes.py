from datetime import datetime
from flask import Blueprint, request, current_app, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from extensions import db
from models import Cte, NotaFiscal
from helpers import ok, erro, admin_required, allowed_file, save_upload

bp = Blueprint('ctes', __name__, url_prefix='/api/ctes')


def _parse_date(v):
    return datetime.strptime(v, '%Y-%m-%d').date() if v else None


def _pode_ver(cte):
    claims = get_jwt()
    if claims.get('is_admin'):
        return True
    return str(cte.nota_fiscal.cliente_id) == get_jwt_identity()


@bp.get('')
@jwt_required()
def listar():
    nf_id = request.args.get('nf_id')
    query = Cte.query
    if nf_id:
        query = query.filter_by(nf_id=nf_id)
    claims = get_jwt()
    if not claims.get('is_admin'):
        query = query.join(NotaFiscal).filter(NotaFiscal.cliente_id == get_jwt_identity())
    return ok([c.to_dict() for c in query.order_by(Cte.id.desc()).all()])


@bp.get('/<int:id>')
@jwt_required()
def obter(id):
    c = Cte.query.get(id)
    if not c:
        return erro('CT-e não encontrado', 404)
    if not _pode_ver(c):
        return erro('Acesso negado', 403)
    return ok(c.to_dict())


@bp.post('')
@admin_required
def criar():
    body = request.form if request.form else (request.get_json(silent=True) or {})
    for campo in ('nf_id', 'transportadora_id', 'numero_cte'):
        if not body.get(campo):
            return erro(f'Campo obrigatório: {campo}')
    c = Cte(nf_id=body['nf_id'], transportadora_id=body['transportadora_id'],
            numero_cte=body['numero_cte'], valor_frete=body.get('valor_frete', 0),
            data_emissao=_parse_date(body.get('data_emissao')))
    if 'pdf' in request.files and allowed_file(request.files['pdf'].filename, {'pdf'}):
        c.pdf = save_upload(request.files['pdf'], 'ctes/pdf')
    if 'xml' in request.files and allowed_file(request.files['xml'].filename, {'xml'}):
        c.xml = save_upload(request.files['xml'], 'ctes/xml')
    db.session.add(c)
    db.session.commit()
    return ok(c.to_dict(), 'CT-e criado', 201)


@bp.put('/<int:id>')
@admin_required
def atualizar(id):
    c = Cte.query.get(id)
    if not c:
        return erro('CT-e não encontrado', 404)
    body = request.form if request.form else (request.get_json(silent=True) or {})
    for campo in ('numero_cte', 'valor_frete', 'transportadora_id', 'nf_id'):
        if campo in body:
            setattr(c, campo, body[campo])
    if 'data_emissao' in body:
        c.data_emissao = _parse_date(body['data_emissao'])
    if 'pdf' in request.files and allowed_file(request.files['pdf'].filename, {'pdf'}):
        c.pdf = save_upload(request.files['pdf'], 'ctes/pdf')
    if 'xml' in request.files and allowed_file(request.files['xml'].filename, {'xml'}):
        c.xml = save_upload(request.files['xml'], 'ctes/xml')
    db.session.commit()
    return ok(c.to_dict(), 'CT-e atualizado')


@bp.delete('/<int:id>')
@admin_required
def excluir(id):
    c = Cte.query.get(id)
    if not c:
        return erro('CT-e não encontrado', 404)
    db.session.delete(c)
    db.session.commit()
    return ok(None, 'CT-e excluído')


@bp.get('/arquivo/<path:subpath>')
@jwt_required()
def baixar_arquivo(subpath):
    return send_from_directory(current_app.config['UPLOAD_FOLDER'], subpath, as_attachment=False)
