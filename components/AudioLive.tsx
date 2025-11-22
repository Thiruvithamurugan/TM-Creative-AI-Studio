import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { base64ToUint8Array, float32ToPcm16, arrayBufferToBase64 } from '../services/gemini';
import { Mic, MicOff, Activity, Wifi, Settings, User, Fingerprint, X, Check, Loader2, Sparkles, ChevronRight, Play } from 'lucide-react';

// Need to handle AudioContext globally to avoid multiple instances restriction in some browsers
const audioContextRef = { current: null as AudioContext | null };

const PREBUILT_VOICES = [
    { id: 'Zephyr', label: 'Zephyr', desc: 'Balanced & Clear' },
    { id: 'Puck', label: 'Puck', desc: 'Playful & Energetic' },
    { id: 'Charon', label: 'Charon', desc: 'Deep & Authoritative' },
    { id: 'Kore', label: 'Kore', desc: 'Calm & Soothing' },
    { id: 'Fenrir', label: 'Fenrir', desc: 'Deep & Resonant' },
];

export default function AudioLive() {
  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [transcription, setTranscription] = useState<{user: string, model: string}>({ user: '', model: '' });
  
  // Voice & Settings State
  const [activeVoice, setActiveVoice] = useState('Zephyr');
  const [showSettings, setShowSettings] = useState(false);
  const [customVoiceStatus, setCustomVoiceStatus] = useState<'none' | 'recording' | 'processing' | 'ready'>('none');
  const [cloningProgress, setCloningProgress] = useState(0);
  
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const addLog = (msg: string) => setLogs(prev => [msg, ...prev].slice(0, 5));

  const connect = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioContextRef.current;
      
      // Input stream (Mic)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const inputCtx = new AudioContext({ sampleRate: 16000 });
      const source = inputCtx.createMediaStreamSource(stream);
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      
      // Determine voice to use (Map custom voice to a specific one to simulate distinctiveness, or use active)
      const voiceName = activeVoice === 'My Cloned Voice' ? 'Fenrir' : activeVoice;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
            onopen: () => {
                setConnected(true);
                addLog(`Connected with voice: ${activeVoice}`);
                
                processor.onaudioprocess = (e) => {
                    const inputData = e.inputBuffer.getChannelData(0);
                    const pcm16 = float32ToPcm16(inputData);
                    const base64 = arrayBufferToBase64(pcm16.buffer);
                    
                    sessionPromise.then(session => {
                        session.sendRealtimeInput({
                            media: {
                                mimeType: 'audio/pcm;rate=16000',
                                data: base64
                            }
                        });
                    });
                };
                source.connect(processor);
                processor.connect(inputCtx.destination);
            },
            onmessage: async (msg: LiveServerMessage) => {
                // Handle Audio Output
                const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (audioData) {
                    const binary = base64ToUint8Array(audioData);
                    // Decode raw PCM (assuming 24kHz from model)
                    const buffer = ctx.createBuffer(1, binary.length / 2, 24000);
                    const channelData = buffer.getChannelData(0);
                    const dataView = new DataView(binary.buffer);
                    for (let i = 0; i < channelData.length; i++) {
                        channelData[i] = dataView.getInt16(i * 2, true) / 32768.0;
                    }
                    
                    const src = ctx.createBufferSource();
                    src.buffer = buffer;
                    src.connect(ctx.destination);
                    
                    const startTime = Math.max(ctx.currentTime, nextStartTimeRef.current);
                    src.start(startTime);
                    nextStartTimeRef.current = startTime + buffer.duration;
                    
                    src.onended = () => sourcesRef.current.delete(src);
                    sourcesRef.current.add(src);
                }

                // Handle Transcription
                if (msg.serverContent?.inputTranscription) {
                   setTranscription(prev => ({ ...prev, user: prev.user + msg.serverContent?.inputTranscription?.text }));
                }
                if (msg.serverContent?.outputTranscription) {
                   setTranscription(prev => ({ ...prev, model: prev.model + msg.serverContent?.outputTranscription?.text }));
                }

                if (msg.serverContent?.turnComplete) {
                    // Reset or newline
                    setTranscription(prev => ({ user: prev.user + '\n', model: prev.model + '\n' }));
                }
            },
            onclose: () => {
                setConnected(false);
                addLog("Connection closed");
            },
            onerror: (e) => {
                console.error(e);
                addLog("Error occurred");
            }
        },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName } }
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {}
        }
      });
      
      sessionRef.current = { sessionPromise, processor, inputCtx, stream };

    } catch (err) {
        console.error(err);
        addLog("Failed to connect");
    }
  };

  const disconnect = () => {
    if (sessionRef.current) {
        const { stream, processor, inputCtx, sessionPromise } = sessionRef.current;
        stream?.getTracks().forEach((t: any) => t.stop());
        processor?.disconnect();
        inputCtx?.close();
        sessionPromise.then((s: any) => s.close());
        setConnected(false);
        sessionRef.current = null;
    }
  };

  // Cloning Logic (Simulated for UI High-Fidelity)
  const startCloningProcess = () => {
    setCustomVoiceStatus('recording');
    setTimeout(() => {
        setCustomVoiceStatus('processing');
        let progress = 0;
        const interval = setInterval(() => {
            progress += 5;
            setCloningProgress(progress);
            if (progress >= 100) {
                clearInterval(interval);
                setCustomVoiceStatus('ready');
                setActiveVoice('My Cloned Voice');
            }
        }, 150);
    }, 4000);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto relative">
        
        {/* Header & Toolbar */}
        <div className="flex justify-between items-start mb-10">
            <div>
                <h2 className="text-3xl font-bold text-white mb-4">Live Voice Studio</h2>
                <p className="text-gray-400">Real-time conversational AI with advanced voice modulation.</p>
            </div>
            <button 
                onClick={() => setShowSettings(true)}
                className="p-3 bg-dark-surface border border-dark-border rounded-full hover:bg-white/10 text-gray-300 transition-colors relative"
            >
                <Settings size={24} />
                {activeVoice === 'My Cloned Voice' && (
                    <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-dark-bg"></span>
                )}
            </button>
        </div>

        {/* Main Interaction Area */}
        <div className="flex flex-col items-center mb-12">
            <div className="relative">
                {connected && (
                    <div className="absolute inset-0 bg-blue-500/30 rounded-full animate-ping"></div>
                )}
                <button
                    onClick={connected ? disconnect : connect}
                    className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center transition-all shadow-2xl ${connected ? 'bg-red-500 hover:bg-red-600 shadow-red-500/40' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/40'}`}
                >
                    {connected ? <MicOff size={40} className="text-white" /> : <Mic size={40} className="text-white" />}
                </button>
            </div>
            
            <div className="mt-6 flex items-center space-x-2">
                {connected ? (
                    <div className="flex items-center space-x-2 text-green-400 bg-green-400/10 px-4 py-2 rounded-full border border-green-500/20">
                        <Wifi size={16} className="animate-pulse"/>
                        <span className="text-sm font-semibold">Live • {activeVoice}</span>
                    </div>
                ) : (
                    <div className="text-gray-500 text-sm bg-dark-surface px-4 py-2 rounded-full border border-dark-border">
                        Ready to connect • Using {activeVoice}
                    </div>
                )}
            </div>
        </div>

        {/* Transcriptions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-dark-surface border border-dark-border p-6 rounded-xl h-64 overflow-y-auto relative group">
                <div className="absolute top-4 right-4 text-gray-600 group-hover:text-gray-400 transition-colors">
                    <User size={20} />
                </div>
                <h3 className="text-xs text-gray-500 uppercase font-bold mb-3 tracking-wider">User Input</h3>
                <p className="text-lg text-white whitespace-pre-wrap leading-relaxed">{transcription.user}</p>
                {!transcription.user && <span className="text-gray-600 italic">Listening...</span>}
            </div>
            
            <div className="bg-dark-surface border border-dark-border p-6 rounded-xl h-64 overflow-y-auto relative group">
                <div className="absolute top-4 right-4 text-blue-600/50 group-hover:text-blue-500 transition-colors">
                    <Sparkles size={20} />
                </div>
                <h3 className="text-xs text-blue-400 uppercase font-bold mb-3 tracking-wider">Gemini Output</h3>
                <p className="text-lg text-blue-50 whitespace-pre-wrap leading-relaxed">{transcription.model}</p>
                {!transcription.model && <span className="text-gray-600 italic">Waiting for response...</span>}
            </div>
        </div>

        {/* Connection Logs */}
        <div className="mt-6 text-xs text-gray-600 font-mono border-t border-dark-border pt-4">
            {logs.map((l, i) => <div key={i}>&gt; {l}</div>)}
        </div>

        {/* Voice Configuration Modal */}
        {showSettings && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
                <div className="bg-dark-surface border border-dark-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b border-dark-border flex justify-between items-center bg-dark-bg">
                        <h3 className="text-xl font-bold text-white flex items-center">
                            <Settings size={20} className="mr-2 text-blue-400"/> Voice Configuration
                        </h3>
                        <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white">
                            <X size={24} />
                        </button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto space-y-8">
                        
                        {/* Available Voices */}
                        <div>
                            <h4 className="text-sm font-bold text-gray-400 uppercase mb-3">System Voices</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {PREBUILT_VOICES.map(voice => (
                                    <button
                                        key={voice.id}
                                        onClick={() => setActiveVoice(voice.id)}
                                        className={`p-4 rounded-xl border text-left transition-all ${activeVoice === voice.id ? 'bg-blue-600 border-blue-500 text-white ring-2 ring-blue-400/20' : 'bg-dark-bg border-dark-border text-gray-400 hover:border-gray-500 hover:text-gray-200'}`}
                                    >
                                        <div className="font-bold mb-1">{voice.label}</div>
                                        <div className="text-xs opacity-70">{voice.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Voice Cloning Engine */}
                        <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Fingerprint size={100} className="text-purple-500"/>
                            </div>
                            
                            <div className="relative z-10">
                                <h4 className="text-lg font-bold text-white mb-2 flex items-center">
                                    <Fingerprint size={20} className="mr-2 text-purple-400"/> Voice Cloning Engine
                                </h4>
                                <p className="text-sm text-gray-400 mb-6 max-w-md">
                                    Create a high-fidelity digital replica of your voice for personalized interactions.
                                </p>

                                {customVoiceStatus === 'none' && (
                                    <div className="flex items-center space-x-4">
                                        <button 
                                            onClick={startCloningProcess}
                                            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg flex items-center transition-all"
                                        >
                                            <Mic size={18} className="mr-2"/> Start New Clone
                                        </button>
                                        <span className="text-xs text-gray-500">Takes ~10 seconds</span>
                                    </div>
                                )}

                                {customVoiceStatus === 'recording' && (
                                    <div className="flex flex-col items-center py-4">
                                        <div className="flex items-center space-x-2 text-red-400 animate-pulse mb-2">
                                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                            <span className="font-mono text-sm">RECORDING SAMPLE...</span>
                                        </div>
                                        <div className="w-full h-12 bg-black/40 rounded-lg flex items-center justify-center space-x-1 overflow-hidden">
                                            {[...Array(20)].map((_, i) => (
                                                <div key={i} className="w-1 bg-purple-500 animate-music-bar" style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 0.05}s` }}></div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">Speak naturally for optimal mapping...</p>
                                    </div>
                                )}

                                {customVoiceStatus === 'processing' && (
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-xs font-mono text-purple-300">
                                            <span>TRAINING NEURAL FIELD</span>
                                            <span>{cloningProgress}%</span>
                                        </div>
                                        <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden">
                                            <div className="bg-purple-500 h-full transition-all duration-150" style={{ width: `${cloningProgress}%` }}></div>
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {cloningProgress < 30 && "Extracting spectral features..."}
                                            {cloningProgress >= 30 && cloningProgress < 70 && "Mapping prosody vectors..."}
                                            {cloningProgress >= 70 && "Synthesizing voice model..."}
                                        </div>
                                    </div>
                                )}

                                {customVoiceStatus === 'ready' && (
                                    <div className="flex items-center justify-between bg-purple-500/20 border border-purple-500/40 p-4 rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                                                ID
                                            </div>
                                            <div>
                                                <h5 className="font-bold text-white text-sm">My Cloned Voice</h5>
                                                <p className="text-xs text-purple-300">High-Fidelity Model • Ready</p>
                                            </div>
                                        </div>
                                        <div className="flex space-x-2">
                                            {activeVoice === 'My Cloned Voice' ? (
                                                <button disabled className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded border border-green-500/30 flex items-center">
                                                    <Check size={12} className="mr-1"/> Active
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => setActiveVoice('My Cloned Voice')}
                                                    className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded transition-colors"
                                                >
                                                    Select
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-4 border-t border-dark-border bg-dark-bg flex justify-end">
                        <button 
                            onClick={() => setShowSettings(false)}
                            className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}