import { useRef, useState, useEffect } from "react";

export function useVoiceVisualizer(stream: MediaStream | null) {
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!stream) {
      // Cleanup if stream disappears
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => { });
        audioContextRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      setTimeout(() => setAudioLevel(0), 0);
      return;
    }

    // Init context
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);

    analyser.fftSize = 256;
    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    const monitor = () => {
      const dataArray = new Uint8Array(analyserRef.current!.frequencyBinCount);
      analyserRef.current!.getByteFrequencyData(dataArray);

      // Normalize
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setAudioLevel(average / 255);

      animationFrameRef.current = requestAnimationFrame(monitor);
    };

    monitor();

    return () => {
      /* istanbul ignore next */
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      /* istanbul ignore next */
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => { });
      }
    };
  }, [stream]);

  return { audioLevel };
}
