import React, { useState, useRef, useEffect } from 'react';
import { Upload, Music, AlertCircle } from 'lucide-react';
import { LoopRegion, AudioState, AudioMetadata } from '../types';
import { formatTime, formatTimePrecise } from '../utils/format';
import { Controls } from './Controls';
import { AudioScope } from './Visualizer';

// Inline AudioWorklet Processor for Pitch Shifting
const PITCH_SHIFTER_CODE = `
class PitchShifterProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: 'pitchFactor', defaultValue: 1.0 }];
  }

  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffers = []; 
    this.writeIndex = 0;
    this.phase = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    const pitchFactor = parameters.pitchFactor.length > 1 ? parameters.pitchFactor[0] : parameters.pitchFactor[0];
    
    if (!input || !input.length) return true;

    // Initialize buffers for each channel if needed
    if (this.buffers.length !== input.length) {
       this.buffers = input.map(() => new Float32Array(this.bufferSize));
    }

    const windowSize = this.bufferSize / 2;
    // Calculate phase increment: proportional to (1 - pitchFactor)
    // If pitchFactor = 1, increment is 0, delay is constant.
    const phaseIncrement = (1 - pitchFactor) / windowSize;

    // Iterate through sample frames
    for (let i = 0; i < input[0].length; i++) {
        // Update phase
        this.phase += phaseIncrement;
        if (this.phase >= 1) this.phase -= 1;
        if (this.phase < 0) this.phase += 1;

        // Calculate overlapping delay windows
        const delayA = this.phase * windowSize;
        const phaseB = (this.phase + 0.5) % 1;
        const delayB = phaseB * windowSize;
        
        // Hanning window function for crossfading
        const gainWindowA = 0.5 - 0.5 * Math.cos(2 * Math.PI * this.phase);
        const gainWindowB = 0.5 - 0.5 * Math.cos(2 * Math.PI * phaseB);

        // Process each channel
        for (let channel = 0; channel < input.length; channel++) {
            const inData = input[channel];
            const outData = output[channel];
            const buf = this.buffers[channel];

            // Write to circular buffer
            buf[this.writeIndex] = inData[i];

            // Read from circular buffer with delay
            let idxA = this.writeIndex - delayA;
            let idxB = this.writeIndex - delayB;
            
            // Handle wrapping
            while(idxA < 0) idxA += this.bufferSize;
            while(idxB < 0) idxB += this.bufferSize;

            // Linear Interpolation
            const idxA_i = Math.floor(idxA);
            const idxA_f = idxA - idxA_i;
            const idxA_next = (idxA_i + 1) % this.bufferSize;
            const valA = buf[idxA_i] * (1 - idxA_f) + buf[idxA_next] * idxA_f;

            const idxB_i = Math.floor(idxB);
            const idxB_f = idxB - idxB_i;
            const idxB_next = (idxB_i + 1) % this.bufferSize;
            const valB = buf[idxB_i] * (1 - idxB_f) + buf[idxB_next] * idxB_f;

            // Mix
            outData[i] = valA * gainWindowA + valB * gainWindowB;
        }

        // Advance buffer write pointer
        this.writeIndex++;
        if (this.writeIndex >= this.bufferSize) this.writeIndex = 0;
    }

    return true;
  }
}
registerProcessor('pitch-shifter', PitchShifterProcessor);
`;

export const AudioPlayer: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Audio Graph Refs
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const pitchNodeRef = useRef<AudioWorkletNode | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  // State
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<AudioMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [state, setState] = useState<AudioState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    playbackRate: 1,
    pitchShift: 0,
    volume: 1,
    preservesPitch: true,
  });

  const [loop, setLoop] = useState<LoopRegion>({
    start: null,
    end: null,
    active: false,
  });

  // Initialize Audio Context and Worklet
  const initAudio = async () => {
    if (audioContext?.state === 'running') return;
    
    // Resume if suspended
    if (audioContext?.state === 'suspended') {
      await audioContext.resume();
      return;
    }

    // Create new context if doesn't exist
    if (!audioContext && audioRef.current) {
      try {
        const CtxClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new CtxClass();
        
        // 1. Add Worklet Module
        const blob = new Blob([PITCH_SHIFTER_CODE], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        await ctx.audioWorklet.addModule(url);

        // 2. Create Nodes
        if (!sourceRef.current) {
            sourceRef.current = ctx.createMediaElementSource(audioRef.current);
        }
        
        const pitchNode = new AudioWorkletNode(ctx, 'pitch-shifter');
        const ana = ctx.createAnalyser();
        ana.fftSize = 256;

        // 3. Connect Graph: Source -> Pitch -> Analyser -> Destination
        sourceRef.current.connect(pitchNode);
        pitchNode.connect(ana);
        ana.connect(ctx.destination);

        // 4. Save State
        pitchNodeRef.current = pitchNode;
        setAnalyser(ana);
        setAudioContext(ctx);
        
        // Apply initial params
        const pitchFactor = Math.pow(2, state.pitchShift / 12);
        const param = pitchNode.parameters.get('pitchFactor');
        if (param) param.setValueAtTime(pitchFactor, ctx.currentTime);

      } catch (e) {
        console.error("Audio initialization failed:", e);
        setError("Failed to initialize audio engine. Your browser may not support AudioWorklet.");
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files[0]) {
      const selectedFile = files[0];
      const objectUrl = URL.createObjectURL(selectedFile);
      
      setFile(selectedFile);
      setMetadata({
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type
      });
      setError(null);
      
      if (audioRef.current) {
        audioRef.current.src = objectUrl;
        audioRef.current.load();
        
        setLoop({ start: null, end: null, active: false });
        setState(s => ({ ...s, isPlaying: false, currentTime: 0 }));
      }
    }
  };

  const togglePlay = async () => {
    if (!audioRef.current || !file) return;

    await initAudio();

    if (state.isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => {
        console.error("Playback failed", e);
        setError("Could not start playback.");
      });
    }
    setState(s => ({ ...s, isPlaying: !s.isPlaying }));
  };

  // Sync Audio Element Events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const current = audio.currentTime;
      setState(s => ({ ...s, currentTime: current }));

      // Loop Logic
      if (loop.active && loop.start !== null && loop.end !== null) {
        if (current >= loop.end || current < loop.start) {
            audio.currentTime = loop.start;
        }
      }
    };

    const handleLoadedMetadata = () => {
      setState(s => ({ ...s, duration: audio.duration }));
    };

    const handleEnded = () => {
       if (!loop.active) {
           setState(s => ({ ...s, isPlaying: false }));
       }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [loop]);

  // Apply Speed and Pitch Changes
  useEffect(() => {
    if (!audioRef.current) return;

    // 1. Apply Speed (Time Stretch) via standard HTML5 API
    audioRef.current.playbackRate = state.playbackRate;
    (audioRef.current as any).preservesPitch = true;
    (audioRef.current as any).mozPreservesPitch = true;
    (audioRef.current as any).webkitPreservesPitch = true;

    // 2. Apply Pitch Shift via AudioWorklet
    if (pitchNodeRef.current && audioContext) {
        const pitchFactor = Math.pow(2, state.pitchShift / 12);
        const param = pitchNodeRef.current.parameters.get('pitchFactor');
        // Ramp slightly to avoid clicks
        if (param) param.linearRampToValueAtTime(pitchFactor, audioContext.currentTime + 0.1);
    }

  }, [state.playbackRate, state.pitchShift, audioContext]);

  const setLoopA = () => {
    setLoop(l => ({ ...l, start: state.currentTime, active: (l.end !== null && state.currentTime < l.end) }));
  };

  const setLoopB = () => {
    setLoop(l => ({ 
        ...l, 
        end: state.currentTime, 
        active: (l.start !== null && l.start < state.currentTime) 
    }));
  };
  
  const updateLoopStart = (val: number) => {
    if (!state.duration && state.duration !== 0) return;
    
    // Constraints: 0 <= val <= End (or Duration if End is null)
    const max = loop.end !== null ? loop.end : state.duration;
    const clamped = Math.max(0, Math.min(val, max));
    
    setLoop(l => ({ ...l, start: clamped }));
  };

  const updateLoopEnd = (val: number) => {
    if (!state.duration && state.duration !== 0) return;

    // Constraints: Start (or 0) <= val <= Duration
    const min = loop.start !== null ? loop.start : 0;
    const clamped = Math.max(min, Math.min(val, state.duration));
    
    setLoop(l => ({ ...l, end: clamped }));
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setState(s => ({ ...s, currentTime: time }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      
      {/* Header / Upload */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500 rounded-2xl shadow-lg shadow-indigo-500/20">
            <Music className="text-white w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">TempoLoop</h1>
            <p className="text-slate-400 text-sm">Pro Practice Player</p>
          </div>
        </div>

        <button 
          onClick={() => fileInputRef.current?.click()}
          className="group flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-all hover:border-indigo-500/50"
        >
          <Upload size={18} className="group-hover:-translate-y-0.5 transition-transform" />
          <span>{metadata ? 'Change File' : 'Upload Audio'}</span>
        </button>
        <input 
          ref={fileInputRef} 
          type="file" 
          accept="audio/*" 
          onChange={handleFileChange} 
          className="hidden" 
        />
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-900/50 text-red-200 p-4 rounded-xl flex items-center gap-2">
            <AlertCircle size={20} />
            {error}
        </div>
      )}

      {/* Main Display */}
      <div className="bg-slate-900/50 rounded-3xl p-6 md:p-8 border border-slate-800 backdrop-blur-sm shadow-xl">
        
        {/* Visualizer */}
        <div className="mb-8">
             {file ? (
                 <AudioScope analyser={analyser} />
             ) : (
                 <div className="w-full h-32 bg-slate-900/50 rounded-lg border border-slate-800 border-dashed flex items-center justify-center text-slate-500">
                     No Audio Loaded
                 </div>
             )}
        </div>

        {/* Timeline */}
        <div className="space-y-2 mb-8 select-none">
            <div className="flex justify-between text-xs font-mono text-slate-400">
                <span>{formatTimePrecise(state.currentTime)}</span>
                <span>{formatTime(state.duration)}</span>
            </div>
            <div className="relative h-6 group">
                {/* Loop Background Highlight */}
                {loop.start !== null && loop.end !== null && (
                    <div 
                        className={`absolute top-0 bottom-0 pointer-events-none opacity-20 ${loop.active ? 'bg-indigo-500' : 'bg-slate-500'}`}
                        style={{
                            left: `${(loop.start / state.duration) * 100}%`,
                            width: `${((loop.end - loop.start) / state.duration) * 100}%`
                        }}
                    />
                )}
                
                {/* Loop Markers */}
                {loop.start !== null && (
                    <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-indigo-400 z-10 pointer-events-none"
                        style={{ left: `${(loop.start / state.duration) * 100}%` }}
                    >
                        <div className="absolute -top-1 -translate-x-1/2 text-[10px] font-bold text-indigo-400">A</div>
                    </div>
                )}
                {loop.end !== null && (
                    <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-indigo-400 z-10 pointer-events-none"
                        style={{ left: `${(loop.end / state.duration) * 100}%` }}
                    >
                        <div className="absolute -top-1 -translate-x-1/2 text-[10px] font-bold text-indigo-400">B</div>
                    </div>
                )}

                <input
                    type="range"
                    min={0}
                    max={state.duration || 100}
                    step={0.01}
                    value={state.currentTime}
                    onChange={handleSeek}
                    className="w-full absolute top-1/2 -translate-y-1/2 z-20 h-4 opacity-0 cursor-pointer"
                />
                
                {/* Visual Progress Bar */}
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden absolute top-1/2 -translate-y-1/2 pointer-events-none">
                    <div 
                        className="h-full bg-indigo-500 transition-all duration-75"
                        style={{ width: `${(state.currentTime / state.duration) * 100}%` }}
                    />
                </div>
                
                {/* Thumb Visual */}
                <div 
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md pointer-events-none transition-all duration-75"
                    style={{ left: `${(state.currentTime / state.duration) * 100}%`, marginLeft: '-8px' }}
                />
            </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-6">
            <Controls
                isPlaying={state.isPlaying}
                duration={state.duration}
                onTogglePlay={togglePlay}
                onReset={() => {
                    if(audioRef.current) audioRef.current.currentTime = 0;
                    setState(s => ({ ...s, currentTime: 0 }));
                }}
                loopRegion={loop}
                onSetLoopA={setLoopA}
                onSetLoopB={setLoopB}
                onClearLoop={() => setLoop({ start: null, end: null, active: false })}
                onToggleLoopActive={() => setLoop(l => ({ ...l, active: !l.active }))}
                onUpdateLoopStart={updateLoopStart}
                onUpdateLoopEnd={updateLoopEnd}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-950/30 rounded-2xl border border-slate-800/50">
                {/* Speed Control */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-semibold text-slate-300">Playback Speed</label>
                        <span className="text-xs font-mono bg-slate-800 px-2 py-1 rounded text-indigo-300">
                            {state.playbackRate.toFixed(2)}x
                        </span>
                    </div>
                    <input
                        type="range"
                        min="0.25"
                        max="2.0"
                        step="0.05"
                        value={state.playbackRate}
                        onChange={(e) => setState(s => ({ ...s, playbackRate: parseFloat(e.target.value) }))}
                        className="w-full accent-indigo-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                        <span onClick={() => setState(s => ({ ...s, playbackRate: 0.5 }))} className="cursor-pointer hover:text-indigo-400">0.5x</span>
                        <span onClick={() => setState(s => ({ ...s, playbackRate: 1.0 }))} className="cursor-pointer hover:text-indigo-400">1.0x</span>
                        <span onClick={() => setState(s => ({ ...s, playbackRate: 1.5 }))} className="cursor-pointer hover:text-indigo-400">1.5x</span>
                        <span onClick={() => setState(s => ({ ...s, playbackRate: 2.0 }))} className="cursor-pointer hover:text-indigo-400">2.0x</span>
                    </div>
                    <p className="text-[10px] text-slate-600">Affects duration. Pitch is preserved.</p>
                </div>

                {/* Pitch Control */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-semibold text-slate-300">Pitch Shift</label>
                        <span className={`text-xs font-mono px-2 py-1 rounded ${state.pitchShift !== 0 ? 'bg-amber-900/30 text-amber-300' : 'bg-slate-800 text-slate-400'}`}>
                            {state.pitchShift > 0 ? '+' : ''}{state.pitchShift} st
                        </span>
                    </div>
                    <input
                        type="range"
                        min="-12"
                        max="12"
                        step="1"
                        value={state.pitchShift}
                        onChange={(e) => setState(s => ({ ...s, pitchShift: parseInt(e.target.value) }))}
                        className="w-full accent-amber-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 uppercase tracking-wider font-bold gap-3">
                        <span onClick={() => setState(s => ({ ...s, pitchShift: -12 }))} className="cursor-pointer hover:text-amber-400">-12</span>
                        <span onClick={() => setState(s => ({ ...s, pitchShift: 0 }))} className="cursor-pointer hover:text-amber-400">0</span>
                        <span onClick={() => setState(s => ({ ...s, pitchShift: 12 }))} className="cursor-pointer hover:text-amber-400">+12</span>
                    </div>
                    <p className="text-[10px] text-amber-500/50">Changes key. Speed is preserved.</p>
                </div>
            </div>
        </div>
      </div>
      
      {/* Hidden Audio Element */}
      <audio 
        ref={audioRef} 
        preload="metadata" 
        crossOrigin="anonymous" 
        className="hidden"
      />

      {metadata && (
          <div className="text-center text-xs text-slate-600 font-mono">
              {metadata.name} • {(metadata.size / 1024 / 1024).toFixed(2)} MB • {metadata.type}
          </div>
      )}
    </div>
  );
};