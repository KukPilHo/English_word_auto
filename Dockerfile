# ==========================================
# Stage 1: Build the React (Vite) Frontend
# ==========================================
FROM node:18-alpine AS frontend-builder
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
COPY app.py word_processor.py ./
COPY DB ./DB
COPY new_json ./new_json
COPY static ./static
COPY templates ./templates

# Expose port 7860 (Hugging Face Spaces default port)
EXPOSE 7860

# Run Flask using python (binding dynamically to Hugging Face Spaces port)
CMD ["python", "app.py"]
