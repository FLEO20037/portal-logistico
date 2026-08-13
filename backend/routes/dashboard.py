from flask import Blueprint
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from extensions import db
from models import NotaFiscal, Cte, Boleto, NotaFiscal as NF
from helpers import ok

bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')


@bp.get('')
@jwt_required()
def resumo():
    claims = get_jwt()
    is_admin = claims.get('is_admin')
    nf_query = NotaFiscal.query if is_admin else NotaFiscal.query.filter_by(cliente_id=get_jwt_identity())
    nf_ids = [n.id for n in nf_query.all()]
    cte_query = Cte.query if is_admin else Cte.query.filter(Cte.nf_id.in_(nf_ids))
    cte_ids = [c.id for c in cte_query.all()]
    bol_query = Boleto.query if is_admin else Boleto.query.filter(Boleto.ctes.any(Cte.id.in_(cte_ids)))
    boletos = bol_query.distinct().all()
    pendentes = [b for b in boletos if b.status == 'PENDENTE']
    pagos = [b for b in boletos if b.status == 'PAGO']
    vencidos = [b for b in boletos if b.status == 'VENCIDO']
    valor_aberto = sum(float(b.valor or 0) for b in boletos if b.status != 'PAGO')
    ultimos_ctes = cte_query.order_by(Cte.id.desc()).limit(5).all()
    return ok({
        'qtd_nfs': len(nf_ids),
        'qtd_ctes': len(cte_ids),
        'qtd_boletos_pendentes': len(pendentes),
        'qtd_boletos_pagos': len(pagos),
        'qtd_boletos_vencidos': len(vencidos),
        'valor_total_aberto': valor_aberto,
        'ultimos_ctes': [c.to_dict() for c in ultimos_ctes],
    })
