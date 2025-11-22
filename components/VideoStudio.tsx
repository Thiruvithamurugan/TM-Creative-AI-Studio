import React, { useState } from 'react';
import { VideoResolution } from '../types';
import { generateVideo } from '../services/gemini';
import { Loader2, Video, Upload, Download } from 'lucide-react';

export default function VideoStudio() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [resolution, setResolution] = useState<VideoResolution>(VideoResolution.P720);
  const [inputImage, setInputImage] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const res = reader.result as string;
            setInputImage(res.split(',')[1]);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!prompt && !inputImage) return;
    setLoading(true);
    setVideoUrl(null);
    
    try {
      const url = await generateVideo(prompt, aspectRatio, resolution, inputImage || undefined);
      setVideoUrl(url);
    } catch (error) {
      console.error(error);
      alert("Video generation failed. Please ensure you have selected a paid API key (Veo requires billing).");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
      if (!videoUrl) return;
      try {
          const response = await fetch(videoUrl);
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `veo-video-${Date.now()}.mp4`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
      } catch (e) {
          console.error("Download failed", e);
          alert("Could not download video.");
      }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Veo Video Studio</h2>
        <p className="text-gray-400">Generate cinematic videos using Veo 3.1.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-dark-surface p-6 rounded-xl border border-dark-border space-y-6 h-fit">
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Prompt</label>
                <textarea 
                    className="w-full bg-dark-bg border border-dark-border rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none h-32 resize-none"
                    placeholder="A cyberpunk detective walking through rain..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Reference Image (Optional)</label>
                <input type="file" onChange={handleImageUpload} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-500/10 file:text-purple-400 hover:file:bg-purple-500/20"/>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Aspect Ratio</label>
                    <select 
                        value={aspectRatio}
                        onChange={(e) => setAspectRatio(e.target.value as any)}
                        className="w-full bg-dark-bg border border-dark-border rounded-lg p-2 text-white"
                    >
                        <option value="16:9">Landscape</option>
                        <option value="9:16">Portrait</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Resolution</label>
                    <select 
                        value={resolution}
                        onChange={(e) => setResolution(e.target.value as any)}
                        className="w-full bg-dark-bg border border-dark-border rounded-lg p-2 text-white"
                    >
                        <option value="720p">720p</option>
                        <option value="1080p">1080p</option>
                    </select>
                </div>
            </div>

            <button 
                onClick={handleGenerate}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-bold text-white hover:opacity-90 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
                {loading ? <Loader2 className="animate-spin" /> : <Video size={20} />}
                <span>{loading ? 'Rendering...' : 'Generate Video'}</span>
            </button>
        </div>

        <div className="lg:col-span-2 bg-black/50 rounded-xl border border-dark-border flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden p-4">
             {videoUrl ? (
                 <div className="w-full h-full flex flex-col items-center">
                     <video controls className="w-full h-auto max-h-[500px] rounded-lg shadow-2xl mb-4" src={videoUrl} />
                     <button 
                        onClick={handleDownload}
                        className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-500 px-6 py-2 rounded-full text-white font-medium transition-colors"
                     >
                         <Download size={18} />
                         <span>Download Video</span>
                     </button>
                 </div>
             ) : (
                 <div className="text-center text-gray-500">
                     <Video size={48} className="mx-auto mb-4 opacity-50" />
                     <p>Generated video will play here</p>
                 </div>
             )}
        </div>
      </div>
    </div>
  );
}