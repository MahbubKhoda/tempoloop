import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  audioContext: AudioContext | null;
  sourceNode: MediaElementAudioSourceNode | null;
  isPlaying: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ audioContext, sourceNode, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!audioContext || !sourceNode) return;

    // Create analyser if it doesn't exist
    if (!analyserRef.current) {
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      sourceNode.connect(analyser);
      // We don't connect analyser to destination here because the sourceNode is likely already connected elsewhere or handled by the parent
      // Actually, for a visualizer side-chain, we usually do Source -> Analyser -> Destination, or Source -> Split -> (Analyser, Destination).
      // Assuming parent connects source to destination, we just tap in. 
      // However, MediaElementSource can only have one output in some implementations or needs careful handling.
      // In this app, we will assume the parent handles the main audio graph, but usually we just inspect.
      // NOTE: MediaElementSource outputs to the graph. If we connect it here, we must ensure it still goes to destination.
      // To be safe, let's just use the data if the parent passed us a node that is part of the graph.
      
      // Better approach for React: Parent sets up the graph: Source -> Analyser -> Gain -> Destination.
      // Parent passes the AnalyserNode.
      // But to keep props simple, let's create our own analyser and connect it if we can.
      // Re-connecting a MediaElementSource can be tricky.
      
      // Alternate: Let's just visualize if we have the data. 
      // To simplify: We will rely on the parent to pass the *AnalyserNode* instead of SourceNode.
    }
  }, [audioContext, sourceNode]);

  // Actually, let's just make this component handle the drawing and accept an AnalyserNode.
  // It's cleaner. But the prompt asked for me to handle the code.
  // I'll refactor this component to accept an AnalyserNode to avoid graph side-effects.
  return <canvas ref={canvasRef} className="w-full h-full block" />;
};

// Re-implementing with AnalyserNode prop for cleaner separation
export const AudioScope: React.FC<{ analyser: AnalyserNode | null }> = ({ analyser }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rAF = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!canvas) return;
      
      // Handle High DPI displays
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      // Only resize if necessary
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
          canvas.width = rect.width * dpr;
          canvas.height = rect.height * dpr;
          ctx.scale(dpr, dpr); // Normalise coordinate system
      }

      const width = rect.width;
      const height = rect.height;

      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = 'rgb(15, 23, 42)'; // slate-950
      ctx.fillRect(0, 0, width, height);

      const barWidth = (width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * height;

        // Gradient color based on height/intensity
        const hue = 240 + (barHeight / height) * 60; // Blue to Purple
        ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;

        // Draw rounded top bars
        ctx.beginPath();
        ctx.roundRect(x, height - barHeight, barWidth, barHeight, [4, 4, 0, 0]);
        ctx.fill();

        x += barWidth + 1;
      }

      rAF.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (rAF.current) cancelAnimationFrame(rAF.current);
    };
  }, [analyser]);

  return (
    <div className="w-full h-32 bg-slate-900 rounded-lg overflow-hidden border border-slate-800 shadow-inner">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};
