import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface BotThreeCanvasProps {
  primaryColor: string;
  secondaryColor: string;
  preset: 'hologram' | 'neon_core' | 'cyber_sphere' | 'quantum';
  isTalking: boolean;
  speed?: number;
  wireframe?: boolean;
  particleCount?: number;
}

export default function BotThreeCanvas({
  primaryColor,
  secondaryColor,
  preset,
  isTalking,
  speed = 1,
  wireframe = false,
  particleCount = 1200,
}: BotThreeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth || 300;
    const height = containerRef.current.clientHeight || 250;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2('#07080b', 0.015);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 8;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Parse colors safely
    const colorPrim = new THREE.Color(primaryColor || '#f97316');
    const colorSec = new THREE.Color(secondaryColor || '#eab308');

    // 2. Light sources
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(colorPrim, 2, 50);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    const pointLight2 = new THREE.PointLight(colorSec, 1.5, 30);
    pointLight2.position.set(-5, -3, 2);
    scene.add(pointLight2);

    // 3. Create Geometries based on selected Preset
    let botObject: THREE.Object3D;

    if (preset === 'cyber_sphere') {
      // Sleek wireframe sphere or point sphere
      const geometry = new THREE.SphereGeometry(2, 32, 32);
      if (wireframe) {
        const material = new THREE.MeshBasicMaterial({
          color: colorPrim,
          wireframe: true,
          transparent: true,
          opacity: 0.75,
        });
        botObject = new THREE.Mesh(geometry, material);
      } else {
        // Point sphere particles
        const pointsGeom = new THREE.BufferGeometry();
        const positions = geometry.attributes.position.array;
        pointsGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const mat = new THREE.PointsMaterial({
          color: colorPrim,
          size: 0.06,
          transparent: true,
          opacity: 0.9,
        });
        botObject = new THREE.Points(pointsGeom, mat);
      }
    } else if (preset === 'neon_core') {
      // Torus Knot with pulsing core
      const group = new THREE.Group();
      
      const geometry = new THREE.TorusKnotGeometry(1.2, 0.4, 100, 16);
      const material = new THREE.MeshStandardMaterial({
        color: colorPrim,
        wireframe: wireframe,
        roughness: 0.1,
        metalness: 0.8,
      });
      const knot = new THREE.Mesh(geometry, material);
      group.add(knot);

      // Inner glowing core sphere
      const coreGeom = new THREE.SphereGeometry(0.6, 16, 16);
      const coreMat = new THREE.MeshBasicMaterial({
        color: colorSec,
        transparent: true,
        opacity: 0.8,
      });
      const core = new THREE.Mesh(coreGeom, coreMat);
      core.name = 'core';
      group.add(core);

      botObject = group;
    } else if (preset === 'quantum') {
      // Dynamic quantum particle cloud
      const geometry = new THREE.BufferGeometry();
      const count = particleCount;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);

      for (let i = 0; i < count; i++) {
        // Distribute within sphere shell
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = 1.5 + Math.random() * 0.8;

        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);

        colors[i * 3] = colorPrim.r;
        colors[i * 3 + 1] = colorPrim.g;
        colors[i * 3 + 2] = colorPrim.b;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
      });

      botObject = new THREE.Points(geometry, material);
    } else {
      // Hologram Cyber Head or cylinder/ring scan
      const group = new THREE.Group();
      
      const cylinderGeom = new THREE.CylinderGeometry(1.6, 1.6, 3, 32, 16, true);
      const cylinderMat = new THREE.MeshBasicMaterial({
        color: colorPrim,
        wireframe: true,
        transparent: true,
        opacity: 0.4,
      });
      const cylinder = new THREE.Mesh(cylinderGeom, cylinderMat);
      group.add(cylinder);

      // Scanning Laser Ring
      const ringGeom = new THREE.RingGeometry(1.8, 1.9, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: colorSec,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.name = 'scan_ring';
      group.add(ring);

      botObject = group;
    }

    scene.add(botObject);

    // 4. Animation loop
    let clock = new THREE.Clock();

    const animate = () => {
      const elapsedTime = clock.getElapsedTime();
      const timeFactor = isTalking ? 2.5 : 1.0;
      const baseSpeed = 0.01 * speed * timeFactor;

      // Pulse calculations
      const pulse = Math.sin(elapsedTime * 6 * timeFactor) * 0.15 + 1.0;

      if (botObject) {
        // Universal rotation
        botObject.rotation.y += baseSpeed;
        botObject.rotation.x += baseSpeed * 0.5;

        // Custom animations per preset
        if (preset === 'cyber_sphere') {
          if (isTalking) {
            botObject.scale.set(pulse, pulse, pulse);
          } else {
            botObject.scale.set(1, 1, 1);
          }
        } else if (preset === 'neon_core') {
          const core = botObject.getObjectByName('core');
          if (core) {
            const corePulse = (Math.sin(elapsedTime * 8) * 0.2 + 0.9) * (isTalking ? 1.4 : 1.0);
            core.scale.set(corePulse, corePulse, corePulse);
          }
        } else if (preset === 'quantum') {
          // Wave movement for quantum cloud
          const pointsObj = botObject as any;
          const positions = pointsObj.geometry.attributes.position.array as Float32Array;
          const count = positions.length / 3;
          for (let i = 0; i < count; i++) {
            const x = positions[i * 3];
            const y = positions[i * 3 + 1];
            // Dynamic ripple
            positions[i * 3 + 2] += Math.sin(elapsedTime * 2 + x * y) * 0.005 * timeFactor;
          }
          pointsObj.geometry.attributes.position.needsUpdate = true;
        } else if (preset === 'hologram') {
          const ring = botObject.getObjectByName('scan_ring');
          if (ring) {
            // Laser scanning up and down
            ring.position.y = Math.sin(elapsedTime * 3) * 1.5;
          }
        }
      }

      renderer.render(scene, camera);
      requestRef.current = requestAnimationFrame(animate);
    };

    animate();

    // 5. Resize observer
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.domElement.remove();
        rendererRef.current.dispose();
      }
    };
  }, [primaryColor, secondaryColor, preset, isTalking, speed, wireframe, particleCount]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full min-h-[220px] bg-gradient-to-b from-[#0a0b10] to-[#07080b] flex items-center justify-center relative overflow-hidden"
    >
      {/* Hologram scanlines effect */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-40 z-10" />
      
      {/* Laser focus indicators */}
      <div className="absolute top-2 left-2 font-mono text-[8px] text-slate-500 z-10 select-none">
        SYS_3D_RENDER: OK
      </div>
      <div className="absolute bottom-2 right-2 font-mono text-[8px] text-slate-500 z-10 select-none flex items-center gap-1">
        <span className={`w-1.5 h-1.5 rounded-full ${isTalking ? 'bg-green-400 animate-ping' : 'bg-amber-400'}`} />
        PRESET: {preset.toUpperCase()}
      </div>
    </div>
  );
}
