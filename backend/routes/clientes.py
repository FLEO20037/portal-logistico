from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from extensions import db
from models import Cliente
from helpers import ok, erro, admin_required

bp = Blueprint('clientes', __name__, url_prefix='/api/clientes')


@bp.get('')
@admin_required
def listar():
    q = request.args.get('q', '').strip()
    query = Cliente.query
    if q:
        like = f'%{q}%'
        query = query.filter(db.or_(Cliente.nome.ilike(like), Cliente.cnpj.ilike(like), Cliente.email.ilike(like)))
    clientes = query.order_by(Cliente.nome).all()
    return ok([c.to_dict() for c in clientes])


@bp.get('/<int:id>')
@jwt_required()
def obter(id):
    c = Cliente.query.get(id)
    if not c:
        return erro('Cliente não encontrado', 404)
    return ok(c.to_dict())


@bp.post('')
@admin_required
def criar():
    body = request.get_json(force=True) or {}
    for campo in ('nome', 'cnpj', 'email', 'senha'):
        if not body.get(campo):
            return erro(f'Campo obrigatório: {campo}')
    if Cliente.query.filter_by(cnpj=body['cnpj']).first():
        return erro('CNPJ já cadastrado')
    if Cliente.query.filter_by(email=body['email']).first():
        return erro('Email já cadastrado')
    c = Cliente(nome=body['nome'], cnpj=body['cnpj'], email=body['email'],
                ativo=body.get('ativo', True), is_admin=body.get('is_admin', False))
    c.set_senha(body['senha'])
    db.session.add(c)
    db.session.commit()
    return ok(c.to_dict(), 'Cliente criado', 201)


@bp.put('/<int:id>')
@admin_required
def atualizar(id):
    c = Cliente.query.get(id)
    if not c:
        return erro('Cliente não encontrado', 404)
    body = request.get_json(force=True) or {}
    for campo in ('nome', 'cnpj', 'email'):
        if campo in body:
            setattr(c, campo, body[campo])
    if 'ativo' in body:
        c.ativo = body['ativo']
    if 'is_admin' in body:
        c.is_admin = body['is_admin']
    if body.get('senha'):
        c.set_senha(body['senha'])
    db.session.commit()
    return ok(c.to_dict(), 'Cliente atualizado')


@bp.delete('/<int:id>')
@admin_required
def excluir(id):
    c = Cliente.query.get(id)
    if not c:
        return erro('Cliente não encontrado', 404)
    db.session.delete(c)
    db.session.commit()
    return ok(None, 'Cliente excluído')
