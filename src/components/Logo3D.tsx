import { Canvas } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, Html } from '@react-three/drei';
import { Suspense } from 'react';

function Model() {
  const { scene } = useGLTF('/sheet-tools-logo-3d.glb');
  
  return (
    <primitive 
      object={scene} 
      scale={4.5} 
      position={[0, 0, 0]}
    />
  );
}

useGLTF.preload('/sheet-tools-logo-3d.glb');

function LoadingFallback() {
  return (
    <Html center>
      <div className="text-white text-sm">Loading 3D Model...</div>
    </Html>
  );
}

interface Logo3DProps {
  className?: string;
}

export const Logo3D = ({ className }: Logo3DProps) => {
  return (
    <div className={`w-full h-full ${className || ''}`}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        className="w-full h-full"
      >
        <Suspense fallback={<LoadingFallback />}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} color="#7BBCFE" />
          <pointLight position={[-10, -10, -10]} intensity={0.5} color="#B8A8FE" />
          <directionalLight position={[0, 5, 5]} intensity={0.5} />
          <Model />
          <OrbitControls 
            enableZoom={true}
            enablePan={true}
            autoRotate={false}
            minDistance={2}
            maxDistance={10}
            minPolarAngle={0}
            maxPolarAngle={Math.PI}
            enableDamping={true}
            dampingFactor={0.05}
          />
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  );
};

