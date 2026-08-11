from datetime import datetime
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from extensions import db
from models import NotaFiscal
from helpers import ok, erro, admin_required

bp = Blueprint('notas', __name__, url_prefix='/api/notas-fiscais')


def _parse_date(v):
    return datetime.strptime(v, '%Y-%m-%d').date() if v else None


def _num(v, default=None):
    if v in (None, ''):
        return default
    return v


def _int(v):
    if v in (None, ''):
        return None
    return int(v)


@bp.post('/extrair')
@admin_required
def extrair_pdf():
    import re
    if 'arquivo' not in request.files:
        return erro('Envie o arquivo PDF da NF-e', 400)
    arquivo = request.files['arquivo']

    try:
        import pdfplumber
        with pdfplumber.open(arquivo) as pdf:
            texto_paginas = []
            celulas = []
            for page in pdf.pages:
                texto_paginas.append(page.extract_text() or '')
                for table in page.extract_tables():
                    for row in table:
                        for cell in row:
                            if cell:
                                celulas.append(cell)
            texto = '\n'.join(texto_paginas)
            texto_tabelas = '\n'.join(celulas)
    except Exception:
        return erro('Não foi possível ler esse PDF. Se for uma nota escaneada (imagem), preencha manualmente.', 400)

    if not texto.strip():
        return erro('O PDF não tem texto legível (provavelmente é uma imagem escaneada). Preencha manualmente.', 400)

    def buscar(txt, padrao):
        m = re.search(padrao, txt, re.IGNORECASE)
        return m.group(1).strip() if m else None

    def num_br(v):
        if not v:
            return None
        v = v.replace('.', '').replace(',', '.')
        try:
            return float(v)
        except ValueError:
            return None

    numero_nf = buscar(texto, r'N[ºO°]\s*:?\s*([\d\.]{3,})')
    valor_nf = num_br(buscar(texto, r'Valor Total\s*:\s*([\d\.,]+)') or buscar(texto_tabelas, r'VALOR TOTAL DA NOTA\s*\n\s*([\d\.,]+)'))
    peso = num_br(buscar(texto_tabelas, r'PESO BRUTO\s*\n\s*([\d\.,]+)'))
    volumes_raw = buscar(texto_tabelas, r'QUANTIDADE\s*\n\s*([\d\.,]+)')
    volumes = None
    if volumes_raw:
        try:
            volumes = int(float(volumes_raw.replace(',', '.')))
        except ValueError:
            volumes = None
    data_raw = buscar(texto, r'Emiss[ãa]o\s*:\s*(\d{2}/\d{2}/\d{4})') or buscar(texto_tabelas, r'DATA DA EMISS[AÃ]O\s*\n\s*(\d{2}/\d{2}/\d{4})')
    data_emissao = None
    if data_raw:
        d, m, a = data_raw.split('/')
        data_emissao = f'{a}-{m}-{d}'

    encontrou_algo = any([numero_nf, valor_nf, peso, volumes, data_emissao])
    return ok({
        'numero_nf': numero_nf,
        'valor_nf': valor_nf,
        'peso': peso,
        'volumes': volumes,
        'data_emissao': data_emissao,
    }, 'Dados extraídos, confira antes de salvar' if encontrou_algo else 'Não consegui reconhecer os campos automaticamente, preencha manualmente')


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
                   data_emissao=_parse_date(body.get('data_emissao')), valor_nf=_num(body.get('valor_nf'), 0),
                   peso=_num(body.get('peso')), volumes=_int(body.get('volumes')),
                   origem=body.get('origem') or None, destino=body.get('destino') or None)
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
    for campo in ('numero_nf', 'origem', 'destino', 'cliente_id'):
        if campo in body:
            setattr(n, campo, body[campo] or None)
    if 'valor_nf' in body:
        n.valor_nf = _num(body['valor_nf'], 0)
    if 'peso' in body:
        n.peso = _num(body['peso'])
    if 'volumes' in body:
        n.volumes = _int(body['volumes'])
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
