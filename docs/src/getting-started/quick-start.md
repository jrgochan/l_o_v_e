# Quick Start Guide

Get up and running with the L.O.V.E. Stack in 5 minutes!

## 1. Start the Stack

```bash
cd infra
./run-love-stack.sh
```

This starts:

- **Observer** on <http://localhost:8000>
- **Versor** on <http://localhost:8001>
- **Listener** on <http://localhost:8002>

## 2. Access API Documentation

```bash
# Observer (emotional state tracking)
open http://localhost:8000/docs

# Listener (audio processing)
open http://localhost:8002/docs

# Versor (quaternion mathematics)
open http://localhost:8001/docs
```

## 3. Your First API Calls

### Get All Emotions

```bash
curl http://localhost:8000/api/atlas/emotions | jq
```

Returns all 87 emotions from Atlas of the Heart with VAC vectors.

### Find Similar Emotions

```bash
curl -X POST http://localhost:8000/api/atlas/search \
  -H "Content-Type: application/json" \
  -d '{"text": "feeling anxious about the future"}' | jq
```

### Convert VAC to Quaternion

```bash
curl -X POST http://localhost:8001/api/quaternion/from-vac \
  -H "Content-Type: application/json" \
  -d '{"vac": [-0.5, 0.7, -0.4]}' | jq
```

### Analyze Voice Input

```bash
curl -X POST http://localhost:8002/api/ingest/audio \
  -F "audio=@recording.wav" | jq
```

## 4. Common Tasks

### Check Emotion by Name

```bash
curl http://localhost:8000/api/atlas/emotions/Joy | jq
```

### Get Transition Strategies

```bash
curl http://localhost:8000/api/transitions/strategies | jq
```

### Search Transition Patterns

```bash
curl http://localhost:8000/api/transitions/patterns | jq
```

## 5. Database Access

```bash
# Connect to database
psql -U love_user -d love_db

# List all tables
\dt

# Count emotions
SELECT COUNT(*) FROM atlas_definitions;

# See transition strategies
SELECT strategy_name, strategy_type, difficulty_level
FROM transition_strategies
ORDER BY difficulty_level;
```

## 6. Stop the Stack

```bash
cd infra
./stop-love-stack.sh
```

## Next Steps

- **Module Documentation:** Explore [Modules](../modules/index.md) for detailed guides
- **Architecture:** Understand the [VAC Model](../architecture/02-vac-model.md)
- **Features:** Browse available [Features](../features/index.md)
- **API Reference:** Check module-specific [API docs](../reference/index.md)

## Common Issues

### Port Already in Use

```bash
# Find and kill process
lsof -ti:8000 | xargs kill -9  # Observer
lsof -ti:8080 | xargs kill -9  # Versor
lsof -ti:8001 | xargs kill -9  # Listener
```

### Database Connection Error

```bash
# Check PostgreSQL is running
brew services list | grep postgresql  # macOS
sudo systemctl status postgresql      # Linux

# Restart if needed
brew services restart postgresql      # macOS
sudo systemctl restart postgresql     # Linux
```

### Versor Not Starting

```bash
# Check logs
tail -f /tmp/versor.log

# Manual start
cd versor
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8080
```

## Development Workflow

1. Make code changes in respective module
2. Restart affected service
3. Test via API docs (Swagger UI)
4. Run module tests
5. Commit changes

## Production Deployment

See `infra/deploy/` for containerized deployment options.
