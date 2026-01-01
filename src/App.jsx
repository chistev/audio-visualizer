import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

function AudioBars({ analyser, zFormula }) {
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    if (!analyser || !meshRef.current) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    const barCount = 64;

    for (let i = 0; i < barCount; i++) {
      const freqIndex = Math.floor(i * (dataArray.length / barCount));
      let value = dataArray[freqIndex] / 255;

      // Bass boost for low frequencies
      const bassBoost = i < 16 ? value * 4 : value * 1.5;
      const height = Math.max(0.3, bassBoost * 12);

      // Position along X-axis
      const x = (i - barCount / 2) * 0.9;

      // Apply selected Z-axis formula
      let z = 0;
      const t = performance.now() * 0.001; // time for animation
      switch (zFormula) {
        case 'none':
          z = 0;
          break;
        case 'sine':
          z = Math.sin(x * 0.2 + t) * (value * 5);
          break;
        case 'pulse':
          z = Math.sin(t * 3) * (value * 8);
          break;
        case 'wave':
          z = Math.sin(i * 0.2 + t * 2) * (value * 6 + 2);
          break;
        case 'spiral':
          z = Math.cos(x * 0.3 + t) * (value * 6) + Math.sin(t) * 2;
          break;
        default:
          z = 0;
      }

      dummy.position.set(x, height / 2, z);
      dummy.scale.set(0.8, height, 0.8);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, 64]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color="#60a5fa"
        emissive="#3b82f6"
        emissiveIntensity={1.2}
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
  const [zFormula, setZFormula] = useState('sine'); // Default formula

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

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.85;

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
      <h1 className="text-5xl font-bold mb-8 text-center">3D Audio Visualizer MVP</h1>

      <div className="w-full max-w-4xl mb-6">
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
          {/* Z-Formula Selector - Easy to modify in UI */}
          <div className="mb-6 flex flex-col items-center gap-3">
            <label className="text-xl font-medium">Z-Axis Effect Formula</label>
            <select
              value={zFormula}
              onChange={(e) => setZFormula(e.target.value)}
              className="px-6 py-3 bg-slate-800 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none text-lg"
            >
              <option value="none">None (Flat)</option>
              <option value="sine">Sine Wave (Gentle Curve)</option>
              <option value="wave">Traveling Wave</option>
              <option value="pulse">Central Pulse</option>
              <option value="spiral">Spiral Motion</option>
            </select>
          </div>

          <div className="w-full max-w-6xl h-96 md:h-screen max-h-screen bg-black rounded-2xl shadow-2xl overflow-hidden mb-8">
            <Canvas camera={{ position: [0, 10, 30], fov: 60 }}>
              <ambientLight intensity={0.6} />
              <pointLight position={[10, 10, 10]} intensity={1.2} />
              <pointLight position={[-10, -10, -10]} intensity={0.8} color="#a78bfa" />

              <AudioBars analyser={analyserRef.current} zFormula={zFormula} />

              {/* Reflective floor */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
                <planeGeometry args={[80, 80]} />
                <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
              </mesh>

              <OrbitControls
                enableZoom={true}
                enablePan={false}
                autoRotate
                autoRotateSpeed={0.8}
                minPolarAngle={Math.PI / 4}
                maxPolarAngle={Math.PI / 2.1}
              />
            </Canvas>
          </div>

          <audio ref={audioRef} src={audioFile} crossOrigin="anonymous" />

          <button
            onClick={togglePlayback}
            className="px-12 py-6 bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl font-bold text-3xl transition transform shadow-2xl"
          >
            {isPlaying ? 'Pause' : 'Play & Visualize'}
          </button>
        </>
      )}

      {!audioFile && (
        <p className="mt-12 text-gray-400 text-center text-xl max-w-2xl">
          Upload an audio file to experience a real-time 3D bar visualizer with dynamic Z-axis effects controlled via the formula selector.
        </p>
      )}
    </div>
  );
}

export default App;