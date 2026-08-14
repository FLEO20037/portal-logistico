import bcrypt
from datetime import datetime
from extensions import db


class Cliente(db.Model):
    __tablename__ = 'clientes'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(150), nullable=False)
    cnpj = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    senha_hash = db.Column(db.String(200), nullable=False)
    ativo = db.Column(db.Boolean, default=True)
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    notas_fiscais = db.relationship('NotaFiscal', backref='cliente', cascade='all, delete-orphan')

    def set_senha(self, senha):
        self.senha_hash = bcrypt.hashpw(senha.encode(), bcrypt.gensalt()).decode()

    def check_senha(self, senha):
        return bcrypt.checkpw(senha.encode(), self.senha_hash.encode())

    def to_dict(self):
        return {'id': self.id, 'nome': self.nome, 'cnpj': self.cnpj, 'email': self.email,
                'ativo': self.ativo, 'is_admin': self.is_admin,
                'created_at': self.created_at.isoformat() if self.created_at else None}


class Transportadora(db.Model):
    __tablename__ = 'transportadoras'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(150), nullable=False)
    cnpj = db.Column(db.String(20), unique=True, nullable=False)
    logo = db.Column(db.String(255))
    ctes = db.relationship('Cte', backref='transportadora', cascade='all, delete-orphan')

    def to_dict(self):
        return {'id': self.id, 'nome': self.nome, 'cnpj': self.cnpj, 'logo': self.logo}


class NotaFiscal(db.Model):
    __tablename__ = 'notas_fiscais'
    id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id'), nullable=False)
    numero_nf = db.Column(db.String(50), nullable=False)
    data_emissao = db.Column(db.Date)
    valor_nf = db.Column(db.Numeric(12, 2), default=0)
    peso = db.Column(db.Numeric(10, 2))
    volumes = db.Column(db.Integer)
    origem = db.Column(db.String(100))
    destino = db.Column(db.String(100))
    ctes = db.relationship('Cte', backref='nota_fiscal', cascade='all, delete-orphan')

    def to_dict(self):
        return {'id': self.id, 'cliente_id': self.cliente_id, 'numero_nf': self.numero_nf,
                'data_emissao': self.data_emissao.isoformat() if self.data_emissao else None,
                'valor_nf': float(self.valor_nf or 0), 'peso': float(self.peso or 0),
                'volumes': self.volumes, 'origem': self.origem, 'destino': self.destino,
                'qtd_ctes': len(self.ctes),
                'transportadoras': sorted({c.transportadora.nome for c in self.ctes if c.transportadora})}


class Cte(db.Model):
    __tablename__ = 'ctes'
    id = db.Column(db.Integer, primary_key=True)
    nf_id = db.Column(db.Integer, db.ForeignKey('notas_fiscais.id'), nullable=False)
    transportadora_id = db.Column(db.Integer, db.ForeignKey('transportadoras.id'), nullable=False)
    numero_cte = db.Column(db.String(50), nullable=False)
    valor_frete = db.Column(db.Numeric(12, 2), default=0)
    data_emissao = db.Column(db.Date)
    pdf = db.Column(db.String(255))
    xml = db.Column(db.String(255))

    def to_dict(self):
        return {'id': self.id, 'nf_id': self.nf_id, 'transportadora_id': self.transportadora_id,
                'transportadora': self.transportadora.nome if self.transportadora else None,
                'numero_cte': self.numero_cte, 'valor_frete': float(self.valor_frete or 0),
                'data_emissao': self.data_emissao.isoformat() if self.data_emissao else None,
                'pdf': self.pdf, 'xml': self.xml}


boleto_ctes = db.Table('boleto_ctes',
    db.Column('boleto_id', db.Integer, db.ForeignKey('boletos.id'), primary_key=True),
    db.Column('cte_id', db.Integer, db.ForeignKey('ctes.id'), primary_key=True))


class Boleto(db.Model):
    __tablename__ = 'boletos'
    id = db.Column(db.Integer, primary_key=True)
    numero = db.Column(db.String(50), nullable=False)
    valor = db.Column(db.Numeric(12, 2), default=0)
    vencimento = db.Column(db.Date)
    status = db.Column(db.String(20), default='PENDENTE')
    pdf = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    ctes = db.relationship('Cte', secondary=boleto_ctes, backref=db.backref('boletos', lazy='dynamic'))

    def to_dict(self):
        return {'id': self.id, 'numero': self.numero, 'valor': float(self.valor or 0),
                'vencimento': self.vencimento.isoformat() if self.vencimento else None,
                'status': self.status, 'pdf': self.pdf,
                'cte_ids': [c.id for c in self.ctes],
                'ctes_numeros': [c.numero_cte for c in self.ctes],
                'transportadora': self.ctes[0].transportadora.nome if self.ctes and self.ctes[0].transportadora else None,
                'created_at': self.created_at.isoformat() if self.created_at else None}
