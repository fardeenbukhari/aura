import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  MessageSquare, 
  Power, 
  PowerOff,
  Camera,
  X,
  Send,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useLiveAPI } from './hooks/useLiveAPI';

export default function App() {
  const {
    isConnected,
    isRecording,
    transcript,
    isModelSpeaking,
    volume,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    sendVideoFrame
  } = useLiveAPI();

  const [showChat, setShowChat] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Check API Key
  useEffect(() => {
    if (!process.env.GEMINI_API_KEY) {
      setApiKeyMissing(true);
    }
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Handle Camera Stream
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showCamera && isConnected) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          
          // Send frames to Gemini
          interval = setInterval(() => {
            if (videoRef.current && canvasRef.current) {
              const context = canvasRef.current.getContext('2d');
              if (context) {
                context.drawImage(videoRef.current, 0, 0, 320, 240);
                const base64 = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
                sendVideoFrame(base64);
              }
            }
          }, 500); // Send every 500ms
        })
        .catch(err => console.error("Camera error:", err));
    } else {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        videoRef.current.srcObject = null;
      }
    }
    return () => clearInterval(interval);
  }, [showCamera, isConnected, sendVideoFrame]);

  const toggleConnection = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect();
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-emerald-500/30 overflow-hidden flex flex-col">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 p-6 flex justify-between items-center border-b border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.5)]">
            <div className="w-4 h-4 rounded-full bg-white animate-pulse" />
          </div>
          <h1 className="text-xl font-medium tracking-tight">AURA</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold border ${isConnected ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10' : 'border-white/10 text-white/40'}`}>
            {isConnected ? 'Online' : 'Offline'}
          </div>
          <button 
            onClick={toggleConnection}
            className={`p-2 rounded-full transition-all duration-300 ${isConnected ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'}`}
          >
            {isConnected ? <PowerOff size={20} /> : <Power size={20} />}
          </button>
        </div>
      </header>

      {/* API Key Warning */}
      <AnimatePresence>
        {apiKeyMissing && (
          <motion.div 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3"
          >
            <X size={20} className="cursor-pointer" onClick={() => setApiKeyMissing(false)} />
            <p className="text-sm font-medium">GEMINI_API_KEY is missing. Please set it in the Secrets panel.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6">
        {/* The Orb */}
        <div className="relative w-64 h-64 md:w-96 md:h-96 flex items-center justify-center">
          <AnimatePresence>
            {isConnected && (
              <>
                {/* Outer Glow */}
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ 
                    scale: isModelSpeaking ? [1, 1.1, 1] : 1,
                    opacity: isModelSpeaking ? 0.6 : 0.3,
                  }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="absolute inset-0 rounded-full bg-emerald-500/20 blur-3xl"
                />
                
                {/* Visualizer Rings */}
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{ 
                      scale: [1, 1 + (volume * 2) + (i * 0.1), 1],
                      opacity: [0.5, 0.2, 0.5],
                      rotate: [0, 180, 360]
                    }}
                    transition={{ 
                      duration: 2 + i, 
                      repeat: Infinity, 
                      ease: "easeInOut" 
                    }}
                    className="absolute inset-0 border border-emerald-500/20 rounded-full"
                  />
                ))}

                {/* Core Orb */}
                <motion.div 
                  className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-gradient-to-br from-emerald-400 to-blue-600 shadow-[0_0_60px_rgba(16,185,129,0.4)] flex items-center justify-center overflow-hidden"
                  animate={{
                    scale: isRecording ? [1, 1.05, 1] : 1,
                    boxShadow: isModelSpeaking 
                      ? "0 0 80px rgba(16,185,129,0.6)" 
                      : "0 0 40px rgba(16,185,129,0.2)"
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.2),transparent)]" />
                  {isModelSpeaking && (
                    <motion.div 
                      animate={{ 
                        y: [0, -10, 0],
                        opacity: [0.5, 1, 0.5]
                      }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="text-white/80"
                    >
                      <Volume2 size={48} />
                    </motion.div>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {!isConnected && (
            <div className="text-center space-y-4">
              <p className="text-white/40 text-sm tracking-widest uppercase">Awaiting Connection</p>
              <button 
                onClick={connect}
                className="px-8 py-3 bg-white text-black rounded-full font-bold hover:bg-emerald-400 transition-colors"
              >
                Initialize Aura
              </button>
            </div>
          )}
        </div>

        {/* Status Text */}
        <div className="mt-8 text-center">
          <p className="text-white/60 text-sm font-light tracking-wide">
            {isConnected ? (
              isRecording ? (
                isModelSpeaking ? "Aura is speaking..." : "Listening..."
              ) : "Connected. Tap mic to start."
            ) : "System Offline"}
          </p>
        </div>

        {/* Camera Preview */}
        <AnimatePresence>
          {showCamera && (
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="absolute bottom-32 right-8 w-64 aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl z-20"
            >
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover grayscale brightness-125 contrast-125"
              />
              <canvas ref={canvasRef} width={320} height={240} className="hidden" />
              <button 
                onClick={() => setShowCamera(false)}
                className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/80"
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Chat Sidebar */}
      <AnimatePresence>
        {showChat && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed inset-y-0 right-0 w-full md:w-96 bg-[#0a0a0a] border-l border-white/5 z-30 flex flex-col"
          >
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h2 className="font-medium">Transcript</h2>
              <button onClick={() => setShowChat(false)} className="text-white/40 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {transcript.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] uppercase tracking-widest text-white/20 mb-1">
                    {msg.role === 'user' ? 'You' : 'Aura'}
                  </span>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-emerald-500/10 text-emerald-100 rounded-tr-none' : 'bg-white/5 text-white/80 rounded-tl-none'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <footer className="relative z-10 p-8 flex justify-center items-center gap-6">
        <button 
          onClick={() => setShowChat(!showChat)}
          className={`p-4 rounded-2xl transition-all ${showChat ? 'bg-emerald-500 text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
        >
          <MessageSquare size={24} />
        </button>

        <button 
          disabled={!isConnected}
          onClick={toggleRecording}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl disabled:opacity-20 disabled:cursor-not-allowed ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-emerald-500 hover:scale-110'}`}
        >
          {isRecording ? <MicOff size={32} className="text-white" /> : <Mic size={32} className="text-black" />}
        </button>

        <button 
          disabled={!isConnected}
          onClick={() => setShowCamera(!showCamera)}
          className={`p-4 rounded-2xl transition-all disabled:opacity-20 disabled:cursor-not-allowed ${showCamera ? 'bg-emerald-500 text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
        >
          {showCamera ? <Video size={24} /> : <VideoOff size={24} />}
        </button>
      </footer>

      {/* Status Bar */}
      <div className="relative z-10 px-8 py-4 flex justify-between items-center text-[10px] uppercase tracking-[0.2em] text-white/20 border-t border-white/5">
        <div>System: Active</div>
        <div>Latency: Low</div>
        <div>Version: 1.0.0-AURA</div>
      </div>
    </div>
  );
}
