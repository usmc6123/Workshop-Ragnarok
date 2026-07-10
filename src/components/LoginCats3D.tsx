import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

const ASSET_BASE_URL = (import.meta as any).env?.VITE_ASSET_BASE_URL || '/models/';

const CAT_CLIPS = {
  standIdle: 'SKM_Cat|SKM_Cat|Cat_Stand',
  sit: 'SKM_Cat|SKM_Cat|Cat_Sit',
  walk: 'SKM_Cat|SKM_Cat|Cat_Walk',
  trot: 'SKM_Cat|SKM_Cat|Cat_Trot',
  run: 'SKM_Cat|SKM_Cat|Cat_Run',
  dash: 'SKM_Cat|SKM_Cat|Cat_Dash',
  idle03: 'SKM_Cat|SKM_Cat|Cat_Idle03',
  idle04: 'SKM_Cat|SKM_Cat|Cat_Idle04'
};

export default function LoginCats3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let animationFrameId: number;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = null;

    // 2. Camera setup
    const rect = container.getBoundingClientRect();
    const camera = new THREE.PerspectiveCamera(45, rect.width / rect.height, 0.1, 100);
    camera.position.set(0, 1.2, 5.2);
    camera.lookAt(0, 0.1, 0);

    function getMobileZoom(width: number) {
      if (width <= 480) return 0.55;
      if (width <= 768) return 0.75;
      return 1.0;
    }

    camera.zoom = getMobileZoom(rect.width);
    camera.updateProjectionMatrix();

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(rect.width, rect.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    container.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
    scene.add(ambientLight);

    // Front-right key light
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(4, 5, 4);
    scene.add(keyLight);

    // Deep Orange rim light from behind (gives the glowing outline)
    const rimLight = new THREE.DirectionalLight(0xff5500, 3.8);
    rimLight.position.set(-3, 2, -4);
    scene.add(rimLight);

    // Accent soft orange floor glow
    const floorGlow = new THREE.PointLight(0xff7a1a, 2.5, 8);
    floorGlow.position.set(0, -0.6, 1.5);
    scene.add(floorGlow);

    // Viewport-aware boundaries on the floor plane (y = -1.1)
    let bounds = { minX: -4.0, maxX: 4.0, minZ: -1.5, maxZ: 1.5 };
    function recomputeBounds() {
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 1.1);
      const raycaster = new THREE.Raycaster();
      const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      
      corners.forEach(([nx, ny]) => {
        raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera);
        const pt = new THREE.Vector3();
        const intersected = raycaster.ray.intersectPlane(groundPlane, pt);
        if (intersected) {
          const dist = camera.position.distanceTo(pt);
          if (dist < 50) {
            minX = Math.min(minX, pt.x);
            maxX = Math.max(maxX, pt.x);
            minZ = Math.min(minZ, pt.z);
            maxZ = Math.max(maxZ, pt.z);
          }
        }
      });

      // Clamp to absolute safe limits for the full viewport background view
      minX = Math.max(-8.0, Math.min(8.0, minX));
      maxX = Math.max(-8.0, Math.min(8.0, maxX));
      minZ = Math.max(-3.0, Math.min(3.0, minZ));
      maxZ = Math.max(-3.0, Math.min(3.0, maxZ));

      if (minX > maxX) { const tmp = minX; minX = maxX; maxX = tmp; }
      if (minZ > maxZ) { const tmp = minZ; minZ = maxZ; maxZ = tmp; }

      if (maxX - minX < 2) {
        const mid = (minX + maxX) / 2;
        minX = mid - 1.2;
        maxX = mid + 1.2;
      }
      if (maxZ - minZ < 2) {
        const mid = (minZ + maxZ) / 2;
        minZ = mid - 1.0;
        maxZ = mid + 1.0;
      }

      const pad = 0.4; // Small padding margin for the login console bounds
      bounds = { minX: minX + pad, maxX: maxX - pad, minZ: minZ + pad, maxZ: maxZ - pad };

      if (bounds.minX > bounds.maxX) {
        const mid = (bounds.minX + bounds.maxX) / 2;
        bounds.minX = mid - 0.8;
        bounds.maxX = mid + 0.8;
      }
      if (bounds.minZ > bounds.maxZ) {
        const mid = (bounds.minZ + bounds.maxZ) / 2;
        bounds.minZ = mid - 0.6;
        bounds.maxZ = mid + 0.6;
      }
    }

    recomputeBounds();

    // 5. Assets loading
    const loader = new GLTFLoader();
    let cooperGltf: any = null;
    let roscoeGltf: any = null;
    let cooperProgress = 0;
    let roscoeProgress = 0;

    let cooperRoot: THREE.Object3D | null = null;
    let roscoeRoot: THREE.Object3D | null = null;
    let cooperMixer: THREE.AnimationMixer | null = null;
    let roscoeMixer: THREE.AnimationMixer | null = null;
    let cooperHead: THREE.Object3D | null = null;
    let roscoeHead: THREE.Object3D | null = null;

    const cats: any[] = [];

    // Mouse tracking vectors
    const mouse = new THREE.Vector2(0, 0);
    const targetMouse = new THREE.Vector2(0, 0);

    const onMouseMove = (e: MouseEvent) => {
      // Calculate normalized mouse coordinates relative to window center
      targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', onMouseMove);

    function updateProgress() {
      if (disposed) return;
      setProgress(Math.round(((cooperProgress + roscoeProgress) / 2) * 100));
    }

    function playClip(cat: any, clipName: string, opts: any = {}) {
      if (cat.userData.currentClip === clipName) return;
      const next = cat.clipActions[clipName];
      if (!next) return;
      const prev = cat.userData.currentClip ? cat.clipActions[cat.userData.currentClip] : null;
      next.reset();
      next.setLoop(opts.loop === false ? THREE.LoopOnce : THREE.LoopRepeat);
      next.clampWhenFinished = opts.loop === false;
      next.play();
      if (prev) prev.crossFadeTo(next, opts.fade || 0.4, false);
      cat.userData.currentClip = clipName;
    }

    function pickWaypoint(cat: any) {
      cat.userData.waypoint.set(
        bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
        -1.1,
        bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ)
      );
    }

    function walkToward(cat: any, dt: number, point: THREE.Vector3, speed: number) {
      const dir = new THREE.Vector3().subVectors(point, cat.root.position);
      dir.y = 0;
      const dist = dir.length();
      if (dist > 0.05) dir.normalize();

      const targetAngle = Math.atan2(dir.x, dir.z);
      let diff = targetAngle - cat.root.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      cat.root.rotation.y += diff * 0.15; // Smooth rotation interpolation

      cat.root.position.addScaledVector(dir, dt * speed);
      cat.root.position.x = Math.max(bounds.minX, Math.min(bounds.maxX, cat.root.position.x));
      cat.root.position.z = Math.max(bounds.minZ, Math.min(bounds.maxZ, cat.root.position.z));

      return dist;
    }

    function updateCat(cat: any, dt: number) {
      const ud = cat.userData;

      // Safety boundary check
      const px = cat.root.position.x;
      const pz = cat.root.position.z;
      const isOutside = px < bounds.minX - 0.1 || px > bounds.maxX + 0.1 || pz < bounds.minZ - 0.1 || pz > bounds.maxZ + 0.1;
      if (isOutside) {
        cat.root.position.x = Math.max(bounds.minX, Math.min(bounds.maxX, px));
        cat.root.position.z = Math.max(bounds.minZ, Math.min(bounds.maxZ, pz));
        if (ud.state === 'patrol') {
          pickWaypoint(cat);
        }
      }

      if (ud.state === 'patrol') {
        ud.idleTimer -= dt;
        const dist = cat.root.position.distanceTo(ud.waypoint);

        const isWaypointOutside = ud.waypoint.x < bounds.minX || ud.waypoint.x > bounds.maxX || ud.waypoint.z < bounds.minZ || ud.waypoint.z > bounds.maxZ;
        if (isWaypointOutside) {
          pickWaypoint(cat);
        }

        if (dist < 0.35 && ud.idleTimer <= 0) {
          ud.state = 'idle';
          const idles = [CAT_CLIPS.sit, CAT_CLIPS.standIdle, CAT_CLIPS.idle03, CAT_CLIPS.idle04];
          ud.currentIdleClip = idles[Math.floor(Math.random() * idles.length)];
          ud.idleDuration = 3.5 + Math.random() * 4.5;
        }

        if (dist >= 0.35) {
          walkToward(cat, dt, ud.waypoint, 0.75); // Calm walking speed
          playClip(cat, CAT_CLIPS.walk);
        } else {
          playClip(cat, CAT_CLIPS.standIdle);
        }
      } else if (ud.state === 'idle') {
        ud.idleDuration -= dt;
        playClip(cat, ud.currentIdleClip || CAT_CLIPS.sit);

        if (ud.idleDuration <= 0) {
          ud.state = 'patrol';
          pickWaypoint(cat);
          ud.idleTimer = 1.5 + Math.random() * 2.0;
        }
      }
    }

    function getSafeSpawnPosition(minDist = 2.5) {
      const maxRetries = 25;
      let largestMinDist = -1;
      let chosenX = 0, chosenZ = 0;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const rx = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
        const rz = bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ);
        
        let currentMinDist = Infinity;
        cats.forEach((cat) => {
          const dx = cat.root.position.x - rx;
          const dz = cat.root.position.z - rz;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < currentMinDist) currentMinDist = dist;
        });

        if (currentMinDist >= minDist) {
          return new THREE.Vector3(rx, -1.1, rz);
        }

        if (currentMinDist > largestMinDist) {
          largestMinDist = currentMinDist;
          chosenX = rx;
          chosenZ = rz;
        }
      }

      return new THREE.Vector3(chosenX, -1.1, chosenZ);
    }

    function initScene() {
      if (disposed) return;

      setLoading(false);
      clock.start();
      animate();

      // Spawn Cooper
      setTimeout(() => {
        if (disposed) return;
        const cooperPos = getSafeSpawnPosition(2.5);
        cooperRoot = cloneSkeleton(cooperGltf.scene);
        cooperRoot.traverse((obj: any) => {
          if (obj.isMesh && obj.material) {
            obj.material = obj.material.clone();
            obj.material.metalness = 0.0;
            obj.material.roughness = 0.5;
          }
          if (obj.isBone) {
            const name = obj.name.toLowerCase();
            if (name.includes('head')) {
              cooperHead = obj;
            } else if (!cooperHead && name.includes('neck')) {
              cooperHead = obj;
            }
          }
        });
        cooperRoot.scale.setScalar(0.01); // Start small for transition
        cooperRoot.position.copy(cooperPos);
        cooperRoot.rotation.y = 0.45; // Turn slightly inward
        scene.add(cooperRoot);

        // Play Cooper Idle Animation
        cooperMixer = new THREE.AnimationMixer(cooperRoot);
        const cooperObj = {
          root: cooperRoot,
          mixer: cooperMixer,
          clipActions: {} as any,
          userData: {
            name: 'Cooper',
            state: 'idle',
            currentIdleClip: CAT_CLIPS.sit,
            idleDuration: 2.0,
            idleTimer: 1.0,
            waypoint: cooperPos.clone(),
            currentClip: null,
            spawnAge: 0
          }
        };
        cooperGltf.animations.forEach((clip: any) => {
          cooperObj.clipActions[clip.name] = cooperMixer!.clipAction(clip);
        });
        cats.push(cooperObj);
        pickWaypoint(cooperObj);
      }, 0);

      // Spawn Roscoe with a 350ms delay
      setTimeout(() => {
        if (disposed) return;
        const roscoePos = getSafeSpawnPosition(2.5);
        roscoeRoot = cloneSkeleton(roscoeGltf.scene);
        roscoeRoot.traverse((obj: any) => {
          if (obj.isMesh && obj.material) {
            obj.material = obj.material.clone();
            obj.material.metalness = 0.0;
            obj.material.roughness = 0.85;
          }
          if (obj.isBone) {
            const name = obj.name.toLowerCase();
            if (name.includes('head')) {
              roscoeHead = obj;
            } else if (!roscoeHead && name.includes('neck')) {
              roscoeHead = obj;
            }
          }
        });
        roscoeRoot.scale.setScalar(0.01); // Start small for transition
        roscoeRoot.position.copy(roscoePos);
        roscoeRoot.rotation.y = -0.45; // Turn slightly inward
        scene.add(roscoeRoot);

        // Play Roscoe Idle Animation
        roscoeMixer = new THREE.AnimationMixer(roscoeRoot);
        const roscoeObj = {
          root: roscoeRoot,
          mixer: roscoeMixer,
          clipActions: {} as any,
          userData: {
            name: 'Roscoe',
            state: 'idle',
            currentIdleClip: CAT_CLIPS.idle03,
            idleDuration: 3.0,
            idleTimer: 2.0,
            waypoint: roscoePos.clone(),
            currentClip: null,
            spawnAge: 0
          }
        };
        roscoeGltf.animations.forEach((clip: any) => {
          roscoeObj.clipActions[clip.name] = roscoeMixer!.clipAction(clip);
        });
        cats.push(roscoeObj);
        pickWaypoint(roscoeObj);
      }, 350);
    }

    const clock = new THREE.Clock();

    function animate() {
      if (disposed) return;
      animationFrameId = requestAnimationFrame(animate);

      const dt = Math.min(clock.getDelta(), 0.1);
      
      // Update cats free-roaming path and animation mixes
      cats.forEach((cat) => {
        updateCat(cat, dt);
        cat.mixer.update(dt);

        const ud = cat.userData;
        if (ud.spawnAge !== undefined && ud.spawnAge < 0.4) {
          ud.spawnAge += dt;
          const progress = Math.min(ud.spawnAge / 0.4, 1.0);
          const scaleVal = progress * (2 - progress) * 2.2; // 2.2 is target scale
          cat.root.scale.setScalar(scaleVal);
          
          cat.root.traverse((obj: any) => {
            if (obj.isMesh && obj.material) {
              obj.material.transparent = true;
              obj.material.opacity = progress;
            }
          });
        }
      });

      // Smooth mouse coordinates
      mouse.x = THREE.MathUtils.lerp(mouse.x, targetMouse.x, 0.08);
      mouse.y = THREE.MathUtils.lerp(mouse.y, targetMouse.y, 0.08);

      // Apply mouse tracking to Cooper's head on top of roaming
      if (cooperHead) {
        // Clamp angles to look natural
        const cooperYaw = mouse.x * 0.45 - 0.2;
        const cooperPitch = mouse.y * 0.25;
        cooperHead.rotation.y = cooperYaw;
        cooperHead.rotation.x = cooperPitch;
      }

      // Apply mouse tracking to Roscoe's head on top of roaming
      if (roscoeHead) {
        const roscoeYaw = mouse.x * 0.45 + 0.2;
        const roscoePitch = mouse.y * 0.25;
        roscoeHead.rotation.y = roscoeYaw;
        roscoeHead.rotation.x = roscoePitch;
      }

      renderer.render(scene, camera);
    }

    function checkStart() {
      if (cooperGltf && roscoeGltf) {
        initScene();
      }
    }

    // Load Cooper model
    loader.load(
      ASSET_BASE_URL + 'cooper.glb',
      (gltf) => {
        cooperGltf = gltf;
        cooperProgress = 1;
        updateProgress();
        checkStart();
      },
      (xhr) => {
        if (xhr.lengthComputable) {
          cooperProgress = xhr.loaded / xhr.total;
          updateProgress();
        }
      },
      (err) => {
        console.error('Failed to load cooper.glb', err);
        setError('Failed to deploy Cooper unit');
      }
    );

    // Load Roscoe model
    loader.load(
      ASSET_BASE_URL + 'roscoe.glb',
      (gltf) => {
        roscoeGltf = gltf;
        roscoeProgress = 1;
        updateProgress();
        checkStart();
      },
      (xhr) => {
        if (xhr.lengthComputable) {
          roscoeProgress = xhr.loaded / xhr.total;
          updateProgress();
        }
      },
      (err) => {
        console.error('Failed to load roscoe.glb', err);
        setError('Failed to deploy Roscoe unit');
      }
    );

    function onResize() {
      if (!disposed && container) {
        const dRect = container.getBoundingClientRect();
        camera.aspect = dRect.width / dRect.height;
        camera.zoom = getMobileZoom(dRect.width);
        camera.updateProjectionMatrix();
        renderer.setSize(dRect.width, dRect.height);
        recomputeBounds();
      }
    }
    window.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full" style={{ pointerEvents: 'none' }} />
  );
}
