import React from 'react';
import { AudioPlayer } from './components/AudioPlayer';

const App: React.FC = () => {
  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-200">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
      
      <div className="relative z-10 py-12 px-4">
        <AudioPlayer />
      </div>

      <footer className="fixed bottom-0 w-full py-4 text-center text-slate-600 text-xs pointer-events-none">
        <p>Built with React, Web Audio API & Tailwind</p>
      </footer>
    </div>
  );
};

export default App;
