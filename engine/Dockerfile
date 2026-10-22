FROM python:3.13-slim

WORKDIR /app

# Install curl, Node.js, and npm to have Liara CLI available in the engine
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Install official Liara CLI globally
RUN npm install -g @liara/cli

# Copy engine requirements and install
COPY engine/pyproject.toml ./engine/
RUN pip install --no-cache-dir fastapi uvicorn httpx pydantic pydantic-settings python-dotenv

# Copy engine source code
COPY engine ./engine

EXPOSE 8000

ENV PYTHONPATH=/app

CMD ["python", "-m", "uvicorn", "engine.main:app", "--host", "0.0.0.0", "--port", "8000"]

