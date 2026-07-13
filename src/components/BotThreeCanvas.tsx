import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface BotThreeCanvasProps {
  primaryColor: string;
  secondaryColor: string;
  preset: 'hologram' | 'neon_core' | 'cyber_sphere' | 'quantum';
  isTalking: boolean;
  speed?: number;
  wireframe?: boolean;
  particleCount?: number;
  customModelUrl?: string;
}

export default function BotThreeCanvas({
  primaryColor,
  secondaryColor,
  preset,
  isTalking,
  speed = 1,
  wireframe = false,
  particleCount = 1200,
  customModelUrl = '',
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
    let baseScale = new THREE.Vector3(1, 1, 1);
    let isCustom = false;

    if (customModelUrl && customModelUrl.trim() !== '') {
      isCustom = true;
      const group = new THREE.Group();
      botObject = group;

      // Loading spinner/placeholder while GLTF loads
      const loaderGeom = new THREE.TorusKnotGeometry(0.8, 0.25, 64, 8);
      const loaderMat = new THREE.MeshBasicMaterial({
        color: colorPrim,
        wireframe: true,
        transparent: true,
        opacity: 0.4,
      });
      const loaderMesh = new THREE.Mesh(loaderGeom, loaderMat);
      loaderMesh.name = 'loading_spinner';
      group.add(loaderMesh);

      // Ring
      const ringGeom = new THREE.RingGeometry(1.2, 1.3, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: colorSec,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.name = 'loading_ring';
      group.add(ring);

      const loader = new GLTFLoader();
      loader.load(
        customModelUrl,
        (gltf) => {
          // Remove spinner on successful load
          group.remove(loaderMesh);
          group.remove(ring);

          const model = gltf.scene;

          // Compute bounds
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());

          // Center the model relative to the group
          model.position.x = -center.x;
          model.position.y = -center.y;
          model.position.z = -center.z;

          // Scale model to fit in a 3.0 cube
          const maxDim = Math.max(size.x, size.y, size.z);
          if (maxDim > 0) {
            const scale = 3.0 / maxDim;
            group.scale.set(scale, scale, scale);
            baseScale.set(scale, scale, scale);
          }

          // Traverse and color child meshes with primaryColor
          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              // Apply material with custom glowing style or wireframe
              child.material = new THREE.MeshStandardMaterial({
                color: colorPrim,
                roughness: 0.1,
                metalness: 0.8,
                wireframe: wireframe,
                transparent: true,
                opacity: 0.85,
              });
            }
          });

          group.add(model);
          console.log('Custom 3D model loaded successfully:', customModelUrl);
        },
        undefined,
        (err) => {
          console.error('Error loading custom GLTF:', err);
          // Fall back to showing the wireframe knot in red to alert user
          loaderMesh.material.color.setHex(0xef4444);
        }
      );
    } else if (preset === 'cyber_sphere') {
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
        if (isCustom) {
          // General dynamic hover/pulse effect for custom GLB models
          if (isTalking) {
            botObject.scale.set(pulse * baseScale.x, pulse * baseScale.y, pulse * baseScale.z);
          } else {
            botObject.scale.set(baseScale.x, baseScale.y, baseScale.z);
          }
        } else if (preset === 'cyber_sphere') {
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
  }, [primaryColor, secondaryColor, preset, isTalking, speed, wireframe, particleCount, customModelUrl]);

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
        PRESET: {customModelUrl ? 'CUSTOM GLB' : preset.toUpperCase()}
      </div>
    </div>
  );
}
