import React, { useState, useRef } from 'react';
import { AspectRatio, ImageSize } from '../types';
import { generateImage, ensurePremiumKey } from '../services/gemini';
import { Loader2, Upload, Wand2, Download, Image as ImageIcon } from 'lucide-react';

export default function ImageStudio() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  const [size, setSize] = useState<ImageSize>(ImageSize.K1);
  const [mode, setMode] = useState<'generate' | 'edit'>('generate');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInputImage(reader.result as string);
        setMode('edit');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    setResultImage(null);
    
    try {
      // Extract base64 data if input image exists
      let base64Data = null;
      if (inputImage) {
        base64Data = inputImage.split(',')[1];
      }

      const response = await generateImage(prompt, base64Data, aspectRatio, size, mode === 'edit');
      
      // Parse response
      if (response && response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                setResultImage(`data:image/png;base64,${part.inlineData.data}`);
                break;
            }
        }
      }
    } catch (error) {
      console.error(error);
      alert("Generation failed. Ensure you have a valid Paid API key selected for Pro/Image models.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
         <div>
            <h2 className="text-3xl font-bold text-white">Image Studio</h2>
            <p className="text-gray-400">Generate 4K visuals or edit existing photos naturally.</p>
         </div>
         <div className="flex space-x-2 bg-dark-surface p-1 rounded-lg border border-dark-border">
            <button 
                onClick={() => setMode('generate')} 
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'generate' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
                Generate
            </button>
            <button 
                onClick={() => setMode('edit')} 
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'edit' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
                Edit
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Controls */}
        <div className="bg-dark-surface p-6 rounded-xl border border-dark-border space-y-6 h-fit">
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Prompt</label>
                <textarea 
                    className="w-full bg-dark-bg border border-dark-border rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none h-32"
                    placeholder={mode === 'generate' ? "A futuristic city with neon lights..." : "Add sunglasses to the person..."}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                />
            </div>

            {mode === 'edit' && (
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Source Image</label>
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-dark-border rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors"
                    >
                        {inputImage ? (
                            <img src={inputImage} alt="Source" className="max-h-32 mx-auto rounded" />
                        ) : (
                            <div className="flex flex-col items-center text-gray-500">
                                <Upload size={24} className="mb-2" />
                                <span className="text-xs">Click to upload</span>
                            </div>
                        )}
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                    </div>
                </div>
            )}

            {mode === 'generate' && (
                <>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Aspect Ratio</label>
                        <select 
                            value={aspectRatio} 
                            onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                            className="w-full bg-dark-bg border border-dark-border rounded-lg p-2 text-white"
                        >
                            {Object.values(AspectRatio).map(r => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Resolution</label>
                        <div className="flex space-x-2">
                            {Object.values(ImageSize).map((s) => (
                                <button 
                                    key={s}
                                    onClick={() => setSize(s)}
                                    className={`flex-1 py-2 rounded-lg border ${size === s ? 'border-blue-500 bg-blue-500/20 text-blue-400' : 'border-dark-border text-gray-400 hover:bg-dark-bg'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}

            <button 
                onClick={handleGenerate}
                disabled={loading || !prompt}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg font-bold text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
                {loading ? <Loader2 className="animate-spin" /> : <Wand2 size={20} />}
                <span>{loading ? 'Creating Magic...' : mode === 'generate' ? 'Generate Image' : 'Edit Image'}</span>
            </button>
        </div>

        {/* Output */}
        <div className="lg:col-span-2 bg-black/50 rounded-xl border border-dark-border flex items-center justify-center min-h-[500px] relative overflow-hidden">
            {resultImage ? (
                <div className="relative group w-full h-full flex items-center justify-center p-4">
                    <img src={resultImage} alt="Generated Result" className="max-w-full max-h-full object-contain shadow-2xl rounded-lg" />
                    <a 
                        href={resultImage} 
                        download="generated-image.png"
                        className="absolute top-4 right-4 p-2 bg-black/70 text-white rounded-full hover:bg-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                    >
                        <Download size={20} />
                    </a>
                </div>
            ) : (
                <div className="text-center text-gray-500">
                    <ImageIcon size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Your creation will appear here</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}