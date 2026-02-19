# Quick Start Guide

Get up and running with the L.O.V.E. Stack in 5 minutes!

## 1. Start the Stack

```bash
cd infra
./bin/run-love-stack.sh
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
curl http://localhost:8000/observer/emotions | jq
```

Returns all 87 emotions from Atlas of the Heart with VAC vectors.

### Find Similar Emotions

```bash
curl "http://localhost:8000/observer/search?query=feeling+anxious+about+the+future" | jq
```

### Convert VAC to Quaternion

```bash
curl -X POST http://localhost:8001/versor/calculate \
  -H "Content-Type: application/json" \
  -d '{"current_vac": {"valence": -0.5, "arousal": 0.7, "connection": -0.4}}' | jq
```

### Analyze Voice Input

```bash
curl -X POST http://localhost:8002/listener/ingest \
  -F "audio=@recording.wav" \
  -F "user_id=user123" \
  -F "session_id=session456" | jq
```

## 4. Common Tasks

### Get Emotion by ID

```bash
# First get the emotion UUID from /observer/emotions, then:
curl http://localhost:8000/observer/emotions/{emotion_uuid} | jq
```

### Get Transition Strategies

```bash
curl http://localhost:8000/observer/strategies | jq
```

### Find a Transition Path

```bash
curl -X POST http://localhost:8000/observer/transition-path \
  -H "Content-Type: application/json" \
  -d '{"from_emotion_id": "uuid-anger", "to_emotion_id": "uuid-calm", "user_id": "user123"}' | jq
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
./bin/stop-love-stack.sh
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
lsof -ti:8001 | xargs kill -9  # Versor
lsof -ti:8002 | xargs kill -9  # Listener
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
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

## Development Workflow

1. Make code changes in respective module
2. Restart affected service
3. Test via API docs (Swagger UI)
4. Run module tests
5. Commit changes

## Production Deployment

See `infra/deploy/` for containerized deployment options.
