# Build context is the repository root (see docker-compose.yml) because the
# seed datasets live in data/mock, outside this folder.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /srv/api

# Dependencies first so application edits do not invalidate the wheel layer.
COPY apps/api/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY apps/api/pyproject.toml ./
COPY apps/api/app ./app

# The seed datasets are baked into the image so the API can bootstrap an empty
# database without a bind mount. ROOTLINE_SEED_DATA_DIR can point elsewhere.
COPY data/mock /srv/data/mock
ENV ROOTLINE_SEED_DATA_DIR=/srv/data/mock

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=5 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health', timeout=3).status == 200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
