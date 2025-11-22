export enum AppMode {
  DASHBOARD = 'DASHBOARD',
  IMAGE_STUDIO = 'IMAGE_STUDIO',
  VIDEO_STUDIO = 'VIDEO_STUDIO',
  AUDIO_LIVE = 'AUDIO_LIVE',
  CHAT_INTELLIGENCE = 'CHAT_INTELLIGENCE',
  DOC_READER = 'DOC_READER',
  MUSIC_LAB = 'MUSIC_LAB'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: number;
  groundingMetadata?: any;
  images?: string[];
}

export enum AspectRatio {
  SQUARE = "1:1",
  PORTRAIT = "9:16",
  LANDSCAPE = "16:9",
  WIDE = "21:9",
  STANDARD_LANDSCAPE = "4:3",
  STANDARD_PORTRAIT = "3:4",
  PHOTO_LANDSCAPE = "3:2",
  PHOTO_PORTRAIT = "2:3"
}

export enum ImageSize {
  K1 = "1K",
  K2 = "2K",
  K4 = "4K"
}

export enum VideoResolution {
  P720 = "720p",
  P1080 = "1080p"
}

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}