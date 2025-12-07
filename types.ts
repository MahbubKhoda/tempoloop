export interface LoopRegion {
  start: number | null;
  end: number | null;
  active: boolean;
}

export interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  pitchShift: number; // In semitones
  volume: number;
  preservesPitch: boolean;
}

export interface AudioMetadata {
  name: string;
  size: number;
  type: string;
}
