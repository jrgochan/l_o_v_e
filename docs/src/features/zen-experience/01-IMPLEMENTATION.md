# Zen Experience - Implementation Guide

**Document:** 01-IMPLEMENTATION.md
**Status:** Planning Document
**Last Updated:** December 7, 2025

---

## Implementation Phases

### Phase 1: Core Synchronization (2 hours)

#### Step 1.1: Create useSphereSync Hook

**File:** `experience/web/hooks/useSphereSync.ts`

```typescript
/**
 * Sphere Synchronization Hook
 *
 * Enables real-time sync between admin/atlas (broadcaster) and main page (listener)
 * using BroadcastChannel API for local cross-tab communication.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useExperienceStore } from '@/stores/useExperienceStore';
import { useAtlasAdminStore } from '@/stores/useAtlasAdminStore';
import { logger } from '@/utils/logger';

const CHANNEL_NAME = 'love-sphere-sync';
const HEARTBEAT_INTERVAL = 5000; // 5 seconds

interface SphereStateMessage {
  type: 'sphere_update' | 'selection_update' | 'path_update' | 'heartbeat';
  vac?: [number, number, number];
  quaternion?: [number, number, number, number];
  selectedEmotionIds?: string[];
  path?: any;
  timestamp: number;
}

interface UseSphereSync Options {
  mode: 'broadcaster' | 'listener';
  onSync?: (message: SphereStateMessage) => void;
}

export function useSphereSync({ mode, onSync }: UseSphereSync Options) {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageRef = useRef<number>(0);

  // Broadcaster: Admin/Atlas side
  const broadcastSphereState = useCallback(() => {
    if (!channelRef.current) return;

    const currentVAC = useExperienceStore.getState().currentVAC;
    const selectedIds = useAtlasAdminStore.getState().selectedEmotionIds;
    const transitionPath = useAtlasAdminStore.getState().computedPaths;

    const message: SphereStateMessage = {
      type: 'sphere_update',
      vac: currentVAC,
      selectedEmotionIds: Array.from(selectedIds),
      timestamp: Date.now()
    };

    channelRef.current.postMessage(message);
    logger.debug('sync', 'Broadcasted sphere state', message);
  }, []);

  // Listener: Zen viewer side
  const handleMessage = useCallback((event: MessageEvent<SphereStateMessage>) => {
    const message = event.data;
    lastMessageRef.current = message.timestamp;

    if (message.type === 'sphere_update' && message.vac) {
      useExperienceStore.getState().setTargetVAC(message.vac);
      logger.debug('sync', 'Received sphere update', message.vac);
    }

    if (message.type === 'path_update' && message.path) {
      useExperienceStore.getState().setTransitionPath(message.path);
    }

    onSync?.(message);
  }, [onSync]);

  // Setup channel
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      channelRef.current = new BroadcastChannel(CHANNEL_NAME);
      logger.info('sync', `Sphere sync ${mode} initialized`);

      if (mode === 'listener') {
        channelRef.current.onmessage = handleMessage;
      }

      if (mode === 'broadcaster') {
        // Send heartbeat
        heartbeatRef.current = setInterval(() => {
          channelRef.current?.postMessage({
            type: 'heartbeat',
            timestamp: Date.now()
          });
        }, HEARTBEAT_INTERVAL);
      }
    } catch (error) {
      logger.error('sync', 'Failed to initialize BroadcastChannel', error);
    }

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      channelRef.current?.close();
    };
  }, [mode, handleMessage]);

  return {
    broadcast: broadcastSphereState,
    lastMessage: lastMessageRef.current,
    isConnected: !!channelRef.current
  };
}
```

#### Step 1.2: Add Broadcaster to Admin Page

**File:** `experience/web/app/admin/atlas/page.tsx`

Add near top of component:

```typescript
// Sync sphere state to zen viewer
const { broadcast } = useSphereSync({ mode: 'broadcaster' });

// Broadcast whenever selection or VAC changes
useEffect(() => {
  broadcast();
}, [selectedEmotionIds, currentVAC, transitionPath]);
```

#### Step 1.3: Add Listener to Main Page

**File:** `experience/web/app/page.tsx`

Add near top:

```typescript
const [lastSync, setLastSync] = useState<number>(0);

useSphereSync({
  mode: 'listener',
  onSync: (message) => setLastSync(message.timestamp)
});
```

---

### Phase 2: Zen UI (1 hour)

#### Step 2.1: Create ZenSessionIndicator

**File:** `experience/web/components/ZenSessionIndicator.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';

interface Props {
  lastSync: number;
  visible: boolean;
}

export function ZenSessionIndicator({ lastSync, visible }: Props) {
  const [timeSinceSync, setTimeSinceSync] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeSinceSync(Math.floor((Date.now() - lastSync) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastSync]);

  if (!visible) return null;

  const isStale = timeSinceSync > 10;

  return (
    <div className={`
      absolute top-4 left-4
      px-3 py-1.5 rounded-full text-xs
      backdrop-blur-md transition-all duration-300
      ${isStale
        ? 'bg-orange-500/30 border border-orange-400 text-orange-200'
        : 'bg-cyan-500/20 border border-cyan-400 text-cyan-200'
      }
    `}>
      {timeSinceSync === 0
        ? 'Following Admin Session'
        : isStale
        ? `No updates for ${timeSinceSync}s`
        : `Updated ${timeSinceSync}s ago`
      }
    </div>
  );
}
```

#### Step 2.2: Simplify Main Page Layout

Strip down to essentials:

- Remove sidebar completely
- Remove header overlay
- Keep just Scene + SessionIndicator + minimal Settings

```tsx
export default function ZenExperience() {
  const [showIndicator, setShowIndicator] = useState(true);
  const [lastSync, setLastSync] = useState(Date.now());

  useSphereSync({
    mode: 'listener',
    onSync: (msg) => setLastSync(msg.timestamp)
  });

  // Expose indicator toggle for keyboard shortcut
  useEffect(() => {
    (window as any).toggleZenIndicator = () => setShowIndicator(p => !p);
    return () => delete (window as any).toggleZenIndicator;
  }, []);

  return (
    <div className="w-screen h-screen bg-black relative">
      <Scene />

      <ZenSessionIndicator lastSync={lastSync} visible={showIndicator} />

      {/* Minimal settings - top right corner */}
      <div className="absolute top-4 right-4">
        <Settings />
      </div>
    </div>
  );
}
```

---

### Phase 3: Enhanced Synchronization (1 hour)

#### Step 3.1: Expand Message Types

Add path synchronization:

```typescript
// In broadcaster (admin):
useEffect(() => {
  if (transitionPath && showPath) {
    channelRef.current?.postMessage({
      type: 'path_update',
      path: transitionPath,
      timestamp: Date.now()
    });
  }
}, [transitionPath, showPath]);

// In listener (zen):
if (message.type === 'path_update' && message.path) {
  useExperienceStore.getState().setTransitionPath(message.path);
  useExperienceStore.getState().setShowPath(true);
}
```

#### Step 3.2: Add Stale Detection

```typescript
const STALE_THRESHOLD = 10000; // 10 seconds

useEffect(() => {
  const checkStale = setInterval(() => {
    const elapsed = Date.now() - lastMessageRef.current;
    if (elapsed > STALE_THRESHOLD) {
      logger.warn('sync', 'No updates from admin for 10s');
      // Optionally: revert to neutral state
    }
  }, 5000);

  return () => clearInterval(checkStale);
}, []);
```

---

### Phase 4: Keyboard Shortcuts (30 min)

#### Add to useKeyboardShortcuts.ts

```typescript
case 'i':
  // Toggle zen indicator
  if (!e.ctrlKey && !e.metaKey) {
    if (typeof (window as any).toggleZenIndicator === 'function') {
      (window as any).toggleZenIndicator();
      logger.info('user-interaction', 'Toggled session indicator');
    }
  }
  break;
```

---

## Testing Checklist

### Basic Functionality

- [ ] Open `/admin/atlas` in one tab
- [ ] Open `/` in another tab
- [ ] Select emotion in admin → sphere changes on zen page
- [ ] Compute path in admin → path appears on zen page
- [ ] Close admin tab → zen page shows "waiting" state
- [ ] Reopen admin → zen page reconnects

### UI/UX

- [ ] Zen page has no clutter (just sphere)
- [ ] Session indicator is subtle but readable
- [ ] Settings button works (top-right)
- [ ] Axis labels toggle with 'A' key
- [ ] Indicator toggles with 'I' key

### Performance

- [ ] Sphere updates smoothly (<100ms latency)
- [ ] No jank when admin makes rapid changes
- [ ] Zen page uses minimal resources
- [ ] Works with sphere at various zoom levels

### Error Handling

- [ ] Graceful fallback if BroadcastChannel unsupported
- [ ] Clear messaging when no admin session
- [ ] Reconnection after admin page reload
- [ ] No crashes if malformed messages

---

## Troubleshooting

### Sphere Not Updating

**Check:**

1. Both tabs in same browser (BroadcastChannel is browser-local)
2. Console for sync messages
3. useSphereSync actually called in both pages

### Indicator Shows "Waiting"

**Likely Cause:** Admin page not broadcasting
**Fix:** Ensure broadcast() called on state changes

### Performance Issues

**Likely Cause:** Too frequent broadcasts
**Fix:** Debounce broadcasts to max 30fps

---

## Migration to Network Sync (Future)

### When to Migrate

- Need multi-device support
- Production deployment
- Multiple simultaneous viewers

### Changes Required

1. Replace BroadcastChannel with WebSocket client
2. Backend session rooms in Observer
3. Session discovery/selection UI
4. Auth/permissions for viewer access

### Backwards Compatibility

Keep BroadcastChannel as fallback for local development.

---

## Files to Create

### Required

- ✅ `hooks/useSphereSync.ts` - Core sync logic
- ✅ `components/ZenSessionIndicator.tsx` - Session badge

### Modified

- ✅ `app/page.tsx` - Zen viewer layout
- ✅ `app/admin/atlas/page.tsx` - Add broadcaster
- ✅ `stores/useExperienceStore.ts` - External update API
- ✅ `hooks/useKeyboardShortcuts.ts` - Add 'I' key

---

**Ready for implementation in next session!** 🚀
