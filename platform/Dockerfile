# Image Kraxia — passerelle FastAPI multi-tenant (compatible Dokploy/Coolify)
FROM python:3.13-slim-bookworm

# Port exposé (lu via $PORT — Dokploy/Coolify injectent cette variable)
ENV PORT=8080
EXPOSE 8080

WORKDIR /app

# Miroirs Debian/Python (surchargeables via build-args pour utilisateurs hors Chine)
ARG PIP_INDEX_URL=https://pypi.org/simple
ARG APT_DEBIAN_MIRROR=http://deb.debian.org/debian
ARG APT_SECURITY_MIRROR=http://deb.debian.org/debian-security

RUN sed -i \
        -e "s|http://deb.debian.org/debian|${APT_DEBIAN_MIRROR}|g" \
        -e "s|http://deb.debian.org/debian-security|${APT_SECURITY_MIRROR}|g" \
        /etc/apt/sources.list.d/debian.sources \
    || true \
    && apt-get -o Acquire::Retries=5 update \
    && apt-get install -y --no-install-recommends git openssh-client curl \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir -i ${PIP_INDEX_URL} uv

# Manifests Python
COPY pyproject.toml ./

# Installation des dépendances (cache Docker préservé)
RUN uv pip install --system --no-cache -r pyproject.toml

# Code applicatif
COPY app/ app/
COPY alembic/ alembic/
COPY alembic.ini ./
COPY deploy_copy/ deploy_copy/

# Healthcheck pour Dokploy/Coolify
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS http://127.0.0.1:${PORT}/api/health || exit 1

# Démarrage : migrations Alembic → FastAPI sur $PORT
CMD ["sh", "-c", "alembic upgrade head 2>&1 || true; uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --proxy-headers"]
