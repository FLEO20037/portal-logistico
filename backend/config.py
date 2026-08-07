import os

_db_url = os.environ.get('DATABASE_URL', 'sqlite:///portal.db')
if _db_url.startswith('postgres://'):
    _db_url = _db_url.replace('postgres://', 'postgresql://', 1)

class Config:
    SQLALCHEMY_DATABASE_URI = _db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'dev-secret-troque-em-producao')
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', os.path.join(os.path.dirname(__file__), 'uploads'))
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024
    ALLOWED_EXT = {'pdf', 'xml'}
