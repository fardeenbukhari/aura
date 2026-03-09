import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  MicOff, 
  Camera,
  X,
  Settings,
  Zap,
  Key,
  ExternalLink,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { useLiveAPI } from './hooks/useLiveAPI';

export default function App() {
  const [apiKey, setApiKey] = useState<string>(localStorage.getItem('gemini_api_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);

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
    sendVideoFrame,
    sendTextMessage
  } = useLiveAPI();

  const [showCamera, setShowCamera] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // API Key Persistence
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('gemini_api_key', apiKey);
    } else {
      localStorage.removeItem('gemini_api_key');
    }
  }, [apiKey]);

  // Check API Key
  useEffect(() => {
    if (!apiKey && !process.env.GEMINI_API_KEY) {
      setApiKeyMissing(true);
    } else {
      setApiKeyMissing(false);
    }
  }, [apiKey]);

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
          
          interval = setInterval(() => {
            if (videoRef.current && canvasRef.current) {
              const context = canvasRef.current.getContext('2d');
              if (context) {
                context.drawImage(videoRef.current, 0, 0, 320, 240);
                const base64 = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
                sendVideoFrame(base64);
              }
            }
          }, 500);
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
      connect(apiKey);
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
    <div className="h-screen bg-[#050505] text-white font-sans selection:bg-cyan-500/30 overflow-hidden flex flex-col">
      {/* Header */}
      <header className="relative z-10 p-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Zap size={18} className="text-white fill-white" />
          </div>
          <div className="flex items-baseline gap-1">
            <h1 className="text-xl font-bold tracking-tighter">AURA</h1>
            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Live</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowKeyInput(!showKeyInput)}
              className={`p-2 rounded-full transition-all ${apiKey ? 'text-emerald-400 bg-emerald-500/10' : 'text-white/40 hover:bg-white/5'}`}
              title="API Settings"
            >
              <Key size={18} />
            </button>
            
            <button 
              onClick={toggleConnection}
              className={`px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-bold flex items-center gap-2 border transition-all ${
                isConnected 
                  ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' 
                  : 'border-white/10 text-white/40 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-white/20'}`} />
              {isConnected ? 'Online' : 'Offline'}
            </button>
          </div>
        </div>
      </header>

      {/* API Key Modal/Input */}
      <AnimatePresence>
        {showKeyInput && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
              
              <button 
                onClick={() => setShowKeyInput(false)}
                className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <Key size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Gemini API Key</h2>
                  <p className="text-xs text-white/40">Required for real-time AI companion</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <input 
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API key..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-white/20"
                  />
                  {apiKey ? (
                    <ShieldCheck size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500" />
                  ) : (
                    <ShieldAlert size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-500" />
                  )}
                </div>

                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                      <ExternalLink size={14} className="text-white/40 group-hover:text-white transition-colors" />
                    </div>
                    <span className="text-xs font-medium">Get your key from Google AI Studio</span>
                  </div>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-blue-400">Open</div>
                </a>

                <button 
                  onClick={() => setShowKeyInput(false)}
                  className="w-full py-3 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 transition-all"
                >
                  Save & Close
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* API Key Warning */}
      <AnimatePresence>
        {apiKeyMissing && (
          <motion.div 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-amber-500/90 backdrop-blur-md text-black px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10"
          >
            <ShieldAlert size={20} />
            <p className="text-sm font-bold">API Key Required</p>
            <button 
              onClick={() => setShowKeyInput(true)}
              className="px-3 py-1 bg-black text-white rounded-lg text-[10px] font-bold uppercase tracking-widest"
            >
              Set Key
            </button>
            <X size={16} className="cursor-pointer opacity-50 hover:opacity-100" onClick={() => setApiKeyMissing(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex relative overflow-hidden">
        {/* Main Content (Orb Area) */}
        <main className="flex-1 flex flex-col items-center justify-center p-6 relative">
          {/* The Orb System */}
          <div className="relative w-80 h-80 md:w-[500px] md:h-[500px] flex items-center justify-center">
            {/* Concentric Rings */}
            {[...Array(3)].map((_, i) => (
              <div 
                key={i}
                className="absolute border border-white/5 rounded-full"
                style={{ 
                  width: `${100 - i * 15}%`, 
                  height: `${100 - i * 15}%` 
                }}
              />
            ))}

            {/* Orbiting Dots */}
            <AnimatePresence>
              {isConnected && (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="absolute w-full h-full pointer-events-none"
                  >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
                  </motion.div>
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                    className="absolute w-[85%] h-[85%] pointer-events-none"
                  >
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* Central Orb */}
            <div className="relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center bg-transparent">
              <AnimatePresence>
                {isConnected ? (
                  <div className="relative w-full h-full flex items-center justify-center bg-transparent">
                    {/* Glow Layer */}
                    <motion.div 
                      animate={{ 
                        scale: isModelSpeaking ? [1, 1.15, 1] : 1,
                        opacity: isModelSpeaking ? 0.5 : 0.2,
                      }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute inset-0 rounded-full bg-blue-500/30 blur-3xl pointer-events-none"
                    />
                    
                    {/* The Orb Itself */}
                    <motion.div 
                      className="relative w-full h-full rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 shadow-[0_0_80px_rgba(59,130,246,0.3)] flex items-center justify-center overflow-hidden z-10"
                      animate={{
                        scale: isRecording ? [1, 1.02, 1] : 1,
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.3),transparent)] pointer-events-none" />
                      {/* Inner Core Dot */}
                      <div className="w-3 h-3 rounded-full bg-white/90 blur-[1px] shadow-[0_0_10px_white]" />
                    </motion.div>
                  </div>
                ) : (
                  <div className="w-full h-full rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-col gap-4 backdrop-blur-sm">
                    <Zap size={48} className="text-white/10" />
                    <button 
                      onClick={() => {
                        if (!apiKey && !process.env.GEMINI_API_KEY) {
                          setShowKeyInput(true);
                        } else {
                          connect(apiKey);
                        }
                      }}
                      className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all border border-white/5"
                    >
                      Connect
                    </button>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Status Text */}
          <div className="mt-12 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/5 backdrop-blur-sm">
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? (isRecording ? 'bg-cyan-400 animate-pulse' : 'bg-white/40') : 'bg-white/10'}`} />
              <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/60">
                {isConnected ? (isRecording ? (isModelSpeaking ? 'Aura Speaking' : 'Listening') : 'Ready') : 'Disconnected'}
              </span>
            </div>
          </div>
        </main>

        {/* Right Sidebar (Transcript) */}
        <aside className="w-80 md:w-96 p-6 flex flex-col border-l border-white/5 bg-[#080808]/80 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/60">Transcript</h2>
          </div>
          
          <div className="flex-1 bg-[#0a0a0a]/50 rounded-2xl border border-white/5 p-6 overflow-y-auto space-y-8 scrollbar-hide shadow-inner">
            {transcript.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-xs text-white/20 italic tracking-wide">Awaiting input...</p>
              </div>
            ) : (
              transcript.map((msg, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] uppercase tracking-[0.2em] font-black ${msg.role === 'user' ? 'text-cyan-400' : 'text-purple-500'}`}>
                      {msg.role === 'user' ? 'User' : 'Aura'}
                    </span>
                  </div>
                  <p className="text-sm text-white/80 leading-relaxed font-light tracking-wide">
                    {msg.text}
                  </p>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>
        </aside>
      </div>

      {/* Bottom Controls */}
      <div className="p-8 flex justify-center">
        <div className="bg-[#0a0a0a] border border-white/10 p-2 rounded-2xl flex items-center gap-2 shadow-2xl">
          <button 
            onClick={() => setShowCamera(!showCamera)}
            className={`p-4 rounded-xl transition-all ${showCamera ? 'bg-blue-500/20 text-blue-400' : 'text-white/40 hover:bg-white/5'}`}
          >
            <Camera size={20} />
          </button>
          
          <button 
            onClick={toggleRecording}
            disabled={!isConnected}
            className={`w-16 h-16 rounded-xl flex items-center justify-center transition-all disabled:opacity-20 ${
              isRecording 
                ? 'bg-blue-500 text-white shadow-[0_0_30px_rgba(59,130,246,0.5)]' 
                : 'bg-white/5 text-white/40 hover:bg-white/10'
            }`}
          >
            {isRecording ? <Mic size={24} /> : <MicOff size={24} />}
          </button>

          <button className="p-4 rounded-xl text-white/40 hover:bg-white/5 transition-all">
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Camera Preview Overlay */}
      <AnimatePresence>
        {showCamera && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-32 left-8 w-64 aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl z-50"
          >
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover grayscale brightness-110"
            />
            <canvas ref={canvasRef} width={320} height={240} className="hidden" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
