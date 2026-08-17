import os
from functools import wraps
from flask import jsonify, current_app
from flask_jwt_extended import get_jwt, verify_jwt_in_request


def ok(data=None, message='OK', status=200):
    return jsonify({'sucesso': True, 'mensagem': message, 'dados': data}), status


def erro(message='Erro', status=400):
    return jsonify({'sucesso': False, 'mensagem': message, 'dados': None}), status


def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        if not claims.get('is_admin'):
            return erro('Acesso restrito ao administrador', 403)
        return fn(*args, **kwargs)
    return wrapper


def allowed_file(filename, exts):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in exts


def save_upload(file_storage, subfolder):
    from werkzeug.utils import secure_filename
    import storage
    filename = secure_filename(file_storage.filename)
    rel_path = f'{subfolder}/{filename}'
    conteudo = file_storage.read()
    if storage.enabled():
        storage.upload(rel_path, conteudo, file_storage.mimetype or 'application/octet-stream')
    else:
        folder = os.path.join(current_app.config['UPLOAD_FOLDER'], subfolder)
        os.makedirs(folder, exist_ok=True)
        with open(os.path.join(folder, filename), 'wb') as f:
            f.write(conteudo)
    return f'uploads/{rel_path}'
