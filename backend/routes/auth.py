from flask import Blueprint, request
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from extensions import db
from models import Cliente
from helpers import ok, erro

bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@bp.post('/login')
def login():
    body = request.get_json(force=True) or {}
    email = body.get('email', '').strip().lower()
    senha = body.get('senha', '')
    user = Cliente.query.filter(db.func.lower(Cliente.email) == email).first()
    if not user or not user.check_senha(senha):
        return erro('Credenciais inválidas', 401)
    if not user.ativo:
        return erro('Usuário inativo', 403)
    token = create_access_token(identity=str(user.id), additional_claims={'is_admin': user.is_admin})
    return ok({'token': token, 'usuario': user.to_dict()}, 'Login realizado')


@bp.get('/me')
@jwt_required()
def me():
    user = Cliente.query.get(get_jwt_identity())
    if not user:
        return erro('Usuário não encontrado', 404)
    return ok(user.to_dict())
