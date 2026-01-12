import { logger } from "@/utils/logger";

/**
 * Request microphone access with standard configuration
 */
export const getAudioStream = async (): Promise<MediaStream> => {
  try {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    return mediaStream;
  } catch (error) {
    logger.error("hooks", "Failed to access microphone", error);
    throw error;
  }
};

/**
 * Process an array of audio chunks into a Blob and base64 string
 */
export const processAudioBlob = async (
  chunks: Blob[],
  mimeType: string = "audio/webm"
): Promise<{ blob: Blob; url: string; base64: string }> => {
  return new Promise((resolve, reject) => {
    try {
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        const base64Audio = base64data.split(",")[1];
        resolve({ blob, url, base64: base64Audio });
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(blob);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Stop all tracks on a media stream
 */
export const stopStreamTracks = (stream: MediaStream | null) => {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
};
