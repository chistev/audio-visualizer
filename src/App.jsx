import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

function AudioBars({ analyser }) {
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    if (!analyser || !meshRef.current) return;

    // Get frequency data
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    const barCount = 64;

    for (let i = 0; i < barCount; i++) {
      // Sample frequencies (every 2nd bin for smoother spread)
      let value = dataArray[Math.floor(i * 2)] / 255;

      // Simple calculation: strong bass boost for low frequencies
      const bassBoost = i < 16 ? value * 4 : value * 1.5;
      const height = Math.max(0.3, bassBoost * 12);

      // Position bar along X-axis, centered
      dummy.position.set((i - barCount / 2) * 0.9, height / 2, 0);

      // Scale height (base box is 1 unit tall)
      dummy.scale.set(0.8, height, 0.8);

      // Apply transformation
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    // Tell Three.js the instance matrices changed
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, 64]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color="#60a5fa"
        emissive="#3b82f6"
        emissiveIntensity={1}
        metalness={0.6}
        roughness={0.4}
      />
    </instancedMesh>
  );
}

function App() {
  const [audioFile, setAudioFile] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);

  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('audio/')) {
      setError('Please upload a valid audio file (mp3, wav, etc.)');
      return;
    }

    setAudioFile(URL.createObjectURL(file));
    setError(null);
    setIsPlaying(false);
  };

  const togglePlayback = async () => {
    if (!audioRef.current) return;

    // Initialize Web Audio API on first play
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();

      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;

      sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      try {
        await audioRef.current.play();
      } catch (err) {
        setError('Playback failed. Try clicking Play again.');
        console.error(err);
        return;
      }
    }

    setIsPlaying(!isPlaying);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8">
      <h1 className="text-5xl font-bold mb-10 text-center">3D Audio Visualizer MVP</h1>

      <div className="w-full max-w-4xl mb-10">
        <input
          type="file"
          accept="audio/*"
          onChange={handleFileUpload}
          className="block w-full text-lg text-gray-300 file:mr-6 file:py-4 file:px-8 file:rounded-xl file:border-0 file:text-lg file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
        />
      </div>

      {error && <p className="text-red-400 text-xl mb-6">{error}</p>}

      {audioFile && (
        <>
          <div className="w-full max-w-5xl h-96 md:h-screen max-h-screen bg-black rounded-2xl shadow-2xl overflow-hidden mb-10">
            <Canvas camera={{ position: [0, 8, 20], fov: 60 }}>
              <ambientLight intensity={0.6} />
              <pointLight position={[10, 10, 10]} intensity={1} />
              <pointLight position={[-10, -10, -10]} intensity={0.5} color="#a78bfa" />

              <AudioBars analyser={analyserRef.current} />

              {/* Floor */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
                <planeGeometry args={[60, 60]} />
                <meshStandardMaterial color="#1e293b" />
              </mesh>

              <OrbitControls
                enableZoom={true}
                enablePan={false}
                autoRotate
                autoRotateSpeed={1}
                minPolarAngle={Math.PI / 4}
                maxPolarAngle={Math.PI / 2.2}
              />
            </Canvas>
          </div>

          {/* Hidden audio element */}
          <audio ref={audioRef} src={audioFile} crossOrigin="anonymous" />

          <button
            onClick={togglePlayback}
            className="px-10 py-5 bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl font-bold text-2xl transition transform shadow-lg"
          >
            {isPlaying ? 'Pause' : 'Play & Visualize'}
          </button>
        </>
      )}

      {!audioFile && (
        <p className="mt-12 text-gray-400 text-center text-xl max-w-2xl">
          Upload an audio file to experience a dynamic 3D bar visualizer with enhanced bass response.
        </p>
      )}
    </div>
  );
}

export default App;