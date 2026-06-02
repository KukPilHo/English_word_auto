# ==========================================
# Stage 1: Build the React (Vite) Frontend
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Copy frontend dependency manifests
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci

# Copy the rest of the frontend source
COPY frontend/ ./

# Build frontend to 'dist' folder
RUN npm run build

# ==========================================
# Stage 2: Python / Flask Server Environment
# ==========================================
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy python dependencies manifests
COPY requirements.txt ./

# Install python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy built frontend assets from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Copy application files and folders
COPY app.py word_processor.py summit_ingest.py summit_categories.json ./
COPY DB ./DB
COPY new_json ./new_json
COPY summit_json ./summit_json
COPY static ./static
COPY templates ./templates
# 주의: summit_pdf.py / summit_extract.py / summit_ingest_api.py 와 .env 는
# 추출·검토(로컬 INGEST_MODE) 전용이므로 운영 이미지에 포함하지 않는다.

# Set environment variable for port
ENV PORT=7860

# Expose port 7860 (Hugging Face Spaces default port)
EXPOSE 7860

# Run Flask using python (binding dynamically to Hugging Face Spaces port)
CMD ["python", "app.py"]
