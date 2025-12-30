import { useEffect, useRef, useState } from 'react';

function App() {
  const canvasRef = useRef(null);
  const [isVisualizing, setIsVisualizing] = useState(false);
  const [error, setError] = useState(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  const startVisualizer = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      setIsVisualizing(true);
      setError(null);
      drawVisualizer();
    } catch (err) {
      setError('Microphone access denied or unavailable. Please allow microphone permission.');
      console.error(err);
    }
  };

  const stopVisualizer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setIsVisualizing(false);
  };

  const drawVisualizer = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] * (canvas.height / 255);

        const hue = i / bufferLength * 60 + 180;
        ctx.fillStyle = `hsl(${hue}, 100%, ${50 + barHeight / canvas.height * 50}%)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    return () => stopVisualizer();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-bold mb-8 text-center">Real-Time Audio Visualizer</h1>

      <canvas
        ref={canvasRef}
        className="w-full max-w-4xl h-96 bg-slate-800 rounded-xl shadow-2xl mb-8"
      />

      {error && (
        <p className="text-red-400 text-center max-w-2xl mb-6">{error}</p>
      )}

      <div className="space-x-4">
        {!isVisualizing ? (
          <button
            onClick={startVisualizer}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-lg transition transform hover:scale-105"
          >
            Start Visualizer
          </button>
        ) : (
          <button
            onClick={stopVisualizer}
            className="px-8 py-4 bg-red-600 hover:bg-red-700 rounded-lg font-semibold text-lg transition transform hover:scale-105"
          >
            Stop Visualizer
          </button>
        )}
      </div>

      <p className="mt-8 text-gray-400 text-center max-w-2xl">
        This uses your microphone to visualize audio in real-time. Click "Start" and make some noise!
      </p>
    </div>
  );
}

export default App;