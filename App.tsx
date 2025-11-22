import React, { useState, useEffect } from 'react';
import { AppMode } from './types';
import { 
  LayoutDashboard, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Mic, 
  MessageSquare, 
  FileText, 
  Music,
  Menu,
  X
} from 'lucide-react';

// Components
import ImageStudio from './components/ImageStudio';
import VideoStudio from './components/VideoStudio';
import AudioLive from './components/AudioLive';
import ChatIntelligence from './components/ChatIntelligence';
import DocReader from './components/DocReader';
import MusicLab from './components/MusicLab';

const Dashboard: React.FC<{ onNavigate: (mode: AppMode) => void }> = ({ onNavigate }) => (
  <div className="p-8 max-w-6xl mx-auto animate-fade-in">
    <h1 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
      TM Creative AI Studio
    </h1>
    <p className="text-gray-400 mb-10 text-lg">
      Next-gen multimodal creation platform powered by Gemini 2.5 & 3.0
    </p>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[
        { mode: AppMode.IMAGE_STUDIO, icon: ImageIcon, title: 'Image Studio', desc: 'Generate 4K images or edit with prompts', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
        { mode: AppMode.VIDEO_STUDIO, icon: VideoIcon, title: 'Veo Video', desc: 'Create cinematic 1080p videos from text or images', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
        { mode: AppMode.AUDIO_LIVE, icon: Mic, title: 'Live Voice', desc: 'Real-time conversation and audio transcription', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
        { mode: AppMode.CHAT_INTELLIGENCE, icon: MessageSquare, title: 'Intel Chat', desc: 'Reasoning, Search Grounding, and Maps', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
        { mode: AppMode.DOC_READER, icon: FileText, title: 'Doc Reader', desc: 'Live text-to-speech with visual highlighting', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
        { mode: AppMode.MUSIC_LAB, icon: Music, title: 'Music Lab', desc: 'Compose lyrics and generate creative audio', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
      ].map((item) => (
        <button 
          key={item.mode}
          onClick={() => onNavigate(item.mode)}
          className={`p-6 rounded-xl border ${item.color} hover:bg-opacity-20 transition-all text-left group`}
        >
          <div className="flex items-center justify-between mb-4">
            <item.icon size={32} />
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-sm">Launch &rarr;</span>
          </div>
          <h3 className="text-xl font-semibold mb-2 text-white">{item.title}</h3>
          <p className="text-sm opacity-80">{item.desc}</p>
        </button>
      ))}
    </div>
  </div>
);

export default function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const renderContent = () => {
    switch (mode) {
      case AppMode.IMAGE_STUDIO: return <ImageStudio />;
      case AppMode.VIDEO_STUDIO: return <VideoStudio />;
      case AppMode.AUDIO_LIVE: return <AudioLive />;
      case AppMode.CHAT_INTELLIGENCE: return <ChatIntelligence />;
      case AppMode.DOC_READER: return <DocReader />;
      case AppMode.MUSIC_LAB: return <MusicLab />;
      default: return <Dashboard onNavigate={setMode} />;
    }
  };

  return (
    <div className="min-h-screen flex bg-dark-bg text-white overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={`${isSidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 bg-dark-surface border-r border-dark-border flex flex-col sticky top-0 h-screen z-20`}
      >
        <div className="p-4 border-b border-dark-border flex items-center justify-between">
          {isSidebarOpen && <span className="font-bold tracking-wider text-blue-400">TM STUDIO</span>}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/10 rounded text-gray-400">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: AppMode.DASHBOARD, icon: LayoutDashboard, label: 'Dashboard' },
            { id: AppMode.IMAGE_STUDIO, icon: ImageIcon, label: 'Images' },
            { id: AppMode.VIDEO_STUDIO, icon: VideoIcon, label: 'Veo Video' },
            { id: AppMode.AUDIO_LIVE, icon: Mic, label: 'Live Audio' },
            { id: AppMode.CHAT_INTELLIGENCE, icon: MessageSquare, label: 'Chat' },
            { id: AppMode.DOC_READER, icon: FileText, label: 'Reader' },
            { id: AppMode.MUSIC_LAB, icon: Music, label: 'Music' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setMode(item.id)}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                mode === item.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon size={24} />
              {isSidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        {renderContent()}
      </main>
    </div>
  );
}
