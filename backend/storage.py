import os
import requests

SUPABASE_URL = os.environ.get('SUPABASE_URL', '').rstrip('/')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
BUCKET = os.environ.get('SUPABASE_BUCKET_NAME', 'portal-logistico')


def enabled():
    return bool(SUPABASE_URL and SUPABASE_KEY)


def upload(caminho, conteudo, content_type='application/octet-stream'):
    if not enabled():
        return False
    url = f'{SUPABASE_URL}/storage/v1/object/{BUCKET}/{caminho}'
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': content_type,
        'x-upsert': 'true',
    }
    r = requests.post(url, headers=headers, data=conteudo, timeout=30)
    return r.status_code in (200, 201)


def baixar(caminho):
    if not enabled():
        return None
    url = f'{SUPABASE_URL}/storage/v1/object/{BUCKET}/{caminho}'
    headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}
    r = requests.get(url, headers=headers, timeout=30)
    if r.status_code == 200:
        return r.content
    return None
