from datetime import datetime, date
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from extensions import db
from models import Boleto, Cte, NotaFiscal
from helpers import ok, erro, admin_required, allowed_file, save_upload

bp = Blueprint('boletos', __name__, url_prefix='/api/boletos')


def _parse_date(v):
    return datetime.strptime(v, '%Y-%m-%d').date() if v else None


def _pode_ver(boleto):
    claims = get_jwt()
    if claims.get('is_admin'):
        return True
    return str(boleto.cte.nota_fiscal.cliente_id) == get_jwt_identity()


@bp.get('')
@jwt_required()
def listar():
    cte_id = request.args.get('cte_id')
    status = request.args.get('status')
    query = Boleto.query
    if cte_id:
        query = query.filter_by(cte_id=cte_id)
    if status:
        query = query.filter_by(status=status)
    claims = get_jwt()
    if not claims.get('is_admin'):
        query = query.join(Cte).join(NotaFiscal).filter(NotaFiscal.cliente_id == get_jwt_identity())
    boletos = query.order_by(Boleto.vencimento).all()
    hoje = date.today()
    for b in boletos:
        if b.status == 'PENDENTE' and b.vencimento and b.vencimento < hoje:
            b.status = 'VENCIDO'
    db.session.commit()
    return ok([b.to_dict() for b in boletos])


@bp.post('')
@admin_required
def criar():
    body = request.form if request.form else (request.get_json(silent=True) or {})
    for campo in ('cte_id', 'numero'):
        if not body.get(campo):
            return erro(f'Campo obrigatório: {campo}')
    b = Boleto(cte_id=body['cte_id'], numero=body['numero'], valor=body.get('valor', 0),
               vencimento=_parse_date(body.get('vencimento')), status=body.get('status', 'PENDENTE'))
    if 'pdf' in request.files and allowed_file(request.files['pdf'].filename, {'pdf'}):
        b.pdf = save_upload(request.files['pdf'], 'boletos')
    db.session.add(b)
    db.session.commit()
    return ok(b.to_dict(), 'Boleto criado', 201)


@bp.put('/<int:id>')
@admin_required
def atualizar(id):
    b = Boleto.query.get(id)
    if not b:
        return erro('Boleto não encontrado', 404)
    body = request.form if request.form else (request.get_json(silent=True) or {})
    for campo in ('numero', 'valor', 'status'):
        if campo in body:
            setattr(b, campo, body[campo])
    if 'vencimento' in body:
        b.vencimento = _parse_date(body['vencimento'])
    if 'pdf' in request.files and allowed_file(request.files['pdf'].filename, {'pdf'}):
        b.pdf = save_upload(request.files['pdf'], 'boletos')
    db.session.commit()
    return ok(b.to_dict(), 'Boleto atualizado')


@bp.delete('/<int:id>')
@admin_required
def excluir(id):
    b = Boleto.query.get(id)
    if not b:
        return erro('Boleto não encontrado', 404)
    db.session.delete(b)
    db.session.commit()
    return ok(None, 'Boleto excluído')
