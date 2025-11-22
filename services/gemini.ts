import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AspectRatio, ImageSize, VideoResolution } from "../types";

const apiKey = process.env.API_KEY || '';

// Helper to check/enforce paid key selection for Premium features
export const ensurePremiumKey = async (): Promise<void> => {
  if (window.aistudio) {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await window.aistudio.openSelectKey();
    }
  }
};

// Instantiate fresh client (important for key switching)
const getClient = () => new GoogleGenAI({ apiKey });

export const generateImage = async (
  prompt: string, 
  base64Image: string | null, 
  aspectRatio: AspectRatio,
  size: ImageSize,
  isEditing: boolean
) => {
  await ensurePremiumKey(); // Images usually require billing project if using Pro
  const ai = getClient();
  
  // Logic: If editing (image + prompt), use Flash Image (or Pro Image if strictly generation).
  // Prompt requests "Gemini 2.5 Flash Image" for editing.
  // Prompt requests "Gemini 3 Pro Image Preview" for generation with sizes.

  if (isEditing && base64Image) {
     // Edit mode using Gemini 2.5 Flash Image (Nano Banana)
     const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { data: base64Image, mimeType: 'image/png' } }, // Assuming PNG for simplicity
                { text: prompt }
            ]
        }
     });
     return response;
  } else {
      // Generation mode using Gemini 3 Pro Image Preview (Nano Banana Pro)
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
            parts: [{ text: prompt }]
        },
        config: {
            imageConfig: {
                aspectRatio: aspectRatio,
                imageSize: size
            }
        }
      });
      return response;
  }
};

export const generateVideo = async (
    prompt: string,
    aspectRatio: "16:9" | "9:16",
    resolution: VideoResolution,
    inputImage?: string
) => {
    await ensurePremiumKey();
    const ai = getClient();
    
    let operation;

    if (inputImage) {
        // Image-to-Video
        operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt,
            image: {
                imageBytes: inputImage,
                mimeType: 'image/png'
            },
            config: {
                numberOfVideos: 1,
                resolution: resolution,
                aspectRatio: aspectRatio
            }
        });
    } else {
        // Text-to-Video
        operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt,
            config: {
                numberOfVideos: 1,
                resolution: resolution,
                aspectRatio: aspectRatio
            }
        });
    }

    // Polling
    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Check every 5s
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    // Construct secure download link
    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (videoUri) {
        return `${videoUri}&key=${apiKey}`;
    }
    throw new Error("Video generation failed or no URI returned.");
};

export const chatWithGrounding = async (
    message: string,
    history: any[],
    useSearch: boolean,
    useMaps: boolean,
    useThinking: boolean,
    fileParts: any[] = []
) => {
    const ai = getClient();
    
    // Determine model
    // Search/Maps -> gemini-2.5-flash
    // Thinking/Complex -> gemini-3-pro-preview
    // Fast -> gemini-2.5-flash-lite (if requested, but logic here prefers capability)
    
    let model = 'gemini-3-pro-preview';
    let tools: any[] = [];
    let thinkingConfig = undefined;

    if (useSearch) {
        model = 'gemini-2.5-flash';
        tools.push({ googleSearch: {} });
    } else if (useMaps) {
        model = 'gemini-2.5-flash';
        tools.push({ googleMaps: {} });
    } else if (useThinking) {
        model = 'gemini-3-pro-preview';
        thinkingConfig = { thinkingBudget: 32768 };
    }

    const chat = ai.chats.create({
        model,
        history,
        config: {
            tools: tools.length > 0 ? tools : undefined,
            thinkingConfig
        }
    });
    
    // If we have files, we use generateContent on the model directly for single turn or simple structure, 
    // but for chat context we usually pass history. 
    // To keep it simple for this interface, if files exist, we treat it as a fresh message with content parts.
    
    if (fileParts.length > 0) {
        const contentParts = [...fileParts, { text: message }];
        const result = await ai.models.generateContent({
             model,
             contents: { parts: contentParts },
             config: {
                 tools: tools.length > 0 ? tools : undefined,
                 thinkingConfig
             }
        });
        return result;
    }

    const result = await chat.sendMessage({ message });
    return result;
};

export const generateSpeech = async (text: string, voiceName: string = 'Kore') => {
    const ai = getClient();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName }
                }
            }
        }
    });
    return response;
};

export const analyzeVideo = async (fileData: string, prompt: string) => {
    // Gemini 3 Pro for video understanding
    const ai = getClient();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
            parts: [
                { inlineData: { mimeType: 'video/mp4', data: fileData } }, // Assuming mp4
                { text: prompt }
            ]
        }
    });
    return response.text;
}

export const transcribeAudio = async (base64Audio: string) => {
    const ai = getClient();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { inlineData: { mimeType: 'audio/wav', data: base64Audio } },
                { text: "Transcribe this audio accurately." }
            ]
        }
    });
    return response.text;
};

// Helpers for Audio Encoding/Decoding for Live API
export function base64ToUint8Array(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}
  
export function float32ToPcm16(float32: Float32Array) {
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
        int16[i] = float32[i] * 32768;
    }
    return int16;
}

export function arrayBufferToBase64(buffer: ArrayBuffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
