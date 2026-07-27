FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV REQ_RADAR_HOST=0.0.0.0
ENV REQ_RADAR_PORT=8000
EXPOSE 8000
CMD ["python", "app.py"]
