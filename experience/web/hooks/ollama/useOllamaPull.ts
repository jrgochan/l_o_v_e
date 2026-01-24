import { useState, useCallback } from "react";
import { logger } from "@/utils/logger";
import { PullProgress, ModelInfo } from "./types";

interface UseOllamaPullOptions {
  localModels: ModelInfo[];
  fetchLocalModels: () => Promise<void>;
  setError: (error: string | null) => void;
}

export function useOllamaPull({ localModels, fetchLocalModels, setError }: UseOllamaPullOptions) {
  const [pulling, setPulling] = useState<Record<string, PullProgress>>({});

  const pullModel = useCallback(
    async (modelName: string) => {
      setError(null);
      try {
        const listenerUrl = process.env.NEXT_PUBLIC_LISTENER_URL || "http://localhost:8002";
        const response = await fetch(`${listenerUrl}/listener/ai/models/pull`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: modelName }),
        });

        if (!response.ok) {
          throw new Error(`Failed to start pull: ${response.statusText}`);
        }

        const { task_id } = await response.json();
        let lastStatus = "";
        let messageCount = 0;

        // Convert http/https to ws/wss
        const wsUrl = listenerUrl.replace(/^http/, "ws");
        const ws = new WebSocket(`${wsUrl}/listener/ai/models/pull/${task_id}`);

        ws.onmessage = (event) => {
          logger.debug("websocket", "Pull progress message received", event.data);
          const progress: PullProgress = JSON.parse(event.data);

          messageCount++;
          lastStatus = progress.status;

          const isModelInstalled = localModels.some((m) => m.name === modelName);

          if (
            progress.status === "unknown" &&
            isModelInstalled &&
            messageCount > 3 &&
            lastStatus === "unknown"
          ) {
            logger.info("websocket", "Model already installed, treating unknown as success");
            const successProgress: PullProgress = {
              ...progress,
              status: "already_installed",
            };

            setPulling((prev) => ({ ...prev, [modelName]: successProgress }));
            fetchLocalModels();
            ws.close();

            setTimeout(() => {
              setPulling((prev) => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { [modelName]: _removed, ...rest } = prev;
                return rest;
              });
            }, 2000);
            return;
          }

          setPulling((prev) => ({ ...prev, [modelName]: progress }));

          if (progress.status === "success") {
            logger.info("websocket", "Pull success! Refreshing models...", { model: modelName });
            fetchLocalModels();
            ws.close();
            setTimeout(() => {
              setPulling((prev) => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { [modelName]: _removed, ...rest } = prev;
                return rest;
              });
            }, 3000);
          } else if (progress.status === "error") {
            logger.error("websocket", "Pull error", progress);
            setError(`Failed to pull ${modelName}`);
            ws.close();
          }
        };

        ws.onerror = () => {
          setError(`WebSocket error during ${modelName} pull`);
          ws.close();
        };

        ws.onclose = () => {
          logger.debug("websocket", `WebSocket closed for ${modelName}`);
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to pull model";
        setError(message);
        logger.error("api", "Error pulling model", err);
      }
    },
    [fetchLocalModels, localModels, setError]
  );

  return { pulling, pullModel };
}
