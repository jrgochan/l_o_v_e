"""Listener API - Health Check Endpoints.

Provides liveness and readiness probes for Kubernetes and monitoring systems.

This module contains health check endpoints used by:
- Kubernetes liveness/readiness probes
- Load balancers for health checks
- Monitoring systems (Prometheus, Grafana)
- Operations team for manual health verification

Endpoints:
    GET /health - Liveness probe (is service running?)
    GET /health/ready - Readiness probe (ready to handle traffic?)

Sample Usage:
    Check liveness:
    >>> curl http://localhost:8002/health
    {"status": "healthy", "service": "listener", ...}

    Check readiness:
    >>> curl http://localhost:8002/health/ready
    {"ready": true, "checks": {"ollama": true, ...}}

See Also:
    - Monitoring: docs/modules/listener/managers/03-monitoring-operations.md
    - Kubernetes probes: docs/modules/listener/senior-developers/01-deep-dive-architecture.md
"""
from datetime import datetime
from typing import Dict

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check() -> Dict[str, str]:
    """Liveness probe - checks if the service is running.

    This endpoint is used by Kubernetes liveness probes to determine if the
    container should be restarted. It returns immediately without checking
    dependencies—if this returns 200, the process is alive.

    Returns:
        dict: Health status with service metadata:
            - status: "healthy" (always, if service is running)
            - service: "listener"
            - version: Current version string
            - timestamp: Current UTC time (ISO format)

    Status Codes:
        200: Service is running (healthy)
        (No other codes - if service is down, no response)

    Sample Usage:
        CLI check:
        $ curl http://localhost:8002/health
        {
          "status": "healthy",
          "service": "listener",
          "version": "0.1.0",
          "timestamp": "2026-01-02T20:00:00.123456"
        }

        In Python:
        >>> import httpx
        >>> async with httpx.AsyncClient() as client:
        >>>     response = await client.get("http://localhost:8002/health")
        >>>     assert response.status_code == 200
        >>>     assert response.json()["status"] == "healthy"

    Performance:
        - Latency: < 10ms (no processing, just returns static data)
        - No dependencies checked (fast fail if service is down)

    Kubernetes Configuration:
        livenessProbe:
          httpGet:
            path: /health
            port: 8002
          initialDelaySeconds: 10
          periodSeconds: 30
          timeoutSeconds: 5
          failureThreshold: 3

    Notes:
        - Does NOT check Ollama, Redis, or Observer (use /health/ready for that)
        - Always returns 200 if service is running
        - Used to detect if process has crashed
        - Complementary to readiness probe

    See Also:
        - Readiness probe: /health/ready (checks dependencies)
        - Monitoring: docs/modules/listener/managers/03-monitoring-operations.md
        - API Reference: docs/modules/listener/reference/api-reference.md
    """
    return {
        "status": "healthy",
        "service": "listener",
        "version": "0.1.0",
        "timestamp": datetime.utcnow().isoformat(),
    }
