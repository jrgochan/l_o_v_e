# Experience Module - API Integration

## Overview

The Experience module receives emotional state data from the **Versor engine** (the mathematical processing backend). This document specifies how to integrate with the Versor API to receive real-time VAC values and quaternion updates.

## API Communication Patterns

### Option A: REST API (Polling)

**Use Case**: Development, testing, low-frequency updates

**Pros**:

- Simple to implement
- Easy to debug
- No persistent connection overhead

**Cons**:

- Higher latency (polling interval)
- More network requests
- Not ideal for real-time

### Option B: WebSocket (Real-Time)

**Use Case**: Production, real-time emotional tracking

**Pros**:

- Low latency (push-based)
- Bi-directional communication
- Efficient for frequent updates

**Cons**:

- More complex implementation
- Requires connection management
- Reconnection logic needed

**Recommendation**: Use REST for MVP/development, migrate to WebSocket for production.

## REST API Integration

### Endpoint Specification

```
Base URL: https://api.love.app/v1
```

#### GET /versor/current-state

Retrieve the user's current emotional state.

**Request**:

```http
GET /versor/current-state
Authorization: Bearer <JWT_TOKEN>
```

**Response** (200 OK):

```json
{
  "userId": "uuid-string",
  "timestamp": "2025-12-02T18:45:00Z",
  "vac": {
    "valence": 0.7,
    "arousal": 0.5,
    "connection": 0.8
  },
  "quaternion": {
    "w": 0.68,
    "x": 0.5,
    "y": 0.39,
    "z": 0.45
  },
  "metrics": {
    "angularDistance": 45.3,
    "angularVelocity": 2.1,
    "elasticity": 0.3
  },
  "emotion": {
    "primary": "Joy",
    "category": "Places We Go When Life Is Good",
    "confidence": 0.92
  }
}
```

**Error Response** (401 Unauthorized):

```json
{
  "error": "unauthorized",
  "message": "Invalid or expired token"
}
```

### Implementation

```typescript
// src/services/versorApi.ts

import axios from "axios";
import { useExperienceStore } from "../features/experience/store/useExperienceStore";

const API_BASE_URL = process.env.VERSOR_API_URL || "https://api.love.app/v1";

interface VersorStateResponse {
  vac: {
    valence: number;
    arousal: number;
    connection: number;
  };
  quaternion: {
    w: number;
    x: number;
    y: number;
    z: number;
  };
  metrics: {
    angularDistance: number;
    angularVelocity: number;
    elasticity: number;
  };
}

class VersorApiService {
  private token: string | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;

  setAuthToken(token: string) {
    this.token = token;
  }

  async getCurrentState(): Promise<VersorStateResponse> {
    const response = await axios.get<VersorStateResponse>(
      `${API_BASE_URL}/versor/current-state`,
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      },
    );

    return response.data;
  }

  startPolling(intervalMs: number = 1000) {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(async () => {
      try {
        const state = await this.getCurrentState();
        this.updateStore(state);
      } catch (error) {
        console.error("Failed to fetch state:", error);
      }
    }, intervalMs);
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private updateStore(state: VersorStateResponse) {
    const { vac, quaternion } = state;

    useExperienceStore
      .getState()
      .setTarget(
        [vac.valence, vac.arousal, vac.connection],
        [quaternion.w, quaternion.x, quaternion.y, quaternion.z],
      );
  }
}

export const versorApi = new VersorApiService();
```

### Usage in Component

```typescript
import { useEffect } from 'react';
import { versorApi } from './services/versorApi';

function App() {
  useEffect(() => {
    // Set auth token
    const token = await getAuthToken(); // Your auth logic
    versorApi.setAuthToken(token);

    // Start polling
    versorApi.startPolling(1000); // Poll every second

    // Cleanup
    return () => {
      versorApi.stopPolling();
    };
  }, []);

  return <ExperienceView />;
}
```

## WebSocket Integration

### Connection Setup

```typescript
// src/services/versorWebSocket.ts

import { useExperienceStore } from "../features/experience/store/useExperienceStore";

interface WebSocketMessage {
  type: "state-update" | "transition-complete" | "error";
  data: any;
}

class VersorWebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(token: string) {
    const wsUrl = `wss://api.love.app/v1/versor/stream?token=${token}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log("WebSocket connected");
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      const message: WebSocketMessage = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    this.ws.onclose = () => {
      console.log("WebSocket closed");
      this.attemptReconnect(token);
    };
  }

  private handleMessage(message: WebSocketMessage) {
    switch (message.type) {
      case "state-update":
        this.updateStore(message.data);
        break;

      case "transition-complete":
        console.log("Transition completed:", message.data);
        break;

      case "error":
        console.error("Versor error:", message.data);
        break;
    }
  }

  private updateStore(data: any) {
    const { vac, quaternion } = data;

    useExperienceStore
      .getState()
      .setTarget(
        [vac.valence, vac.arousal, vac.connection],
        [quaternion.w, quaternion.x, quaternion.y, quaternion.z],
      );
  }

  private attemptReconnect(token: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(
      `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`,
    );

    setTimeout(() => {
      this.connect(token);
    }, delay);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
}

export const versorWebSocket = new VersorWebSocketService();
```

### Usage

```typescript
import { versorWebSocket } from './services/versorWebSocket';

function App() {
  useEffect(() => {
    const token = await getAuthToken();
    versorWebSocket.connect(token);

    return () => {
      versorWebSocket.disconnect();
    };
  }, []);

  return <ExperienceView />;
}
```

## Authentication

### JWT Token Management

```typescript
import AsyncStorage from "@react-native-async-storage/async-storage";
import jwtDecode from "jwt-decode";

class AuthService {
  private tokenKey = "@love_auth_token";
  private refreshTokenKey = "@love_refresh_token";

  async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem(this.tokenKey);
  }

  async setToken(token: string) {
    await AsyncStorage.setItem(this.tokenKey, token);
  }

  async refreshToken(): Promise<string> {
    const refreshToken = await AsyncStorage.getItem(this.refreshTokenKey);

    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refreshToken,
    });

    const newToken = response.data.token;
    await this.setToken(newToken);

    return newToken;
  }

  isTokenExpired(token: string): boolean {
    const decoded: any = jwtDecode(token);
    return decoded.exp * 1000 < Date.now();
  }

  async getValidToken(): Promise<string> {
    let token = await this.getToken();

    if (!token || this.isTokenExpired(token)) {
      token = await this.refreshToken();
    }

    return token;
  }
}

export const authService = new AuthService();
```

## Error Handling

### Network Errors

```typescript
import NetInfo from "@react-native-community/netinfo";

class NetworkMonitor {
  private listeners: Array<(isConnected: boolean) => void> = [];

  init() {
    NetInfo.addEventListener((state) => {
      const isConnected = state.isConnected ?? false;
      this.notifyListeners(isConnected);

      if (!isConnected) {
        // Stop polling/disconnect WebSocket
        versorApi.stopPolling();
        versorWebSocket.disconnect();
      } else {
        // Reconnect
        this.reconnect();
      }
    });
  }

  private async reconnect() {
    const token = await authService.getValidToken();
    versorWebSocket.connect(token);
  }

  subscribe(callback: (isConnected: boolean) => void) {
    this.listeners.push(callback);
  }

  private notifyListeners(isConnected: boolean) {
    this.listeners.forEach((listener) => listener(isConnected));
  }
}

export const networkMonitor = new NetworkMonitor();
```

### Retry Logic

```typescript
import { retry } from "axios-retry";

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

retry(axiosInstance, {
  retries: 3,
  retryDelay: (retryCount) => {
    return retryCount * 1000; // Exponential backoff
  },
  retryCondition: (error) => {
    // Retry on network errors or 5xx
    return !error.response || error.response.status >= 500;
  },
});
```

## Caching Strategy

### Local Cache for Offline Support

```typescript
class StateCache {
  private cacheKey = "@love_last_state";

  async save(state: VersorStateResponse) {
    await AsyncStorage.setItem(this.cacheKey, JSON.stringify(state));
  }

  async load(): Promise<VersorStateResponse | null> {
    const cached = await AsyncStorage.getItem(this.cacheKey);
    return cached ? JSON.parse(cached) : null;
  }

  async clear() {
    await AsyncStorage.removeItem(this.cacheKey);
  }
}

export const stateCache = new StateCache();

// Usage: Load cached state on app start
const cachedState = await stateCache.load();
if (cachedState) {
  versorApi.updateStore(cachedState);
}
```

## Mock API for Development

### Local Mock Server

```typescript
// src/services/mockVersorApi.ts

export class MockVersorApi {
  private emotions = [
    { vac: [0.9, 0.7, 0.8], name: "Joy" },
    { vac: [-0.9, -0.1, -1.0], name: "Shame" },
    { vac: [-0.5, 0.8, -0.2], name: "Anger" },
    { vac: [0.5, -0.7, 0.4], name: "Calm" },
  ];

  private currentIndex = 0;

  async getCurrentState(): Promise<VersorStateResponse> {
    const emotion = this.emotions[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.emotions.length;

    return {
      vac: {
        valence: emotion.vac[0],
        arousal: emotion.vac[1],
        connection: emotion.vac[2],
      },
      quaternion: this.vacToQuaternion(emotion.vac),
      metrics: {
        angularDistance: Math.random() * Math.PI,
        angularVelocity: Math.random() * 5,
        elasticity: Math.random(),
      },
    };
  }

  private vacToQuaternion(vac: number[]) {
    const [x, y, z] = vac;
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    const angle = (magnitude / Math.sqrt(3)) * Math.PI;

    const halfAngle = angle / 2;
    const s = Math.sin(halfAngle) / magnitude;

    return {
      w: Math.cos(halfAngle),
      x: x * s,
      y: y * s,
      z: z * s,
    };
  }
}

// Use in development
const api = __DEV__ ? new MockVersorApi() : versorApi;
```

## Testing API Integration

### Unit Tests

```typescript
import { versorApi } from "./versorApi";
import axios from "axios";

jest.mock("axios");

describe("VersorApiService", () => {
  test("fetches current state successfully", async () => {
    const mockResponse = {
      data: {
        vac: { valence: 0.5, arousal: 0.3, connection: 0.7 },
        quaternion: { w: 1, x: 0, y: 0, z: 0 },
      },
    };

    (axios.get as jest.Mock).mockResolvedValue(mockResponse);

    const state = await versorApi.getCurrentState();

    expect(state.vac.valence).toBe(0.5);
  });

  test("handles authentication errors", async () => {
    (axios.get as jest.Mock).mockRejectedValue({
      response: { status: 401 },
    });

    await expect(versorApi.getCurrentState()).rejects.toThrow();
  });
});
```

## Next Steps

Now that you understand API integration:

- **11-development-roadmap.md** - Implementation phases and timeline
- **12-troubleshooting.md** - Common issues and solutions
