# Stage: Lightweight Python runtime for MiniStore Backend
FROM python:3.11-slim

# Avoid generating .pyc files and enable instant logs
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependencies first to leverage Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY app.py .

# Expose backend port
EXPOSE 5000

# Run Flask application on 0.0.0.0
CMD ["python", "app.py"]
