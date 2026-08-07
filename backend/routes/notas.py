from datetime import datetime
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from extensions import db
from models import NotaFiscal
from helpers import ok, erro, admin_required

bp = Blueprint('notas', __name__, url_prefix='/api/notas-fiscais')


def _parse_date(v):
    return datetime.strptime(v, '%Y-%m-%d').date() if v else None


@bp.get('')
@jwt_required()
def listar():
    claims = get_jwt()
    query = NotaFiscal.query
    if not claims.get('is_admin'):
        query = query.filter_by(cliente_id=get_jwt_identity())
    else:
        cliente_id = request.args.get('cliente_id')
        if cliente_id:
            query = query.filter_by(cliente_id=cliente_id)
    q = request.args.get('q', '').strip()
    if q:
        like = f'%{q}%'
        query = query.filter(db.or_(NotaFiscal.numero_nf.ilike(like), NotaFiscal.origem.ilike(like), NotaFiscal.destino.ilike(like)))
    return ok([n.to_dict() for n in query.order_by(NotaFiscal.id.desc()).all()])


@bp.get('/<int:id>')
@jwt_required()
def obter(id):
    n = NotaFiscal.query.get(id)
    if not n:
        return erro('Nota fiscal não encontrada', 404)
    claims = get_jwt()
    if not claims.get('is_admin') and str(n.cliente_id) != get_jwt_identity():
        return erro('Acesso negado', 403)
    return ok(n.to_dict())


@bp.post('')
@admin_required
def criar():
    body = request.get_json(force=True) or {}
    for campo in ('cliente_id', 'numero_nf'):
        if not body.get(campo):
            return erro(f'Campo obrigatório: {campo}')
    n = NotaFiscal(cliente_id=body['cliente_id'], numero_nf=body['numero_nf'],
                   data_emissao=_parse_date(body.get('data_emissao')), valor_nf=body.get('valor_nf', 0),
                   peso=body.get('peso'), volumes=body.get('volumes'),
                   origem=body.get('origem'), destino=body.get('destino'))
    db.session.add(n)
    db.session.commit()
    return ok(n.to_dict(), 'Nota fiscal criada', 201)


@bp.put('/<int:id>')
@admin_required
def atualizar(id):
    n = NotaFiscal.query.get(id)
    if not n:
        return erro('Nota fiscal não encontrada', 404)
    body = request.get_json(force=True) or {}
    for campo in ('numero_nf', 'valor_nf', 'peso', 'volumes', 'origem', 'destino', 'cliente_id'):
        if campo in body:
            setattr(n, campo, body[campo])
    if 'data_emissao' in body:
        n.data_emissao = _parse_date(body['data_emissao'])
    db.session.commit()
    return ok(n.to_dict(), 'Nota fiscal atualizada')


@bp.delete('/<int:id>')
@admin_required
def excluir(id):
    n = NotaFiscal.query.get(id)
    if not n:
        return erro('Nota fiscal não encontrada', 404)
    db.session.delete(n)
    db.session.commit()
    return ok(None, 'Nota fiscal excluída')
