import json
import os
from urllib import error, request


def enabled():
    return all(os.environ.get(k) for k in (
        'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_BUCKET_NAME'
    ))


def _headers(content_type=None):
    key = os.environ['SUPABASE_SERVICE_ROLE_KEY']
    headers = {
        'Authorization': f'Bearer {key}',
        'apikey': key,
    }
    if content_type:
        headers['Content-Type'] = content_type
    return headers


def _base_url():
    return os.environ['SUPABASE_URL'].rstrip('/')


def upload(file_storage, key):
    if not enabled():
        return None
    data = file_storage.read()
    url = f"{_base_url()}/storage/v1/object/{os.environ['SUPABASE_BUCKET_NAME']}/{key}"
    req = request.Request(
        url,
        data=data,
        method='POST',
        headers={**_headers(file_storage.content_type or 'application/octet-stream'), 'x-upsert': 'true'},
    )
    try:
        with request.urlopen(req, timeout=60) as response:
            if response.status not in (200, 201):
                raise RuntimeError(f'Falha no upload para o Supabase: HTTP {response.status}')
    except error.HTTPError as exc:
        detail = exc.read().decode('utf-8', errors='replace')
        raise RuntimeError(f'Falha no upload para o Supabase: HTTP {exc.code} - {detail}') from exc
    return key


def presigned_url(key, expires=900):
    if not enabled() or not key:
        return None
    url = f"{_base_url()}/storage/v1/object/sign/{os.environ['SUPABASE_BUCKET_NAME']}/{key}"
    body = json.dumps({'expiresIn': expires}).encode('utf-8')
    req = request.Request(url, data=body, method='POST', headers=_headers('application/json'))
    try:
        with request.urlopen(req, timeout=30) as response:
            payload = json.loads(response.read().decode('utf-8'))
            signed = payload.get('signedURL')
            if not signed:
                return None
            if signed.startswith('http://') or signed.startswith('https://'):
                return signed
            return f"{_base_url()}/storage/v1{signed}"
    except error.HTTPError:
        return None


def delete(key):
    if not enabled() or not key:
        return
    url = f"{_base_url()}/storage/v1/object/{os.environ['SUPABASE_BUCKET_NAME']}/{key}"
    req = request.Request(url, method='DELETE', headers=_headers())
    try:
        request.urlopen(req, timeout=30).close()
    except error.HTTPError:
        pass


def get_bytes(key):
    if not enabled() or not key:
        return None
    url = f"{_base_url()}/storage/v1/object/{os.environ['SUPABASE_BUCKET_NAME']}/{key}"
    req = request.Request(url, method='GET', headers=_headers())
    try:
        with request.urlopen(req, timeout=60) as response:
            return response.read(), response.headers.get('Content-Type') or 'application/octet-stream'
    except error.HTTPError:
        return None
