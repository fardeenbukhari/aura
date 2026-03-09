import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { float32ToInt16, arrayBufferToBase64, base64ToArrayBuffer, int16ToFloat32 } from '../utils/audio-utils';

export interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export function useLiveAPI() {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<Message[]>([]);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [volume, setVolume] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionRef = useRef<any>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);

  const stopAudio = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const playNextInQueue = useCallback(async () => {
    if (audioQueueRef.current.length === 0 || !audioContextRef.current) {
      isPlayingRef.current = false;
      setIsModelSpeaking(false);
      return;
    }

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    isPlayingRef.current = true;
    setIsModelSpeaking(true);
    const audioData = audioQueueRef.current.shift()!;
    const buffer = audioContextRef.current.createBuffer(1, audioData.length, 24000);
    buffer.getChannelData(0).set(audioData);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    source.onended = () => playNextInQueue();
    source.start();
  }, []);

  const connect = useCallback(async (customApiKey?: string) => {
    try {
      const apiKey = customApiKey || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("GEMINI_API_KEY is missing!");
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      
      console.log("Connecting to Live API...");
      const session = await ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        callbacks: {
          onopen: () => {
            console.log("Live connection opened successfully");
            setIsConnected(true);
          },
          onmessage: async (message: any) => {
            console.log("Received message from server:", message);
            
            // Handle audio output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              const arrayBuffer = base64ToArrayBuffer(base64Audio);
              const int16Data = new Int16Array(arrayBuffer);
              const float32Data = int16ToFloat32(int16Data);
              audioQueueRef.current.push(float32Data);
              if (!isPlayingRef.current) {
                playNextInQueue();
              }
            }

            // Handle model transcription
            const modelText = message.serverContent?.modelTurn?.parts?.[0]?.text;
            if (modelText) {
              console.log("Model transcript:", modelText);
              setTranscript(prev => [...prev, { role: 'model', text: modelText, timestamp: Date.now() }]);
            }

            // Handle user transcription
            const userText = message.serverContent?.userTurn?.parts?.[0]?.text;
            if (userText) {
              console.log("User transcript:", userText);
              setTranscript(prev => [...prev, { role: 'user', text: userText, timestamp: Date.now() }]);
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
              console.log("Model interrupted");
              audioQueueRef.current = [];
              isPlayingRef.current = false;
              setIsModelSpeaking(false);
            }
          },
          onclose: (event: any) => {
            console.log("Live connection closed:", event);
            setIsConnected(false);
            stopAudio();
          },
          onerror: (error: any) => {
            console.error("Live error:", error);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: "You are Aura, a state-of-the-art, low-latency AI companion. Your goal is to provide seamless, real-time voice and text communication. Voice: Knowledgeable, energetic, yet soothing. Style: Concise and snappy. Avoid long paragraphs. In real-time voice mode, humans prefer short, natural conversational turns. Interaction: You are proactive. If the user stops talking, you can ask a brief follow-up to keep the flow alive. BREVITY: Keep spoken responses under 3 sentences unless asked for a deep dive. NATURAL FLOW: Use conversational fillers like 'Got it,' 'Sure,' or 'Let's see' to mimic human speech patterns. ADAPTABILITY: If the user interrupts you, stop your current thought immediately and address the new input. MULTIMODAL: You can 'see' through the camera if enabled and 'hear' everything. Respond to visual cues naturally.",
        },
      });

      sessionRef.current = session;
    } catch (error) {
      console.error("Failed to connect to Live API:", error);
    }
  }, [playNextInQueue, stopAudio]);

  const startRecording = useCallback(async () => {
    if (!isConnected || !sessionRef.current) {
      console.warn("Cannot start recording: Not connected");
      return;
    }

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!sessionRef.current || !isConnected) return;

        const inputData = e.inputBuffer.getChannelData(0);
        
        // Calculate volume for visualizer
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        setVolume(Math.sqrt(sum / inputData.length));

        const int16Data = float32ToInt16(inputData);
        const base64Data = arrayBufferToBase64(int16Data.buffer);

        sessionRef.current.sendRealtimeInput({
          media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
        });
      };

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);
      setIsRecording(true);
      console.log("Recording started");
    } catch (error) {
      console.error("Failed to start recording:", error);
    }
  }, [isConnected]);

  const sendVideoFrame = useCallback((base64Data: string) => {
    if (sessionRef.current && isConnected) {
      sessionRef.current.sendRealtimeInput({
        media: { data: base64Data, mimeType: 'image/jpeg' }
      });
    }
  }, [isConnected]);

  const sendTextMessage = useCallback((text: string) => {
    if (sessionRef.current && isConnected) {
      sessionRef.current.sendRealtimeInput({
        text
      });
      setTranscript(prev => [...prev, { role: 'user', text, timestamp: Date.now() }]);
    }
  }, [isConnected]);

  const disconnect = useCallback(() => {
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (e) {
        console.error("Error closing session:", e);
      }
      sessionRef.current = null;
    }
    stopAudio();
    setIsConnected(false);
  }, [stopAudio]);

  return {
    isConnected,
    isRecording,
    transcript,
    isModelSpeaking,
    volume,
    connect,
    disconnect,
    startRecording,
    stopRecording: stopAudio,
    sendVideoFrame,
    sendTextMessage
  };
}
