import React from 'react';
import { Play, Pause, RotateCcw, Repeat, Minus, Plus } from 'lucide-react';
import { LoopRegion } from '../types';

interface ControlsProps {
  isPlaying: boolean;
  duration: number;
  onTogglePlay: () => void;
  onReset: () => void;
  loopRegion: LoopRegion;
  onSetLoopA: () => void;
  onSetLoopB: () => void;
  onClearLoop: () => void;
  onToggleLoopActive: () => void;
  onUpdateLoopStart: (val: number) => void;
  onUpdateLoopEnd: (val: number) => void;
}

export const Controls: React.FC<ControlsProps> = ({
  isPlaying,
  duration,
  onTogglePlay,
  onReset,
  loopRegion,
  onSetLoopA,
  onSetLoopB,
  onClearLoop,
  onToggleLoopActive,
  onUpdateLoopStart,
  onUpdateLoopEnd,
}) => {

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (v: number) => void) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) setter(val);
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Main Controls Row */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        {/* Transport */}
        <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800">
          <button
              onClick={onReset}
              className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Reset to Start"
          >
              <RotateCcw size={20} />
          </button>

          <button
              onClick={onTogglePlay}
              className={`p-4 rounded-full transition-all transform hover:scale-105 active:scale-95 shadow-lg ${
              isPlaying 
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950' 
                  : 'bg-indigo-500 hover:bg-indigo-400 text-white'
              }`}
          >
              {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
          </button>
        </div>

        {/* Looping Buttons */}
        <div className="flex items-center gap-1 bg-slate-900 p-2 rounded-xl border border-slate-800">
          <button
            onClick={onSetLoopA}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors flex flex-col items-center leading-none gap-1 ${
              loopRegion.start !== null
                ? 'bg-indigo-900/50 text-indigo-400 border border-indigo-500/50'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
            title="Set Loop Start (Current Time)"
          >
            <span>A</span>
            {loopRegion.start !== null && <span className="w-1 h-1 rounded-full bg-indigo-400"></span>}
          </button>
          
          <button
            onClick={onSetLoopB}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors flex flex-col items-center leading-none gap-1 ${
              loopRegion.end !== null
                ? 'bg-indigo-900/50 text-indigo-400 border border-indigo-500/50'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
            title="Set Loop End (Current Time)"
          >
            <span>B</span>
            {loopRegion.end !== null && <span className="w-1 h-1 rounded-full bg-indigo-400"></span>}
          </button>

          <div className="w-px h-8 bg-slate-800 mx-1"></div>

          <button
              onClick={onToggleLoopActive}
              disabled={loopRegion.start === null || loopRegion.end === null}
              className={`p-3 rounded-lg transition-colors ${
                  loopRegion.active
                  ? 'text-green-400 bg-green-900/20'
                  : 'text-slate-500 hover:text-slate-300'
              } disabled:opacity-30 disabled:cursor-not-allowed`}
              title="Toggle Loop"
          >
              <Repeat size={20} />
          </button>

          {(loopRegion.start !== null || loopRegion.end !== null) && (
              <button
                  onClick={onClearLoop}
                  className="ml-1 p-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Clear Loop"
              >
                  Clear
              </button>
          )}
        </div>
      </div>

      {/* Precise Loop Controls */}
      {(loopRegion.start !== null || loopRegion.end !== null) && (
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
            
            {/* Loop Start Input */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 pr-2 rounded-lg border border-slate-800 shadow-sm">
                <span className="text-indigo-400 font-bold px-2 text-[10px] uppercase tracking-wider">Start</span>
                <button 
                    onClick={() => onUpdateLoopStart((loopRegion.start ?? 0) - 0.1)}
                    className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                    title="-0.1s"
                >
                    <Minus size={14} />
                </button>
                <input 
                    type="number"
                    step="0.01"
                    className="w-20 bg-transparent text-center font-mono outline-none text-slate-200 appearance-none [&::-webkit-inner-spin-button]:appearance-none p-1"
                    value={loopRegion.start !== null ? loopRegion.start.toFixed(2) : ''}
                    placeholder="0.00"
                    onChange={(e) => handleInputChange(e, onUpdateLoopStart)}
                />
                <button 
                    onClick={() => onUpdateLoopStart((loopRegion.start ?? 0) + 0.1)}
                    className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                    title="+0.1s"
                >
                    <Plus size={14} />
                </button>
            </div>

            {/* Loop End Input */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 pr-2 rounded-lg border border-slate-800 shadow-sm">
                <span className="text-indigo-400 font-bold px-2 text-[10px] uppercase tracking-wider">End</span>
                <button 
                    onClick={() => onUpdateLoopEnd((loopRegion.end ?? duration) - 0.1)}
                    className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                    title="-0.1s"
                >
                    <Minus size={14} />
                </button>
                <input 
                    type="number"
                    step="0.01"
                    className="w-20 bg-transparent text-center font-mono outline-none text-slate-200 appearance-none [&::-webkit-inner-spin-button]:appearance-none p-1"
                    value={loopRegion.end !== null ? loopRegion.end.toFixed(2) : ''}
                    placeholder={duration > 0 ? duration.toFixed(2) : "0.00"}
                    onChange={(e) => handleInputChange(e, onUpdateLoopEnd)}
                />
                <button 
                    onClick={() => onUpdateLoopEnd((loopRegion.end ?? duration) + 0.1)}
                    className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                    title="+0.1s"
                >
                    <Plus size={14} />
                </button>
            </div>
        </div>
      )}
    </div>
  );
};