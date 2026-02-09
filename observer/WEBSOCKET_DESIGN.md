# Observer WebSocket Real-Time Updates - Design Document

**Created:** December 5, 2025
**Status:** Design Phase
**Priority:** High (eliminates 5-second polling)

---

## Overview

Replace HTTP polling with WebSocket push notifications for real-time emotional state updates in the Experience app.

**Current:** Experience polls `/observer/state` every 5 seconds
**Goal:** Observer pushes updates immediately when state changes

---

## WebSocket Protocol Design

### Endpoint

```
ws://localhost:8000/observer/ws/{user_id}
```

### Connection Flow

```
1. Client connects with user_id
2. Server stores connection in ConnectionManager
3. Server sends initial state (if exists)
4. Server pushes updates when:
   - New state recorded
   - Journey waypoint reached
   - Journey started/completed
5. Client receives and updates UI
6. Heartbeat every 30s (ping/pong)
```

---

## Message Types

### 1. Server → Client: State Update

```typescript
{
  "type": "state_update",
  "data": {
    "state_id": "uuid",
    "emotion": {
      "name": "Joy",
      "category": "Places We Go When Life Is Good",
      "vac": [0.9, 0.7, 0.8]
    },
    "quaternion": [0.303, 0.616, 0.479, 0.547],
    "metrics": {
      "elasticity": 2.5,
      "rigidity": 0.3,
      "alerts": ["flooding"]
    },
    "timestamp": "2025-12-05T18:30:00Z"
  }
}
```

### 2. Server → Client: Journey Update

```typescript
{
  "type": "journey_update",
  "data": {
    "journey_id": "uuid",
    "status": "in_progress" | "completed" | "abandoned",
    "current_waypoint": 1,
    "waypoints_reached": 2,
    "total_waypoints": 3
  }
}
```

### 3. Server → Client: Heartbeat

```typescript
{
  "type": "ping",
  "timestamp": "2025-12-05T18:30:00Z"
}
```

### 4. Client → Server: Pong

```typescript
{
  "type": "pong",
  "timestamp": "2025-12-05T18:30:01Z"
}
```

### 5. Server → Client: Error

```typescript
{
  "type": "error",
  "message": "Failed to fetch state",
  "code": "STATE_NOT_FOUND"
}
```

---

## Backend Implementation

### File Structure

```
observer/app/
├── websocket/
│   ├── __init__.py
│   ├── connection_manager.py  # Manages active connections
│   ├── routes.py              # WebSocket endpoint
│   └── broadcaster.py         # Broadcast helper
├── api/routes/
│   └── state.py               # Modified to broadcast on state record
└── main.py                    # Register WebSocket routes
```

### Connection Manager

```python
# observer/app/websocket/connection_manager.py

from fastapi import WebSocket
from typing import Dict, Set
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Map of user_id → set of websocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        """Accept connection and subscribe to user updates."""
        await websocket.accept()

        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()

        self.active_connections[user_id].add(websocket)
        logger.info(f"WebSocket connected for user {user_id}")

    def disconnect(self, websocket: WebSocket, user_id: str):
        """Remove connection."""
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

        logger.info(f"WebSocket disconnected for user {user_id}")

    async def send_to_user(self, user_id: str, message: dict):
        """Send message to all connections for a user."""
        if user_id not in self.active_connections:
            return

        dead_connections = set()

        for connection in self.active_connections[user_id]:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send to connection: {e}")
                dead_connections.add(connection)

        # Clean up dead connections
        for conn in dead_connections:
            self.disconnect(conn, user_id)

    async def broadcast_to_all(self, message: dict):
        """Broadcast to all connected users."""
        for user_id in list(self.active_connections.keys()):
            await self.send_to_user(user_id, message)

# Global instance
manager = ConnectionManager()
```

---

## Frontend Implementation

### WebSocket Hook

```typescript
// experience/web/hooks/useWebSocket.ts

import { useEffect, useRef, useState } from 'react';
import { useExperienceStore } from '@/stores/useExperienceStore';

interface UseWebSocketOptions {
  userId: string;
  enabled?: boolean;
  baseUrl?: string;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

export function useWebSocket({
  userId,
  enabled = true,
  baseUrl = process.env.NEXT_PUBLIC_OBSERVER_URL || 'http://localhost:8000',
  reconnectDelay = 1000,
  maxReconnectAttempts = 5,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const setTarget = useExperienceStore(state => state.setTarget);

  useEffect(() => {
    if (!enabled) return;

    const wsUrl = baseUrl.replace('http', 'ws') + `/observer/ws/${userId}`;

    function connect() {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectCountRef.current = 0;
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'state_update':
            setTarget(
              message.data.emotion.vac,
              message.data.quaternion
            );
            console.log('State update received:', message.data.emotion.name);
            break;

          case 'journey_update':
            // Handle journey updates
            console.log('Journey update:', message.data);
            break;

          case 'ping':
            // Respond to heartbeat
            ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
            break;

          default:
            console.warn('Unknown message type:', message.type);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);

        // Attempt reconnect with exponential backoff
        if (reconnectCountRef.current < maxReconnectAttempts) {
          const delay = reconnectDelay * Math.pow(2, reconnectCountRef.current);
          console.log(`Reconnecting in ${delay}ms...`);

          setTimeout(() => {
            reconnectCountRef.current++;
            connect();
          }, delay);
        } else {
          console.error('Max reconnect attempts reached');
        }
      };

      wsRef.current = ws;
    }

    connect();

    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [userId, enabled, baseUrl]);

  return {
    isConnected,
    reconnect: () => {
      reconnectCountRef.current = 0;
      wsRef.current?.close();
    }
  };
}
```

---

## Events to Broadcast

### 1. State Recorded
**When:** `/observer/state` POST succeeds
**Trigger:** After `db.commit()` in state.py
**Broadcast To:** user_id from request

### 2. Waypoint Reached
**When:** `/observer/journey/{id}/waypoint-reached` POST succeeds
**Trigger:** After waypoint marked as reached
**Broadcast To:** user_id associated with journey

### 3. Journey Started
**When:** `/observer/journey/start` POST succeeds
**Trigger:** After journey created
**Broadcast To:** user_id from request

---

## Migration Strategy

### Phase 1: Add WebSocket (Keep Polling)
- Implement WebSocket server
- Implement WebSocket client
- Run both in parallel
- Verify WebSocket works

### Phase 2: Make Polling Optional
- Add toggle in Experience settings
- Default to WebSocket, fallback to polling
- Test both modes

### Phase 3: Remove Polling
- Remove polling code
- WebSocket only

---

## Security Considerations

### 1. Authentication
- Validate user_id in URL path
- Optional: Add JWT token in connection handshake
- Prevent unauthorized subscriptions

### 2. Rate Limiting
- Limit connections per user (max 3)
- Prevent message spam
- Heartbeat timeout (disconnect idle clients)

### 3. Error Handling
- Graceful degradation if WebSocket unavailable
- Clear error messages
- Automatic reconnection

---

## Performance Benefits

### Current (Polling)
- Request every 5 seconds
- Network traffic: constant (even when no changes)
- Latency: 0-5 seconds
- Server load: High (constant requests)

### With WebSocket
- Persistent connection
- Network traffic: only when changes occur
- Latency: <100ms (immediate)
- Server load: Lower (fewer requests)

**Estimated Improvement:**
- 90% reduction in network requests
- 95% reduction in update latency
- Better battery life (mobile)

---

## Testing Plan

### Unit Tests
- Connection manager (add/remove/broadcast)
- Message serialization
- Error handling

### Integration Tests
```python
# Test WebSocket state update broadcast
async def test_websocket_state_broadcast():
    # Connect WebSocket client
    async with websocket_connect(f"ws://localhost:8000/observer/ws/{user_id}") as ws:
        # Record state via REST API
        response = await client.post("/observer/state", json={...})

        # Expect WebSocket message
        message = await ws.receive_json()

        assert message["type"] == "state_update"
        assert message["data"]["emotion"]["name"] == "Joy"
```

### Browser Tests
- Open Experience app
- Record new state via Listener
- Verify Soul Sphere updates immediately (no 5s delay)
- Test reconnection (kill server, restart)

---

## Implementation Steps

1. Add `websockets` to `observer/requirements.txt`
2. Create `observer/app/websocket/` directory structure
3. Implement ConnectionManager
4. Create WebSocket route
5. Modify `state.py` to broadcast on record
6. Register WebSocket routes in `main.py`
7. Test backend with `websocat` or Python client
8. Implement frontend WebSocket hook
9. Replace polling with WebSocket
10. Test end-to-end
11. Document

---

## Rollback Plan

If WebSocket causes issues:
1. Keep polling code (don't delete)
2. Add feature flag: `USE_WEBSOCKET=false`
3. Can instantly revert to polling
4. Fix WebSocket issues
5. Re-enable when stable

---

## Next Steps

1. Get approval for this design
2. Start with backend implementation (Observer)
3. Test with simple WebSocket client
4. Implement frontend
5. Integration test
6. Deploy

---

**Status:** Design Complete, Ready for Implementation
**Estimated Time:** 4-6 hours
