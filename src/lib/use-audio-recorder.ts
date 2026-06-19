"use client";

import { useRef, useState, useCallback, useEffect } from "react";

/**
 * Real microphone recording hook using MediaRecorder + Web Audio API.
 *
 * - Captures actual audio from the microphone
 * - Extracts a real waveform (48 bars) from the recorded audio
 * - Returns the audio as a Blob (can be uploaded)
 * - Tracks recording duration in seconds
 *
 * The waveform is extracted by decoding the recorded audio buffer and
 * sampling amplitude across 48 segments.
 */

const WAVEFORM_BARS = 48;

export function useAudioRecorder() {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0); // 0..1 live mic level

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  const stopAll = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setLevel(0);
  }, []);

  // cleanup on unmount
  useEffect(() => {
    return () => stopAll();
  }, [stopAll]);

  const start = useCallback(async () => {
    setError(null);
    setAudioBlob(null);
    setWaveform([]);
    setSeconds(0);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up AudioContext for live level monitoring
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Live level monitoring
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setLevel(Math.min(1, avg / 80));
        rafRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      // Set up MediaRecorder
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);

        // Extract real waveform from the recorded audio
        try {
          const arrayBuffer = await blob.arrayBuffer();
          const decodeCtx = audioContextRef.current ?? new AudioContext();
          const audioBuffer = await decodeCtx.decodeAudioData(arrayBuffer);
          const channel = audioBuffer.getChannelData(0);
          const segmentSize = Math.floor(channel.length / WAVEFORM_BARS);
          const bars: number[] = [];
          for (let i = 0; i < WAVEFORM_BARS; i++) {
            const start = i * segmentSize;
            const end = start + segmentSize;
            let max = 0;
            for (let j = start; j < end; j++) {
              const abs = Math.abs(channel[j]);
              if (abs > max) max = abs;
            }
            bars.push(Math.max(0.08, Math.min(1, max * 1.5)));
          }
          setWaveform(bars);
        } catch {
          // If decode fails, fall back to a flat waveform
          setWaveform(Array.from({ length: WAVEFORM_BARS }, () => 0.4));
        }

        stopAll();
      };

      mr.start();
      startTimeRef.current = Date.now();
      setRecording(true);

      // Timer
      timerRef.current = setInterval(() => {
        setSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 200);
    } catch (err) {
      console.error("[useAudioRecorder]", err);
      setError(
        err instanceof Error
          ? err.name === "NotAllowedError"
            ? "Microphone permission denied. Please allow mic access in your browser settings."
            : err.message
          : "Failed to access microphone"
      );
      stopAll();
    }
  }, [stopAll]);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    // stopAll is called in mr.onstop after the blob is processed
  }, []);

  const reset = useCallback(() => {
    setAudioBlob(null);
    setWaveform([]);
    setSeconds(0);
    setLevel(0);
    stopAll();
  }, [stopAll]);

  return {
    recording,
    seconds,
    audioBlob,
    waveform,
    error,
    level,
    start,
    stop,
    reset,
  };
}
