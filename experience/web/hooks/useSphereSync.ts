/**
 * Sphere Synchronization Hook
 *
 * Enables real-time sync between admin/atlas (broadcaster) and main page (listener).
 * Refactored to compose Transport, Sender, and Receiver hooks.
 */

import { SphereStateMessage } from "./sync/types";
import { useSyncTransport } from "./sync/useSyncTransport";
import { useSphereSender } from "./sync/useSphereSender";
import { useSphereReceiver } from "./sync/useSphereReceiver";

interface UseSphereSyncOptions {
  mode: "broadcaster" | "listener";
  onSync?: (message: SphereStateMessage) => void;
  onStale?: () => void;
}

export function useSphereSync({ mode, onSync, onStale }: UseSphereSyncOptions) {
  // 1. Setup Receiver logic first (so we have the handler)
  // We need to pass the handler to the transport.
  // But wait, the transport receives raw messages. Receiver processes them.
  // We need a stable callback reference for Transport.

  // The structure here is tricky because Transport calls Receiver, but Receiver needs state.
  // Let's instantiate Receiver helper *functions* or just the logic?
  // `useSphereReceiver` returns `handleMessage`.

  // Circular dependency: Transport needs onMessage. Receiver provides handleMessage.
  // But Receiver needs lastMessageTime from Transport?
  // Actually, Receiver handles logic. Transport handles "Hearing".

  // Let's create a shim.
  // We need lastMessageTime from Transport to pass to Receiver for stale check?
  // Or Receiver updates its own timestamp based on calls? Yes, handled inside.

  const { handleMessage, lastUpdate } = useSphereReceiver(mode, 0, onSync, onStale);

  const { sendMessage, isConnected, lastMessageTime } = useSyncTransport({
    mode,
    onMessage: handleMessage,
  });

  // Sender Logic needs the sendMessage function
  const { broadcast } = useSphereSender(mode, sendMessage);

  return {
    broadcast,
    lastMessage: lastUpdate || lastMessageTime, // Prefer receiver state
    isConnected,
  };
}
