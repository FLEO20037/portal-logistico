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
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': content_type,
        'x-upsert': 'true',
    }

    r = requests.post(
        url,
        headers=headers,
        data=conteudo,
        timeout=30
    )

    return r.status_code in (200, 201)


def baixar(caminho):
    if not enabled():
        return None

    url = f'{SUPABASE_URL}/storage/v1/object/{BUCKET}/{caminho}'

    headers = {
        'Authorization': f'Bearer {SUPABASE_KEY}'
    }

    r = requests.get(
        url,
        headers=headers,
        timeout=30
    )

    if r.status_code == 200:
        return r.content

    return None


def presigned_url(caminho, expires_in=3600):
    """
    Gera uma URL assinada temporária para um arquivo
    armazenado no Supabase Storage.
    """

    if not enabled():
        return None

    caminho = caminho.lstrip('/')

    url = (
        f'{SUPABASE_URL}/storage/v1/object/sign/'
        f'{BUCKET}/{caminho}'
    )

    headers = {
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }

    payload = {
        'expiresIn': expires_in
    }

    try:
        r = requests.post(
            url,
            headers=headers,
            json=payload,
            timeout=30
        )

        if r.status_code not in (200, 201):
            return None

        data = r.json()

        signed_url = data.get('signedURL')

        if not signed_url:
            return None

        if signed_url.startswith('http'):
            return signed_url

        return f'{SUPABASE_URL}/storage/v1{signed_url}'

    except Exception:
        return None
