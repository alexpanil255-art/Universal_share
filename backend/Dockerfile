FROM python:3.11-slim

WORKDIR /app

# System deps kept minimal — no build-essential needed for our pure-Python stack.
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

# Uploads live outside /app so a persistent volume can be mounted here.
ENV UPLOAD_DIR=/var/data/uploads
RUN mkdir -p /var/data/uploads

EXPOSE 8001

# Render / Fly / Railway all inject $PORT; default to 8001 for local docker runs.
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8001}"]
