FROM node:22-alpine

WORKDIR /app

# Reuse the already-installed Node image while adding the small Python runtime.
RUN apk add --no-cache ca-certificates python3 py3-pip

RUN npm install -g @liara/cli

# Install dependencies from the canonical project metadata before copying the
# engine source, so normal code edits reuse this layer.
COPY engine/pyproject.toml ./engine/pyproject.toml
RUN python3 -c "import subprocess,sys,tomllib; deps=tomllib.load(open('engine/pyproject.toml','rb'))['project']['dependencies']; subprocess.run([sys.executable,'-m','pip','install','--no-cache-dir','--break-system-packages',*deps],check=True)"

COPY engine ./engine

EXPOSE 8000

ENV PYTHONPATH=/app

CMD ["python3", "-m", "uvicorn", "engine.main:app", "--host", "0.0.0.0", "--port", "8000"]

