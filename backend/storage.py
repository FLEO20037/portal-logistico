import os
from io import BytesIO

import boto3
from botocore.client import Config as BotoConfig


def enabled():
    return all(os.environ.get(k) for k in (
        'S3_ENDPOINT_URL', 'S3_BUCKET_NAME', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'
    ))


def _client():
    if not enabled():
        return None
    return boto3.client(
        's3',
        endpoint_url=os.environ['S3_ENDPOINT_URL'],
        aws_access_key_id=os.environ['S3_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['S3_SECRET_ACCESS_KEY'],
        region_name=os.environ.get('S3_REGION', 'auto'),
        config=BotoConfig(signature_version='s3v4'),
    )


def upload(file_storage, key):
    client = _client()
    if not client:
        return None
    client.upload_fileobj(
        file_storage,
        os.environ['S3_BUCKET_NAME'],
        key,
        ExtraArgs={'ContentType': file_storage.content_type or 'application/octet-stream'},
    )
    return key


def presigned_url(key, expires=900):
    client = _client()
    if not client or not key:
        return None
    return client.generate_presigned_url(
        'get_object',
        Params={'Bucket': os.environ['S3_BUCKET_NAME'], 'Key': key},
        ExpiresIn=expires,
    )


def delete(key):
    client = _client()
    if client and key:
        client.delete_object(Bucket=os.environ['S3_BUCKET_NAME'], Key=key)


def get_bytes(key):
    client = _client()
    if not client or not key:
        return None
    obj = client.get_object(Bucket=os.environ['S3_BUCKET_NAME'], Key=key)
    return obj['Body'].read(), obj.get('ContentType') or 'application/octet-stream'
