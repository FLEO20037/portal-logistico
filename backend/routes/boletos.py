from datetime import datetime, date
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from extensions import db
from models import Boleto, Cte, NotaFiscal
from helpers import ok, erro, admin_required, allowed_file, save_upload

bp = Blueprint('boletos', __name__, url_prefix='/api/boletos')


def _parse_date(v):
    return datetime.strptime(v, '%Y-%m-%d').date() if v else None


def _num(v, default=None):
    return default if v in (None, '') else v


def _pode_ver(boleto):
    claims = get_jwt()
    if claims.get('is_admin'):
        return True
    cliente_id = get_jwt_identity()
    return any(str(c.nota_fiscal.cliente_id) == cliente_id for c in boleto.ctes)


@bp.get('')
@jwt_required()
def listar():
    cte_id = request.args.get('cte_id')
    status = request.args.get('status')
    query = Boleto.query
    if cte_id:
        query = query.filter(Boleto.ctes.any(Cte.id == cte_id))
    if status:
        query = query.filter_by(status=status)
    claims = get_jwt()
    if not claims.get('is_admin'):
        query = query.join(Boleto.ctes).join(NotaFiscal).filter(NotaFiscal.cliente_id == get_jwt_identity()).distinct()
    boletos = query.order_by(Boleto.vencimento).all()
    hoje = date.today()
    for b in boletos:
        if b.status == 'PENDENTE' and b.vencimento and b.vencimento < hoje:
            b.status = 'VENCIDO'
    db.session.commit()
    return ok([b.to_dict() for b in boletos])

@bp.patch('/<int:id>/pagar')
@jwt_required()
def marcar_pago(id):
    b = Boleto.query.get(id)
    if not b:
        return erro('Boleto não encontrado', 404)
    if not _pode_ver(b):
        return erro('Acesso negado', 403)
    b.status = 'PAGO'
    db.session.commit()
    return ok(b.to_dict(), 'Boleto marcado como pago')
@bp.post('')
@admin_required
def criar():
    if request.form:
        body = request.form
        cte_ids = request.form.getlist('cte_ids')
    else:
        body = request.get_json(silent=True) or {}
        cte_ids = body.get('cte_ids') or []
    if not body.get('numero'):
        return erro('Campo obrigatório: numero')
    if not cte_ids:
        return erro('Selecione ao menos um CT-e')
    b = Boleto(numero=body['numero'], valor=_num(body.get('valor'), 0),
               vencimento=_parse_date(body.get('vencimento')), status=body.get('status', 'PENDENTE'))
    b.ctes = Cte.query.filter(Cte.id.in_(cte_ids)).all()
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
    if request.form:
        body = request.form
        cte_ids = request.form.getlist('cte_ids')
    else:
        body = request.get_json(silent=True) or {}
        cte_ids = body.get('cte_ids')
    for campo in ('numero', 'status'):
        if campo in body:
            setattr(b, campo, body[campo])
    if 'valor' in body:
        b.valor = _num(body['valor'], 0)
    if 'vencimento' in body:
        b.vencimento = _parse_date(body['vencimento'])
    if cte_ids:
        b.ctes = Cte.query.filter(Cte.id.in_(cte_ids)).all()
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
