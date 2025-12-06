# Use Python 3.11 slim image
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy backend requirements and install Python dependencies
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy the entire application
COPY . /app/

# Copy startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Create temp directory with proper permissions
RUN mkdir -p /tmp/moodflo && chmod 777 /tmp/moodflo

# Set working directory to backend
WORKDIR /app/backend

# Expose port
EXPOSE 8000

# Start command
CMD ["/bin/sh", "/app/start.sh"]
