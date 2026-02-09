# Monitoring & Operations - Versor Module

This guide covers day-to-day operations, monitoring, and maintaining the Versor module.

---

## Daily Operations

### Health Check Routine

**Every morning:**

```bash
# Check service is up
curl http://versor:8001/health

# Expected
{"status": "healthy", "version": "1.0.0"}
```

**Dashboard check:**

- Request rate: Normal range
- Latency: P99 < 50ms
- Error rate: < 0.1%
- CPU: < 50%

**No action needed if all green** ✅

---

## Key Metrics

### Service Level Indicators (SLIs)

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| **Availability** | > 99.9% | < 99.5% | < 99% |
| **P99 Latency** | < 50ms | > 75ms | > 100ms |
| **Error Rate** | < 0.1% | > 0.5% | > 1% |
| **Request Rate** | 10-100/s | > 200/s | > 500/s |

### Dashboards

**Primary metrics (Grafana):**

- Request rate (req/s)
- Latency percentiles (P50, P95, P99)
- Error rate (%)
- Active instances
- CPU/Memory per instance

**Alert rules:**

```yaml
alerts:
  - name: HighLatency
    condition: p99_latency > 100ms for 5 minutes
    severity: warning

  - name: HighErrorRate
    condition: error_rate > 1% for 2 minutes
    severity: critical

  - name: AllInstancesDown
    condition: healthy_instances == 0
    severity: critical
    action: page_oncall
```

---

## Monitoring Setup

### Prometheus Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'versor'
    static_configs:
      - targets: ['versor:8001']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### Grafana Dashboard

**Panels:**

1. Request rate (time series)
2. Latency percentiles (graph)
3. Error rate (gauge)
4. Instance count (stat)
5. CPU utilization (heatmap)
6. Memory usage (graph)

**Refresh:** Every 10 seconds

---

## Logging

### Log Levels

**Production:** ERROR and CRITICAL only

```python
# Only log problems
logging.basicConfig(level=logging.ERROR)
```

**What gets logged:**

- Application errors (500 responses)
- Startup/shutdown events
- Health check failures

**What doesn't get logged:**

- Normal requests (too verbose)
- VAC values (privacy)
- Successful calculations

### Log Aggregation

**Centralized logging:**

```text
Versor instances → Fluentd → Elasticsearch → Kibana
```

**Search queries:**

```text
# Find errors in last hour
level:ERROR AND service:versor AND @timestamp:[now-1h TO now]

# Find slow requests
response_time_ms:>100 AND service:versor
```

---

## Scaling Operations

### Auto-Scaling Configuration

```yaml
# Kubernetes HPA
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: versor-hpa
spec:
  scaleTargetRef:
    name: versor
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

**Behavior:**

- CPU > 70% → Add instance
- CPU < 30% → Remove instance (min 2)
- Scale-up time: ~30 seconds
- Scale-down time: ~5 minutes (gradual)

### Manual Scaling

```bash
# Scale up for expected load
kubectl scale deployment versor --replicas=5

# Scale down after peak
kubectl scale deployment versor --replicas=2
```

---

## Deployment Operations

### Rolling Updates

```bash
# Update to new version
kubectl set image deployment/versor versor=versor:1.1.0

# Check rollout status
kubectl rollout status deployment/versor

# Rollback if issues
kubectl rollout undo deployment/versor
```

**Zero-downtime:** Old instances stay up until new ones healthy.

### Configuration Changes

```bash
# Update configuration
kubectl edit configmap versor-config

# Restart to pick up changes
kubectl rollout restart deployment/versor
```

---

## Backup & Recovery

### What to Backup

**Nothing!** Versor is stateless.

**No backups needed for:**

- ❌ Database (doesn't exist)
- ❌ User data (doesn't store)
- ❌ Session state (stateless)

**Do backup:**

- ✅ Configuration files
- ✅ Container images
- ✅ Infrastructure as Code (K8s manifests)

### Disaster Recovery

**If complete failure:**

1. **Redeploy from container registry**

   ```bash
   kubectl apply -f versor-deployment.yaml
   ```

2. **Verify health**

   ```bash
   curl http://versor:8001/health
   ```

3. **Resume traffic**
   - Instances auto-register with load balancer
   - No data recovery needed

**RTO (Recovery Time Objective):** < 5 minutes
**RPO (Recovery Point Objective):** N/A (no data)

---

## Maintenance Windows

### Routine Maintenance

**Required:** Minimal (stateless)

**Quarterly tasks:**

- Dependency updates (NumPy, SciPy, FastAPI)
- Security patches
- Performance review

**No maintenance needed for:**

- Database migrations (none)
- Data cleanup (no data)
- Index rebuilding (no database)

### Update Process

```bash
# 1. Update dependencies
pip install --upgrade numpy scipy fastapi

# 2. Run tests
pytest tests/ -v

# 3. Build new image
docker build -t versor:1.1.0 .

# 4. Deploy to staging
kubectl apply -f versor-staging.yaml

# 5. Verify
curl http://versor-staging:8001/health

# 6. Deploy to production (rolling update)
kubectl set image deployment/versor versor=versor:1.1.0
```

---

## Incident Response

### Severity Levels

| Level | Criteria | Response Time |
|-------|----------|---------------|
| **P1 - Critical** | All instances down | Immediate |
| **P2 - High** | Latency > 500ms | 15 minutes |
| **P3 - Medium** | Error rate > 5% | 1 hour |
| **P4 - Low** | Single instance down | Next business day |

### Escalation Path

```text
Alert → On-call engineer → Senior developer → Engineering manager
```

---

## Runbooks

### Runbook 1: High Latency

**Symptom:** P99 latency > 100ms

**Steps:**

1. Check request rate (scaling needed?)
2. Check CPU utilization (add instances?)
3. Check recent deployments (rollback?)
4. Review error logs
5. If sustained, scale up

### Runbook 2: All Instances Down

**Symptom:** Health checks failing

**Steps:**

1. Check Kubernetes pod status
2. Check container logs
3. Verify network connectivity
4. Redeploy if needed
5. Post-mortem after recovery

### Runbook 3: High Error Rate

**Symptom:** Error rate > 1%

**Steps:**

1. Check error types (422 vs 500)
2. If 422: Client validation issue (notify Observer team)
3. If 500: Server error (check logs, rollback)
4. Review recent changes

---

## Performance Monitoring

### Baseline Performance

**Normal operation:**

- P50 latency: 10-15ms
- P95 latency: 20-30ms
- P99 latency: 40-50ms
- Request rate: 10-100/s

**If metrics deviate > 50%, investigate.**

### Capacity Planning

**Current capacity:**

- 1 instance: ~500 req/s
- 3 instances: ~1500 req/s
- 10 instances: ~5000 req/s

**Usage forecast:**

- Current: ~50 req/s average
- 6 months: ~150 req/s (estimated)
- 1 year: ~300 req/s (estimated)

**Action:** Review capacity quarterly, scale proactively.

---

## Security Operations

### Security Scans

**Monthly:**

```bash
# Dependency vulnerabilities
pip-audit

# Container scanning
trivy image versor:latest
```

### Patch Management

**Priority levels:**

- **Critical:** Patch within 24 hours
- **High:** Patch within 1 week
- **Medium:** Patch in next release
- **Low:** Patch when convenient

---

## Next Steps

- **[Team Structure](02-team-structure.md)** - Roles and responsibilities
- **[Incident Response](03-incident-response.md)** - Detailed incident procedures

---

**Previous:** [← Integration Points](../architecture/10-integration-points.md)
**Next:** [Team Structure →](02-team-structure.md)
