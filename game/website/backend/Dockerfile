FROM python:3.11-slim

WORKDIR /app

# Install system dependencies if any (none needed for basic SQLite)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Ensure DB is initialized (basic table creation in main.py)
# If you want to run init_db.py, uncomment the next line:
# RUN python init_db.py

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
