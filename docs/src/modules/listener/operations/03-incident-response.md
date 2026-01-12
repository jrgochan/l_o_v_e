# Incident Response

**Reading Time:** ~20 minutes  
**Audience:** Engineering managers, DevOps, on-call engineers  
**Prerequisites:** [Team Structure](02-team-structure.md)  
**Goal:** Handle production incidents effectively

---

## Incident Severity Levels

### Priority Classification

| Level | Impact | Response Time | Escalation | Examples |
|-------|--------|---------------|------------|----------|
| **P0** | Complete outage | Immediate | Page on-call + lead | Service down, Sacred test fails |
| **P1** | Major degradation | < 15 min | Page on-call | High error rate, Ollama down |
| **P2** | Minor degradation | < 1 hour | Notify team | Slow performance, Redis issues |
| **P3** | Low impact | < 1 day | Create ticket | Minor bugs, feature requests |

---

## P0: Critical Incidents

### Incident 1: Listener Service Down

**Symptoms:**

```text
Health check returns 503
All requests failing
```

**Response Procedure:**

```bash
# 1. Confirm the issue (30 seconds)
curl http://localhost:8002/health
# Expected: No response or error

# 2. Check process (30 seconds)
ps aux | grep uvicorn
# Is the process running?

# 3. Check logs (1 minute)
tail -100 logs/listener.log
# Look for crash reason

# 4. Restart service (30 seconds)
cd listener
source .venv/bin/activate
uvicorn app.main:app --port 8002 &

# 5. Verify recovery (30 seconds)
curl http://localhost:8002/health
# Should return: {"status": "healthy"}

# 6. Test analysis endpoint
curl -X POST http://localhost:8002/listener/analyze \
  -F "text=test" -F "user_id=test" -F "session_id=test"
```

**Total Time:** ~3 minutes

**Post-Incident:**

- Create RCA (Root Cause Analysis) document
- Update runbook if needed
- Implement preventive measures

---

### Incident 2: Sacred Test Fails

**Symptoms:**

```text
pytest tests/semantic/test_connection_axis.py FAILED
Connection axis not working correctly
```

**⚠️ THIS IS THE MOST CRITICAL INCIDENT!**

**Response Procedure:**

```bash
# 1. Run test with verbose output (1 minute)
cd listener
pytest tests/semantic/test_connection_axis.py::test_pity_vs_compassion -vv -s

# 2. Check what values we're getting
# Expected: Pity → Connection < 0
# Actual: Connection = ???

# 3. Check if prompt was modified (1 minute)
git log -p app/services/semantic_analyzer.py | head -100
# Was the prompt changed?

# 4. Check LLM model (30 seconds)
cat .env | grep OLLAMA_MODEL
ollama list
# Is correct model loaded?

# 5. Test manually (2 minutes)
python -c "
from app.services.semantic_analyzer import get_semantic_analyzer
analyzer = get_semantic_analyzer()
result = analyzer.analyze_sync('I feel sorry for them')
print(f'Connection: {result.vac.connection}')
print(f'Reasoning: {result.reasoning}')
"

# 6. Remediation
# If prompt changed: Revert
# If model wrong: Change model
# If model broken: Re-download model
```

**Escalation:** Immediately notify ML Engineer + Engineering Lead

**Post-Incident:**

- **Mandatory RCA**
- Update prompt if needed
- Add regression test

---

## P1: High Severity Incidents

### Incident 3: High Error Rate

**Symptoms:**

```text
Error rate > 1% (normally < 0.1%)
Multiple user reports
```

**Response Procedure:**

```bash
# 1. Identify error pattern (2 minutes)
grep ERROR logs/listener.log | tail -50
# What's the common error?

# 2. Check dependencies (1 minute)
curl http://localhost:11434/api/tags  # Ollama
redis-cli ping  # Redis
curl http://localhost:8000/health  # Observer

# 3. Check resource usage (1 minute)
top  # CPU/memory
df -h  # Disk space

# 4. Scale if resource exhaustion (K8s)
kubectl scale deployment listener --replicas=5

# 5. Restart problematic dependency
# If Ollama: pkill ollama && ollama serve &
# If Redis: redis-server &
```

**Total Time:** ~5-10 minutes

---

### Incident 4: Slow Performance

**Symptoms:**

```text
P99 latency > 10s (normally < 3s)
User complaints about slowness
```

**Response Procedure:**

```bash
# 1. Profile current performance (2 minutes)
curl -w "@curl-format.txt" -X POST http://localhost:8002/listener/analyze \
  -F "text=test" -F "user_id=test" -F "session_id=test"

# 2. Check Ollama performance (1 minute)
ollama ps  # What models are loaded?
# Too many models in memory?

# 3. Check system resources (1 minute)
top
# CPU at 100%? Memory swapping?

# 4. Quick fixes
# - Use smaller model temporarily
# - Scale horizontally
# - Clear cache/restart

# 5. Long-term solution
# - Add GPU
# - Optimize prompt
# - Implement caching
```

---

## P2: Medium Severity Incidents

### Incident 5: Redis Connection Issues

**Symptoms:**

```text
Async endpoints failing
Queue jobs not processing
```

**Response:**

```bash
# Check Redis
redis-cli ping

# Restart if needed
redis-server &

# Clear stuck jobs
redis-cli FLUSHDB  # CAUTION: Deletes queued jobs!
```

**Impact:** Async endpoints affected, sync endpoints still work

---

## Incident Communication

### Internal Communication

**Template for incident updates:**

```text
[P0 INCIDENT] Listener Service Down

Status: ONGOING
Started: 2026-01-02 19:30 UTC
Impact: All users unable to analyze emotions
Team: On-call engineer responding

Timeline:
19:30 - Incident detected (health check failed)
19:32 - On-call paged
19:35 - Root cause identified (Ollama crash)
19:37 - Ollama restarted
19:40 - Service recovered
19:45 - Monitoring for stability

Next update: 20:00 UTC or when resolved
```

---

### User Communication

**Template for status page:**

```text
[INVESTIGATING] Emotion Analysis Delays

We're experiencing delays in emotion analysis due to high load.
Our team is investigating and working on a fix.

Workaround: Please retry after 30 seconds if you see an error.

Updates will be posted every 15 minutes.

Last updated: 19:45 UTC
```

---

## Post-Incident Process

### 1. Immediate Actions (Within 1 hour)

- [ ] Service recovered and stable
- [ ] Monitoring confirms normal operation
- [ ] Internal incident update posted
- [ ] User communication sent (if customer-facing)

### 2. Root Cause Analysis (Within 24 hours)

**Template:**

```markdown
# RCA: Listener Service Outage - 2026-01-02

## Summary
Listener service was unavailable for 10 minutes due to Ollama crash.

## Timeline
- 19:30 UTC: Health checks fail
- 19:32 UTC: On-call paged
- 19:35 UTC: Root cause identified
- 19:37 UTC: Ollama restarted
- 19:40 UTC: Service recovered

## Root Cause
Ollama ran out of memory due to loading too many models simultaneously.

## Impact
- Duration: 10 minutes
- Affected users: ~50 (all active users)
- Failed requests: ~25

## Resolution
Restarted Ollama with single model loaded.

## Prevention
1. Add memory limits to Ollama
2. Implement model rotation (unload unused)
3. Add memory usage alerts

## Action Items
- [ ] Update Ollama config (Owner: DevOps, Due: 2026-01-03)
- [ ] Add memory alerts (Owner: DevOps, Due: 2026-01-05)
- [ ] Document model management (Owner: ML Engineer, Due: 2026-01-10)
```

### 3. Follow-up (Within 1 week)

- [ ] RCA shared with team
- [ ] Action items tracked in GitLab
- [ ] Preventive measures implemented
- [ ] Runbook updated
- [ ] Incident review meeting held

---

## Escalation Matrix

### Who to Contact

| Issue Type | First Contact | Escalation (if unresolved in 30 min) |
|------------|---------------|--------------------------------------|
| Service Down | On-call Engineer | Engineering Lead |
| Sacred Test Fails | ML Engineer | Engineering Lead + CTO |
| Performance Issues | On-call Engineer | Senior BE |
| Security Incident | DevOps + Lead | CISO |

### Contact Information

```text
On-Call Rotation: https://pagerduty.com/schedules/listener

Engineering Lead: lead@example.com (Slack: @lead)
ML Engineer: ml@example.com (Slack: @ml-eng)
Senior BE: senior@example.com (Slack: @senior-be)
DevOps: devops@example.com (Slack: @devops)
```

---

## Runbook: Common Scenarios

### Scenario: Ollama Crashes

```bash
# Symptoms
curl http://localhost:11434/api/tags
# Connection refused

# Fix
ollama serve &

# Wait for startup (30s)
sleep 30

# Verify
ollama list

# Test Listener
curl -X POST http://localhost:8002/listener/analyze -F "text=test"
```

---

### Scenario: High Memory Usage

```bash
# Check memory
free -h  # Linux
vm_stat  # macOS

# Check what's using memory
ps aux --sort=-%mem | head -10

# If Ollama is the culprit
ollama ps  # List loaded models
ollama rm unused-model  # Remove unused

# Force garbage collection in Python
pkill -USR1 -f uvicorn  # Send signal to trigger GC
```

---

### Scenario: Queue Backed Up

```bash
# Check queue depth
redis-cli LLEN "arq:queue:default"

# If > 100 jobs backed up:

# 1. Add more workers
arq app.workers.audio_processor.WorkerSettings &
arq app.workers.audio_processor.WorkerSettings &

# 2. Or clear old jobs (if acceptable)
redis-cli DEL "arq:queue:default"
```

---

## Key Takeaways

✅ **P0 incidents:** Immediate response, page on-call  
✅ **Sacred test failure:** Highest priority (innovation at risk)  
✅ **Clear runbooks:** Step-by-step procedures  
✅ **Communication:** Keep stakeholders informed  
✅ **Post-incident:** Always write RCA, implement prevention  
✅ **Escalation:** Know who to contact  

---

**Congratulations!** You've completed all manager documentation for the Listener module!

**Next:**

- [Executive Overview](../overview/01-executive-summary.md) - Strategic perspective
- [API Reference](../reference/api-reference.md) - Complete endpoint documentation
