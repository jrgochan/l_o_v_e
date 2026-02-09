# Versor Module - Deployment

## Overview

The Versor is designed as a **stateless microservice**, making it ideal for containerized deployment and horizontal scaling. This document covers production deployment strategies.

## Deployment Architecture

```
┌─────────────────────────────────────────────┐
│         Load Balancer (ALB/NGINX)           │
└──────────────────┬──────────────────────────┘
                   │
      ┌────────────┴────────────┐
      ↓                         ↓
┌──────────┐              ┌──────────┐
│ Versor 1 │              │ Versor 2 │  (Stateless instances)
└────┬─────┘              └────┬─────┘
     │                         │
     └────────────┬────────────┘
                  ↓
           [No Database]
        (Stateless - scales freely)
```

## Containerization

### Dockerfile

```dockerfile
# Multi-stage build for minimal image size

FROM python:3.11-slim AS builder

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Runtime stage
FROM python:3.11-slim

WORKDIR /app

# Copy installed packages
COPY --from=builder /root/.local /root/.local

# Copy application code
COPY ./app ./app

# Set path
ENV PATH=/root/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:8001/health || exit 1

# Run
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
```

### Build and Push

```bash
# Build
docker build -t versor:1.0.0 .

# Tag for registry
docker tag versor:1.0.0 your-registry/versor:1.0.0

# Push
docker push your-registry/versor:1.0.0
```

## Cloud Deployment

### AWS Lambda (Serverless)

```python
# app/lambda_handler.py

from mangum import Mangum
from app.main import app

handler = Mangum(app)
```

**Deploy**:
```bash
# Package
pip install -t package/ -r requirements.txt
cp -r app/ package/
cd package && zip -r ../versor-lambda.zip . && cd ..

# Upload to Lambda
aws lambda create-function \
  --function-name versor-engine \
  --runtime python3.11 \
  --handler lambda_handler.handler \
  --zip-file fileb://versor-lambda.zip \
  --role arn:aws:iam::account:role/lambda-role \
  --timeout 10 \
  --memory-size 512
```

### AWS ECS/Fargate

```yaml
# task-definition.json
{
  "family": "versor-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "versor",
      "image": "your-ecr/versor:latest",
      "portMappings": [
        {
          "containerPort": 8001,
          "protocol": "tcp"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/versor",
          "awslogs-region": "us-east-1"
        }
      }
    }
  ]
}
```

### Google Cloud Run

```bash
gcloud run deploy versor \
  --image gcr.io/your-project/versor:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10
```

## Kubernetes Deployment

### Deployment YAML

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: versor
spec:
  replicas: 3
  selector:
    matchLabels:
      app: versor
  template:
    metadata:
      labels:
        app: versor
    spec:
      containers:
      - name: versor
        image: your-registry/versor:1.0.0
        ports:
        - containerPort: 8001
        resources:
          requests:
            cpu: 250m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        env:
        - name: FLOODING_THRESHOLD
          value: "2.0"
        - name: LOG_LEVEL
          value: "INFO"
        livenessProbe:
          httpGet:
            path: /health
            port: 8001
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 8001
          initialDelaySeconds: 5
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: versor-service
spec:
  selector:
    app: versor
  ports:
  - port: 8001
    targetPort: 8001
  type: LoadBalancer
```

### Deploy

```bash
kubectl apply -f k8s/deployment.yaml

# Check status
kubectl get pods -l app=versor

# View logs
kubectl logs -f deployment/versor
```

## Monitoring

### Prometheus Metrics

```python
from prometheus_client import Counter, Histogram

calculation_requests = Counter('versor_calculations_total', 'Total calculations')
calculation_duration = Histogram('versor_calculation_seconds', 'Calculation duration')

@router.post("/calculate")
async def calculate_state(request: StateRequest):
    calculation_requests.inc()

    with calculation_duration.time():
        result = engine.process_state(...)

    return result
```

### Health Endpoint

```python
import time

start_time = time.time()

@router.get("/health")
async def health():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "uptime_seconds": int(time.time() - start_time),
        "dependencies": {
            "numpy": np.__version__,
            "scipy": scipy.__version__
        }
    }
```

## Next Steps

Now that you understand deployment:
- **11-testing-strategy.md** - Comprehensive testing
- **12-performance-optimization.md** - Sub-50ms optimization
- **13-edge-cases.md** - Handle singularities and edge cases
