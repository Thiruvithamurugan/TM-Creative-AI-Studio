import React, { useState, useRef } from 'react';
import { generateSpeech, base64ToUint8Array } from '../services/gemini';
import { GoogleGenAI } from '@google/genai';
import { Music, Mic2, PenTool, Download, Play, Square } from 'lucide-react';

export default function MusicLab() {
  const [topic, setTopic] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [loadingLyrics, setLoadingLyrics] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const generateLyrics = async () => {
    if (!topic) return;
    setLoadingLyrics(true);
    try {
       const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
       const response = await ai.models.generateContent({
           model: 'gemini-3-pro-preview',
           contents: { parts: [{ text: `Write a catchy song structure (Verse, Chorus, Bridge) about: ${topic}. Keep it rhythmic and formatted clearly.` }] }
       });
       setLyrics(response.text || '');
    } catch(e) {
        console.error(e);
        alert("Failed to generate lyrics.");
    } finally {
        setLoadingLyrics(false);
    }
  };

  const generateAudio = async () => {
      if (!lyrics) return;
      setLoadingAudio(true);
      setAudioUrl(null);
      try {
          // Using TTS as the "Audio Generator" placeholder for music/rhythmic speech
          const response = await generateSpeech(lyrics);
          const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          
          if (audioData) {
              const binary = base64ToUint8Array(audioData);
              const blob = new Blob([binary], { type: 'audio/wav' });
              const url = URL.createObjectURL(blob);
              setAudioUrl(url);
          }
      } catch(e) {
          console.error(e);
          alert("Failed to generate audio.");
      } finally {
          setLoadingAudio(false);
      }
  };

  const togglePlayback = () => {
      if (audioRef.current) {
          if (isPlaying) {
              audioRef.current.pause();
          } else {
              audioRef.current.play();
          }
          setIsPlaying(!isPlaying);
      }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
        <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-orange-500 mb-2">AI Music Lab</h2>
            <p className="text-gray-400">Compose lyrics and generate rhythmic audio tracks.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Controls */}
            <div className="space-y-6">
                <div className="bg-dark-surface p-6 rounded-xl border border-dark-border">
                    <label className="block text-gray-400 text-sm mb-2 font-bold">1. Song Idea</label>
                    <div className="flex space-x-2">
                        <input 
                            type="text" 
                            className="flex-1 bg-dark-bg p-3 rounded-lg border border-dark-border text-white focus:ring-2 focus:ring-pink-500 outline-none"
                            placeholder="A synthwave track about neon cities..."
                            value={topic}
                            onChange={e => setTopic(e.target.value)}
                        />
                        <button 
                            onClick={generateLyrics}
                            disabled={loadingLyrics || !topic}
                            className="bg-pink-600 px-4 rounded-lg text-white font-bold hover:bg-pink-500 transition-colors disabled:opacity-50"
                        >
                            {loadingLyrics ? <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div> : <PenTool size={20} />}
                        </button>
                    </div>
                </div>

                <div className="bg-dark-surface p-6 rounded-xl border border-dark-border">
                     <label className="block text-gray-400 text-sm mb-2 font-bold">2. Audio Generation</label>
                     <p className="text-xs text-gray-500 mb-4">Generate a spoken/rhythmic track from your lyrics.</p>
                     
                     <button 
                        onClick={generateAudio}
                        disabled={!lyrics || loadingAudio}
                        className="w-full bg-gradient-to-r from-orange-500 to-pink-600 py-3 rounded-lg text-white font-bold hover:opacity-90 transition-opacity flex items-center justify-center disabled:opacity-50"
                    >
                        <Mic2 size={20} className="mr-2"/> {loadingAudio ? 'Generating Audio...' : 'Generate Audio Track'}
                    </button>

                    {audioUrl && (
                        <div className="mt-4 p-4 bg-black/30 rounded-lg border border-white/10 animate-fade-in">
                            <audio 
                                ref={audioRef} 
                                src={audioUrl} 
                                onEnded={() => setIsPlaying(false)}
                                onPause={() => setIsPlaying(false)}
                                onPlay={() => setIsPlaying(true)}
                                className="hidden"
                            />
                            <div className="flex items-center justify-between">
                                <button 
                                    onClick={togglePlayback}
                                    className="flex items-center space-x-2 text-white hover:text-pink-400"
                                >
                                    {isPlaying ? <Square size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                                    <span className="font-mono text-sm">{isPlaying ? 'STOP' : 'PLAY'}</span>
                                </button>
                                <a 
                                    href={audioUrl} 
                                    download="generated-music-track.wav"
                                    className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded text-sm text-white transition-colors"
                                >
                                    <Download size={16} />
                                    <span>Download</span>
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column: Lyrics Editor */}
            <div className="bg-dark-surface p-6 rounded-xl border border-dark-border h-[600px] flex flex-col">
                <div className="flex items-center justify-between mb-2">
                    <label className="text-gray-400 text-sm font-bold">Custom Lyrics / Editor</label>
                    <span className="text-xs text-gray-600">Editable</span>
                </div>
                <textarea 
                    value={lyrics}
                    onChange={(e) => setLyrics(e.target.value)}
                    placeholder="Enter your lyrics here or generate them..."
                    className="flex-1 w-full bg-dark-bg p-4 rounded-lg border border-dark-border text-gray-300 font-mono text-sm focus:ring-2 focus:ring-pink-500 outline-none resize-none"
                />
            </div>
        </div>
    </div>
  );
}