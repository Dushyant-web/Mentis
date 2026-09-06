"use client";

import { useState, useCallback, useRef } from "react";

/**
 * Web Speech API hook for text-to-speech and speech recognition
 * Used in dictation and multisensory exercises
 */
export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  /**
   * Speak text aloud using Web Speech API
   */
  const speak = useCallback((text: string, rate = 0.9, pitch = 1) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.lang = "en-US";

    // Try to use a natural voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.includes("Google") || v.name.includes("Samantha") || v.name.includes("Daniel"));
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  /**
   * Listen for speech using Web Speech Recognition API
   */
  const listen = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined") {
        reject("Not in browser");
        return;
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        reject("Speech recognition not supported");
        return;
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => setListening(true);
      recognition.onresult = (event: any) => {
        const result = event.results[0][0].transcript;
        setTranscript(result);
        setListening(false);
        resolve(result);
      };
      recognition.onerror = (event: any) => {
        setListening(false);
        reject(event.error);
      };
      recognition.onend = () => setListening(false);

      recognition.start();
    });
  }, []);

  /**
   * Stop listening
   */
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
    }
  }, []);

  /**
   * Stop speaking
   */
  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  }, []);

  return {
    speak,
    listen,
    stopListening,
    stopSpeaking,
    speaking,
    listening,
    transcript,
    isSpeechSupported: typeof window !== "undefined" && "speechSynthesis" in window,
    isRecognitionSupported: typeof window !== "undefined" && 
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition),
  };
}
