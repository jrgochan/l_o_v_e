import { useCallback } from "react";
import { useExperienceStore } from "@/stores/useExperienceStore";

interface UseSessionActionsDependencies {
  close: () => void;
}

export function useSessionActions({ close }: UseSessionActionsDependencies) {
  const executeSessionCommand = useCallback(
    (command: string) => {
      const experienceStore = useExperienceStore.getState();
      const { activeSession } = experienceStore;
      const commandLower = command.toLowerCase();

      if (commandLower === "/session start" || commandLower === "/session") {
        if (activeSession && activeSession.status === "active") return;
        experienceStore.startSession();
        close();
        return;
      }
      if (commandLower === "/session end") {
        if (!activeSession) return;
        if (window.confirm("End this session?")) {
          experienceStore.endSession();
        }
        close();
        return;
      }
      if (commandLower === "/session pause") {
        if (activeSession?.status === "active") {
          experienceStore.pauseSession();
          close();
        }
        return;
      }
      if (commandLower === "/session resume") {
        if (activeSession?.status === "paused") {
          experienceStore.resumeSession();
          close();
        }
        return;
      }
      if (commandLower === "/session notes") {
        if (!activeSession) return;
        const note = window.prompt("Add a note:");
        if (note?.trim()) experienceStore.addSessionNote(note.trim());
        close();
        return;
      }
    },
    [close]
  );
  return { executeSessionCommand };
}
