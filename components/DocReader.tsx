import React, { useState, useRef } from 'react';
import { generateSpeech, base64ToUint8Array } from '../services/gemini';
import { Play, Square, FileText, Download } from 'lucide-react';

export default function DocReader() {
  const [text, setText] = useState("Paste your article, document text, or email content here to listen to it live.");
  const [isPlaying, setIsPlaying] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [audioDownloadUrl, setAudioDownloadUrl] = useState<string | null>(null);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const handlePlay = async () => {
    if (!text.trim()) return;
    setIsPlaying(true);
    setAudioDownloadUrl(null);
    
    try {
        const response = await generateSpeech(text);
        const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        
        if (audioData) {
            // Prepare Download Link
            const binaryForBlob = base64ToUint8Array(audioData);
            const blob = new Blob([binaryForBlob], { type: 'audio/wav' });
            const url = URL.createObjectURL(blob);
            setAudioDownloadUrl(url);

            // Play Audio
            if (!audioCtxRef.current) {
                audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
            }
            const ctx = audioCtxRef.current;
            // We must clone the binary data for decodeAudioData because it detaches the buffer
            const binaryForDecode = base64ToUint8Array(audioData);
            const audioBuffer = await ctx.decodeAudioData(binaryForDecode.buffer);
            
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            sourceRef.current = source;
            
            source.start();
            
            const words = text.split(' ');
            const durationPerWord = audioBuffer.duration / Math.max(words.length, 1);
            
            let i = 0;
            const interval = setInterval(() => {
                setHighlightIndex(i);
                i++;
                if (i >= words.length) clearInterval(interval);
            }, durationPerWord * 1000);
            
            source.onended = () => {
                setIsPlaying(false);
                clearInterval(interval);
                setHighlightIndex(-1);
            };
        }
    } catch (e) {
        console.error(e);
        alert("Failed to generate speech");
        setIsPlaying(false);
    }
  };

  const handleStop = () => {
    if (sourceRef.current) {
        sourceRef.current.stop();
    }
    setIsPlaying(false);
    setHighlightIndex(-1);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-white mb-6">Live Document Reader</h2>
      
      <div className="bg-dark-surface border border-dark-border rounded-xl p-6 mb-6 shadow-lg">
        <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isPlaying}
            className="w-full h-64 bg-transparent text-lg leading-relaxed text-gray-300 focus:outline-none resize-none"
        />
      </div>

      {/* Highlight Overlay View */}
      {isPlaying && (
          <div className="bg-dark-surface border border-blue-500/30 rounded-xl p-6 mb-6 shadow-lg absolute top-32 max-w-4xl w-[calc(100%-4rem)] z-10 backdrop-blur-xl bg-opacity-90 h-64 overflow-y-auto">
              <p className="text-lg leading-relaxed text-gray-400">
                  {text.split(' ').map((word, i) => (
                      <span key={i} className={`transition-colors duration-200 mr-1 ${i === highlightIndex ? 'text-white bg-blue-600 px-1 rounded shadow-lg font-bold' : ''}`}>
                          {word}
                      </span>
                  ))}
              </p>
          </div>
      )}

      <div className="flex justify-center space-x-4 items-center">
        {!isPlaying ? (
            <button onClick={handlePlay} className="px-8 py-3 bg-yellow-500 text-black font-bold rounded-full hover:bg-yellow-400 flex items-center shadow-lg shadow-yellow-500/20 transition-all">
                <Play size={20} className="mr-2 fill-current"/> Read Aloud
            </button>
        ) : (
            <button onClick={handleStop} className="px-8 py-3 bg-red-500 text-white font-bold rounded-full hover:bg-red-400 flex items-center shadow-lg shadow-red-500/20 transition-all">
                <Square size={20} className="mr-2 fill-current"/> Stop
            </button>
        )}

        {audioDownloadUrl && !isPlaying && (
            <a 
                href={audioDownloadUrl} 
                download="document-audio.wav"
                className="px-6 py-3 bg-dark-surface border border-dark-border text-white font-medium rounded-full hover:bg-white/10 flex items-center transition-all"
            >
                <Download size={20} className="mr-2"/> Download Audio
            </a>
        )}
      </div>
    </div>
  );
}