import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { chatWithGrounding } from '../services/gemini';
import { Loader2, Send, MapPin, Globe, BrainCircuit, Paperclip, FileText, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function ChatIntelligence() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '0', role: 'model', content: 'Hello! I am your intelligent assistant. I can analyze documents, search the web, find places on maps, and think deeply about complex topics. How can I help?', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Toggles
  const [useSearch, setUseSearch] = useState(false);
  const [useMaps, setUseMaps] = useState(false);
  const [useThinking, setUseThinking] = useState(false);
  
  // File Upload
  const [filePart, setFilePart] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            setFilePart({
                inlineData: {
                    data: base64String,
                    mimeType: file.type
                }
            });
        };
        reader.readAsDataURL(file);
    }
  };

  const handleCopy = (text: string, id: string) => {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSend = async () => {
    if ((!input.trim() && !filePart) || loading) return;
    
    const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: input,
        timestamp: Date.now(),
        images: filePart ? ['File attached'] : undefined
    };
    
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setInput('');

    try {
        const history = messages.map(m => ({
            role: m.role,
            parts: [{ text: m.content }]
        }));

        const parts = filePart ? [filePart] : [];
        const response = await chatWithGrounding(userMsg.content, history, useSearch, useMaps, useThinking, parts);
        
        setFilePart(null);

        const text = response.text || "No response generated.";
        
        const botMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            content: text,
            timestamp: Date.now(),
            groundingMetadata: response.candidates?.[0]?.groundingMetadata
        };
        setMessages(prev => [...prev, botMsg]);
        
    } catch (error) {
        console.error(error);
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', content: 'Error: Could not connect to Gemini.', timestamp: Date.now() }]);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-screen bg-dark-bg">
        {/* Header / Toolbar */}
        <div className="p-4 border-b border-dark-border bg-dark-surface flex items-center justify-between">
            <div className="flex items-center space-x-4">
                <h2 className="font-bold text-white">Gemini Intelligence</h2>
                <div className="h-6 w-px bg-dark-border mx-2"></div>
                <div className="flex space-x-2">
                    <button 
                        onClick={() => { setUseSearch(!useSearch); setUseMaps(false); setUseThinking(false); }}
                        className={`p-2 rounded flex items-center text-xs font-medium space-x-1 ${useSearch ? 'bg-blue-600 text-white' : 'bg-dark-bg text-gray-400'}`}
                    >
                        <Globe size={14} /> <span>Search</span>
                    </button>
                    <button 
                        onClick={() => { setUseMaps(!useMaps); setUseSearch(false); setUseThinking(false); }}
                        className={`p-2 rounded flex items-center text-xs font-medium space-x-1 ${useMaps ? 'bg-green-600 text-white' : 'bg-dark-bg text-gray-400'}`}
                    >
                        <MapPin size={14} /> <span>Maps</span>
                    </button>
                    <button 
                        onClick={() => { setUseThinking(!useThinking); setUseSearch(false); setUseMaps(false); }}
                        className={`p-2 rounded flex items-center text-xs font-medium space-x-1 ${useThinking ? 'bg-purple-600 text-white' : 'bg-dark-bg text-gray-400'}`}
                    >
                        <BrainCircuit size={14} /> <span>Thinking</span>
                    </button>
                </div>
            </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-3xl rounded-2xl p-4 relative group ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-dark-surface border border-dark-border text-gray-200'}`}>
                        
                        {/* Copy Button */}
                        <button 
                            onClick={() => handleCopy(msg.content, msg.id)}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded bg-black/20 hover:bg-black/40 text-white/70"
                            title="Copy"
                        >
                            {copiedId === msg.id ? <Check size={12} /> : <Copy size={12} />}
                        </button>

                        {msg.images && (
                            <div className="mb-2 text-xs bg-white/10 p-1 rounded inline-block">
                                <Paperclip size={10} className="inline mr-1"/> Attachment Included
                            </div>
                        )}
                        <div className="prose prose-invert prose-sm max-w-none">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                        
                        {/* Grounding Sources */}
                        {msg.groundingMetadata && msg.groundingMetadata.groundingChunks && (
                            <div className="mt-3 pt-3 border-t border-white/10 text-xs">
                                <p className="font-semibold mb-1 text-gray-400">Sources:</p>
                                <div className="flex flex-wrap gap-2">
                                    {msg.groundingMetadata.groundingChunks.map((chunk: any, idx: number) => {
                                        if (chunk.web?.uri) {
                                            return <a key={idx} href={chunk.web.uri} target="_blank" rel="noreferrer" className="bg-white/5 px-2 py-1 rounded hover:bg-white/10 truncate max-w-[200px] block">{chunk.web.title || 'Web Source'}</a>
                                        }
                                        if (chunk.maps?.placeAnswerSources?.[0]?.reviewSnippets?.[0]) {
                                             return <span key={idx} className="bg-green-900/30 text-green-400 px-2 py-1 rounded">Maps Source</span>
                                        }
                                        return null;
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ))}
            <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-dark-surface border-t border-dark-border">
             {filePart && (
                <div className="mb-2 flex items-center text-sm text-blue-400 bg-blue-500/10 p-2 rounded-lg w-fit">
                    <FileText size={16} className="mr-2"/> File attached
                    <button onClick={() => setFilePart(null)} className="ml-2 hover:text-white"><span className="text-xs">✕</span></button>
                </div>
            )}
            <div className="flex items-center space-x-3">
                <button onClick={() => fileInputRef.current?.click()} className="p-3 rounded-full hover:bg-white/10 text-gray-400 transition-colors">
                    <Paperclip size={20} />
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                
                <input 
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={useThinking ? "Ask a complex question..." : "Type a message..."}
                    className="flex-1 bg-dark-bg border border-dark-border rounded-full px-5 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                
                <button 
                    onClick={handleSend} 
                    disabled={loading}
                    className="p-3 bg-blue-600 rounded-full text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                </button>
            </div>
        </div>
    </div>
  );
}