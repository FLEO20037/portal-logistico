from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from extensions import db
from models import Transportadora
from helpers import ok, erro, admin_required

bp = Blueprint('transportadoras', __name__, url_prefix='/api/transportadoras')


@bp.get('')
@jwt_required()
def listar():
    q = request.args.get('q', '').strip()
    query = Transportadora.query
    if q:
        like = f'%{q}%'
        query = query.filter(db.or_(Transportadora.nome.ilike(like), Transportadora.cnpj.ilike(like)))
    return ok([t.to_dict() for t in query.order_by(Transportadora.nome).all()])


@bp.post('')
@admin_required
def criar():
    body = request.get_json(force=True) or {}
    if not body.get('nome') or not body.get('cnpj'):
        return erro('Nome e CNPJ são obrigatórios')
    if Transportadora.query.filter_by(cnpj=body['cnpj']).first():
        return erro('CNPJ já cadastrado')
    t = Transportadora(nome=body['nome'], cnpj=body['cnpj'], logo=body.get('logo'))
    db.session.add(t)
    db.session.commit()
    return ok(t.to_dict(), 'Transportadora criada', 201)


@bp.put('/<int:id>')
@admin_required
def atualizar(id):
    t = Transportadora.query.get(id)
    if not t:
        return erro('Transportadora não encontrada', 404)
    body = request.get_json(force=True) or {}
    for campo in ('nome', 'cnpj', 'logo'):
        if campo in body:
            setattr(t, campo, body[campo])
    db.session.commit()
    return ok(t.to_dict(), 'Transportadora atualizada')


@bp.delete('/<int:id>')
@admin_required
def excluir(id):
    t = Transportadora.query.get(id)
    if not t:
        return erro('Transportadora não encontrada', 404)
    db.session.delete(t)
    db.session.commit()
    return ok(None, 'Transportadora excluída')
