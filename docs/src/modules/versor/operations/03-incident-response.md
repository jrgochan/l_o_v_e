# Incident Response - Versor Module

This guide provides procedures for responding to production incidents in the Versor module.

---

## Incident Classification

### Severity Levels

| Level | Definition | Example | Response Time |
|-------|------------|---------|---------------|
| **P1 - Critical** | Service completely down | All instances crashed | Immediate |
| **P2 - High** | Severe degradation | P99 > 500ms | 15 minutes |
| **P3 - Medium** | Partial degradation | Error rate > 5% | 1 hour |
| **P4 - Low** | Minor issue | Single instance down | Next business day |

---

## Incident Response Procedures

### P1: Service Completely Down

**Symptoms:**

- All health checks failing
- No successful requests
- Observer can't reach Versor

**Immediate Actions (First 5 minutes):**

1. **Verify the incident**

   ```bash
   curl http://versor:8001/health
   # If fails, incident confirmed
   ```

2. **Check instance status**

   ```bash
   kubectl get pods -l app=versor
   # Look for CrashLoopBackOff, Error states
   ```

3. **Check logs**

   ```bash
   kubectl logs deployment/versor --tail=100
   # Look for error messages, stack traces
   ```

4. **Quick fix attempt**

   ```bash
   # Restart all instances
   kubectl rollout restart deployment/versor
   ```

**Recovery Actions (5-15 minutes):**

1. **If restart doesn't work, rollback**

   ```bash
   kubectl rollout undo deployment/versor
   ```

2. **Verify recovery**

   ```bash
   curl http://versor:8001/health
   # Should return healthy
   ```

3. **Monitor for 10 minutes**
   - Check error rate
   - Check latency
   - Confirm stability

**Communication:**

- Post in #incidents Slack channel
- Update status page
- Notify Observer team

**Post-Incident:**

- Write post-mortem within 48 hours
- Identify root cause
- Create prevention tickets

---

### P2: Severe Performance Degradation

**Symptoms:**

- P99 latency > 500ms (10x normal)
- Request timeouts
- Observer experiencing delays

**Response Actions:**

1. **Check load**

   ```bash
   # Request rate
   kubectl top pods -l app=versor

   # If CPU > 90%, scale up immediately
   kubectl scale deployment versor --replicas=6
   ```

2. **Check for bad deployment**

   ```bash
   # When was last deployment?
   kubectl rollout history deployment/versor

   # If recent, rollback
   kubectl rollout undo deployment/versor
   ```

3. **Profile performance**

   ```bash
   # Check individual instances
   curl http://pod-ip:8001/health
   # Look for slow responses
   ```

4. **Temporary mitigation**

   ```bash
   # Add more instances
   kubectl scale deployment versor --replicas=10
   ```

5. **Investigate root cause**
   - Check logs for errors
   - Review recent code changes
   - Profile slow requests
   - Check for memory leaks

---

### P3: High Error Rate

**Symptoms:**

- Error rate > 5%
- Mix of 422 and 500 errors
- Observer logging failed Versor calls

**Response Actions:**

1. **Identify error types**

   ```bash
   # Check logs
   kubectl logs deployment/versor | grep ERROR
   ```

2. **If 422 errors (validation):**
   - **Cause:** Observer sending invalid VAC values
   - **Action:** Notify Observer team
   - **Not a Versor incident** (client error)

3. **If 500 errors (server):**
   - **Cause:** Bug in Versor code
   - **Actions:**
     a. Check recent deployments
     b. Rollback if recent change
     c. Review error stack traces
     d. Hot-fix if possible

4. **Monitor after fix**
   - Error rate should drop below 0.1%
   - Latency should normalize

---

### P4: Single Instance Down

**Symptoms:**

- 1 of 3 instances not healthy
- Traffic routed to other instances
- No user impact

**Response Actions:**

1. **Check pod status**

   ```bash
   kubectl get pods -l app=versor
   ```

2. **Check logs of failed pod**

   ```bash
   kubectl logs <pod-name>
   ```

3. **Delete pod (K8s will recreate)**

   ```bash
   kubectl delete pod <pod-name>
   ```

4. **Verify new pod is healthy**

   ```bash
   kubectl get pods -l app=versor
   # New pod should be Running
   ```

**No urgent action needed** - schedule investigation for next business day.

---

## Common Incident Scenarios

### Scenario 1: Memory Leak

**Symptoms:**

- Memory usage increasing over time
- Eventually OOMKilled
- Periodic restarts

**Diagnosis:**

```bash
# Monitor memory over time
kubectl top pods -l app=versor --watch
```

**Resolution:**

```python
# Find leak with memory_profiler
@profile
def suspected_function():
    # Check for unclosed resources
    # Check for growing lists/caches
    pass
```

**Permanent fix:**

- Identify leaking code
- Fix and deploy
- Monitor for recurrence

**Temporary mitigation:**

- Increase memory limit
- More frequent restarts

---

### Scenario 2: Network Partition

**Symptoms:**

- Observer can't reach Versor
- Versor health checks fail
- But instances are running

**Diagnosis:**

```bash
# From Observer pod
curl http://versor:8001/health

# From Versor pod
kubectl exec -it <versor-pod> -- curl localhost:8001/health
```

**Resolution:**

```bash
# Check network policies
kubectl get networkpolicies

# Check service
kubectl get service versor

# Check DNS
kubectl exec -it <observer-pod> -- nslookup versor
```

---

### Scenario 3: Dependency Failure

**Symptoms:**

- ImportError on startup
- "Module not found: scipy"
- Pods in CrashLoopBackOff

**Diagnosis:**

```bash
# Check container logs
kubectl logs <pod-name>
# Look for ImportError
```

**Resolution:**

```dockerfile
# Verify Dockerfile includes dependencies
RUN pip install -r requirements.txt

# Rebuild image
docker build -t versor:1.0.1 .

# Redeploy
kubectl set image deployment/versor versor=versor:1.0.1
```

---

## Escalation Procedures

### When to Escalate

**To Senior Developer:**

- After 30 minutes without resolution
- If root cause unclear
- If mathematical correctness questioned

**To Engineering Manager:**

- After 1 hour without resolution
- If multiple services affected
- If user impact is significant

**To Executive:**

- Critical data loss (N/A for Versor - stateless)
- Extended outage (> 4 hours)
- Security incident

### Escalation Contacts

```text
On-Call Engineer
    ↓ (30 min)
Senior Developer
    ↓ (60 min)
Engineering Manager
    ↓ (if needed)
CTO
```

---

## Post-Incident Review

### Template

### Incident Post-Mortem

**Date:** YYYY-MM-DD
**Duration:** X hours
**Severity:** PX
**Impact:** X users affected

**Timeline:**

- HH:MM - Incident detected
- HH:MM - Response initiated
- HH:MM - Root cause identified
- HH:MM - Fix deployed
- HH:MM - Incident resolved

**Root Cause:**
[Description]

**Resolution:**
[What was done]

**Action Items:**

- [ ] Prevent: [How to prevent recurrence]
- [ ] Detect: [How to detect earlier]
- [ ] Respond: [How to respond faster]

**Lessons Learned:**
[Key takeaways]

---

## Incident Prevention

### Proactive Measures

**1. Regular testing:**

```bash
# Weekly
pytest tests/ -v

# Monthly
load test with ApacheBench
```

**2. Monitoring alerts:**

- Set up before incidents occur
- Test alert delivery
- Keep thresholds updated

**3. Deployment safeguards:**

- Staging environment testing
- Rolling updates (not big bang)
- Easy rollback capability
- Automated health checks

**4. Documentation:**

- Keep runbooks updated
- Document all incidents
- Share learnings

---

## Communication During Incidents

### Status Updates

**Every 15-30 minutes:**

```text
Update #1 (14:05):
- Issue: Versor API returning 500 errors
- Impact: 10% of Observer requests failing
- Status: Investigating, rollback initiated
- ETA: 15 minutes

Update #2 (14:20):
- Rollback complete
- Error rate back to normal
- Monitoring for stability
- Root cause analysis in progress
```

### Channels

**#incidents (Slack):**

- All updates
- Real-time communication
- Quick questions

**Status page:**

- Public-facing status
- Less frequent updates
- High-level only

**Email (if critical):**

- Stakeholders
- Management
- Affected teams

---

## Recovery Verification

### Checklist

After incident resolved:

- [ ] Health check passing
- [ ] Error rate < 0.1%
- [ ] Latency back to normal
- [ ] All instances healthy
- [ ] Load balanced properly
- [ ] Monitored for 30+ minutes
- [ ] Post-mortem scheduled
- [ ] Stakeholders notified

---

## Tools & Resources

### Quick Links

- **Grafana:** <http://grafana.internal/versor>
- **Logs:** <http://kibana.internal/app/discover>
- **K8s dashboard:** <http://k8s.internal/>
- **Runbooks:** This documentation

### Emergency Contacts

- **On-call rotation:** Check PagerDuty
- **Senior developer:** [Contact info]
- **DevOps lead:** [Contact info]
- **Engineering manager:** [Contact info]

---

## Next Steps

- **[Executive Overview](../overview/01-executive-summary.md)** - Business perspective
- **[API Reference](../reference/api-reference.md)** - Complete API documentation

---

**Previous:** [← Team Structure](02-team-structure.md)
**Next:** [Executive Overview →](../overview/01-executive-summary.md)
