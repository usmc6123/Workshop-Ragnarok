import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { LOGO_URL } from '../constants/branding';

/**
 * Cooper & Roscoe: Laser Patrol
 * ------------------------------------------------------------
 * Full-page overlay: two 3D cats wander the dashboard, birds fly
 * around, click a bird within range and the nearest cat zaps it
 * with laser eyes -> feather poof.
 *
 * ASSET LOADING
 * By default this loads cooper.glb / roscoe.glb / bird.glb /
 * feather-atlas.png from ASSET_BASE_URL below. Point that at your
 * Cloudflare R2 public bucket URL once it's set up, e.g.:
 *   const ASSET_BASE_URL = 'https://pub-xxxxxxxx.r2.dev/';
 * Or leave it as '/models/' to load from your Vite public/ folder
 * for local dev (put the same 4 files in public/models/).
 *
 * USAGE
 *   import CatLaserOverlay from './CatLaserOverlay';
 *   ... inside your Dashboard page's JSX:
 *   <CatLaserOverlay />
 */

const ASSET_BASE_URL = import.meta.env.VITE_ASSET_BASE_URL || '/models/';

const CREATURE_TIERS = [
  null,
  {
    file: 'charizard.glb',
    moveClip: 'pm0006_00_00_00030_walk01_loop',
    hitClips: ['pm0006_00_00_00500_damage01', 'pm0006_00_00_00501_damage02'],
    flourishClips: ['pm0006_00_00_00300_roar01', 'pm0006_00_00_00320_refresh01', 'pm0006_00_00_00560_notice01', 'pm0006_00_00_00400_attack01', 'pm0006_00_00_00410_attack02', 'pm0006_00_00_00450_rangeattack01', 'pm0006_00_00_00550_glad01', 'pm0006_00_00_00563_hate01'],
    rootBones: ['origin_109', 'waist_108', 'hips_107'],
    killsToAdvance: 5,
  },
  {
    file: 'goku.glb',
    moveClip: 'walk_CINEMA_4D_Main',
    hitClips: ['hit 1_CINEMA_4D_Main','hit 2_CINEMA_4D_Main','hit 3_CINEMA_4D_Main','hit 4_CINEMA_4D_Main','hit 5_CINEMA_4D_Main','hit 6_CINEMA_4D_Main','hit 7_CINEMA_4D_Main','hit 8_CINEMA_4D_Main','hit 9_CINEMA_4D_Main','hit 10_CINEMA_4D_Main'],
    flourishClips: ['taunt_CINEMA_4D_Main', 'ready_CINEMA_4D_Main', 'idle_CINEMA_4D_Main', 'kick 1_CINEMA_4D_Main', 'kick 2_CINEMA_4D_Main', 'kick 3_CINEMA_4D_Main', 'kick 4_CINEMA_4D_Main', 'kick 5_CINEMA_4D_Main', 'kick 6_CINEMA_4D_Main', 'kick 7_CINEMA_4D_Main', 'kick 8_CINEMA_4D_Main', 'hit 5_CINEMA_4D_Main', 'hit 6_CINEMA_4D_Main', 'hit 7_CINEMA_4D_Main', 'hit 8_CINEMA_4D_Main', 'hit 9_CINEMA_4D_Main'],
    rootBones: ['mixamorig_Hips_01'],
    killsToAdvance: 5,
  },
  {
    file: 'mutant.glb',
    moveClip: 'walk',
    hitClips: ['death01'],
    flourishClips: ['attack01', 'attack02', 'attack03', 'attack04', 'idle01', 'rage01', 'rage02'],
    rootBones: [],
    killsToAdvance: 5,
    waveSize: 10,
    finalWaveClearCount: 5,
    isFinalWave: true,
  },
];

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
const BIRD_CLIPS = {
  fly1: 'fly1_bird',
  fly2: 'fly2_bird',
  fly3: 'fly3_bird'
};
const FEATHER_ATLAS_COLS = 4;
const FEATHER_ATLAS_ROWS = 2;
const FIRE_RANGE = 6.5;

export default function CatLaserOverlay() {
  const hostRef = useRef(null);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const [showFinaleBanner, setShowFinaleBanner] = useState(false);

  useEffect(() => {
    const hostEl = hostRef.current;
    if (!hostEl) return;

    let disposed = false;
    let animationFrameId = null;

    const scene = new THREE.Scene();
    scene.background = null;

    const initialRect = hostEl.getBoundingClientRect();
    const camera = new THREE.PerspectiveCamera(50, initialRect.width / initialRect.height, 0.1, 200);
    camera.position.set(0, 16, 15);
    camera.lookAt(0, 0, 0);

    function getMobileZoom(width) {
      if (width <= 480) return 0.45;
      if (width <= 768) return 0.6;
      return 1;
    }

    camera.zoom = getMobileZoom(initialRect.width);
    camera.updateProjectionMatrix();

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(initialRect.width, initialRect.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    hostEl.appendChild(renderer.domElement);

    let bounds = { minX: -8, maxX: 8, minZ: -6, maxZ: 6 };
    function recomputeBounds() {
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const raycaster = new THREE.Raycaster();
      const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      corners.forEach(([nx, ny]) => {
        raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera);
        const pt = new THREE.Vector3();
        raycaster.ray.intersectPlane(groundPlane, pt);
        if (pt) {
          minX = Math.min(minX, pt.x); maxX = Math.max(maxX, pt.x);
          minZ = Math.min(minZ, pt.z); maxZ = Math.max(maxZ, pt.z);
        }
      });
      const pad = 1.2;
      bounds = { minX: minX + pad, maxX: maxX - pad, minZ: minZ + pad, maxZ: maxZ - pad };
    }

    function onResize() {
      const rect = hostEl.getBoundingClientRect();
      camera.aspect = rect.width / rect.height;
      camera.zoom = getMobileZoom(rect.width);
      camera.updateProjectionMatrix();
      renderer.setSize(rect.width, rect.height);
      recomputeBounds();
    }
    window.addEventListener('resize', onResize);

    const hemi = new THREE.HemisphereLight(0x99aaff, 0x334433, 2.2);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 1.8);
    sun.position.set(8, 14, 6);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xffffff, 1.6);
    fill.position.set(0, 10, 18);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xccddff, 1.1);
    rim.position.set(-6, 8, -10);
    scene.add(rim);
    const ambient = new THREE.AmbientLight(0xffffff, 0.25);
    scene.add(ambient);

    const loader = new GLTFLoader();
    const textureLoader = new THREE.TextureLoader();
    let featherTexture = null;
    textureLoader.load(ASSET_BASE_URL + 'feather-atlas.png', (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      featherTexture = tex;
    });

    let cooperGltf = null, roscoeGltf = null, birdGltf = null;
    let cooperProgress = 0, roscoeProgress = 0, birdProgress = 0;
    function updateProgress() {
      if (disposed) return;
      setLoadProgress(((cooperProgress + roscoeProgress + birdProgress) / 3) * 100);
    }

    let tierIndex = 0;
    let tierKillCount = 0;
    let finalWaveKillCount = 0;
    let goldenMode = false;
    let tierGltf = [null, null, null, null];
    let tierLoading = [false, false, false, false];
    let tierLoadCallbacks = [[], [], [], []];

    function loadTierAsset(tier, onDone) {
      if (tierGltf[tier]) { onDone(tierGltf[tier]); return; }
      tierLoadCallbacks[tier].push(onDone);
      if (tierLoading[tier]) return;
      tierLoading[tier] = true;
      loader.load(ASSET_BASE_URL + CREATURE_TIERS[tier].file,
        (gltf) => {
          const rootBones = CREATURE_TIERS[tier].rootBones || [];
          if (rootBones.length) {
            gltf.animations.forEach((clip) => {
              clip.tracks = clip.tracks.filter((track) => !rootBones.includes(track.name.split('.')[0]));
            });
          }
          tierGltf[tier] = gltf;
          tierLoading[tier] = false;
          const callbacks = tierLoadCallbacks[tier];
          tierLoadCallbacks[tier] = [];
          callbacks.forEach((cb) => cb(gltf));
        },
        undefined,
        (err) => { console.error(`Failed to load tier ${tier} asset`, err); tierLoading[tier] = false; }
      );
    }

    function makeTierCreatureFromGltf(sourceGltf, tier) {
      const root = cloneSkeleton(sourceGltf.scene);
      root.scale.setScalar(1.0);
      scene.add(root);

      if (goldenMode && tier === 2) {
        root.traverse((obj) => {
          if (obj.isMesh && obj.material) {
            obj.material = obj.material.clone();
            if (obj.material.color) {
              obj.material.color.multiply(new THREE.Color(0xffd700));
            } else {
              obj.material.color = new THREE.Color(0xffd700);
            }
          }
        });
      }

      const mixer = new THREE.AnimationMixer(root);
      if (goldenMode && tier === 2) {
        mixer.timeScale = 1.8;
      }
      const clipActions = {};
      sourceGltf.animations.forEach((clip) => { clipActions[clip.name] = mixer.clipAction(clip); });

      const ang = Math.random() * Math.PI * 2;
      root.position.set(
        bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
        3 + Math.random() * 2,
        bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ)
      );

      const speedMult = (goldenMode && tier === 2) ? 2.5 : 1.0;

      const group = {
        root, mixer, clipActions,
        userData: {
          alive: true,
          vx: Math.cos(ang) * 1.2 * speedMult, vz: Math.sin(ang) * 1.2 * speedMult,
          bobPhase: Math.random() * Math.PI * 2,
          baseY: root.position.y,
          currentClip: null,
          tier,
          flourishTimer: 4 + Math.random() * 4,
          inFlourish: false,
          flourishTimeLeft: 0,
        }
      };
      const moveClip = CREATURE_TIERS[tier].moveClip;
      const action = clipActions[moveClip];
      if (action) { action.reset(); action.setLoop(THREE.LoopRepeat); action.play(); group.userData.currentClip = moveClip; }
      return group;
    }

    const cats = [];
    const birds = [];
    const activeLasers = [];
    const activeBursts = [];
    let scoreCount = 0;

    function makeCatFromGltf(name, sourceGltf, roughnessOverride) {
      const root = cloneSkeleton(sourceGltf.scene);
      root.traverse((obj) => {
        if (obj.isMesh && obj.material) {
          obj.material = obj.material.clone();
          obj.material.metalness = 0.0;
          obj.material.roughness = roughnessOverride != null ? roughnessOverride : 0.85;
          obj.castShadow = false;
        }
      });
      root.userData.forwardOffset = 0;

      root.scale.setScalar(1);
      root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(root);
      const size = new THREE.Vector3(); box.getSize(size);
      const center = new THREE.Vector3(); box.getCenter(center);
      const measuredEyeOffset = new THREE.Vector3(center.x, box.min.y + size.y * 0.78, center.z);

      root.scale.setScalar(4.5);
      scene.add(root);

      const mixer = new THREE.AnimationMixer(root);
      mixer.timeScale = 1.25;
      const clipActions = {};
      sourceGltf.animations.forEach((clip) => { clipActions[clip.name] = mixer.clipAction(clip); });

      return {
        root, mixer, clipActions,
        userData: {
          name, state: 'patrol', target: null,
          waypoint: new THREE.Vector3(0, 0, 0),
          idleTimer: Math.random() * 2,
          currentClip: null,
          eyeOffset: measuredEyeOffset,
          pausePick: null
        }
      };
    }

    function playClip(cat, clipName, opts) {
      opts = opts || {};
      if (cat.userData.currentClip === clipName) return;
      const next = cat.clipActions[clipName];
      if (!next) return;
      const prev = cat.userData.currentClip ? cat.clipActions[cat.userData.currentClip] : null;
      next.reset();
      next.setLoop(opts.loop === false ? THREE.LoopOnce : THREE.LoopRepeat);
      next.clampWhenFinished = opts.loop === false;
      next.play();
      if (prev) prev.crossFadeTo(next, opts.fade || 0.25, false);
      cat.userData.currentClip = clipName;
    }

    function pickWaypoint(cat) {
      cat.userData.waypoint.set(
        bounds.minX + Math.random() * (bounds.maxX - bounds.minX), 0,
        bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ)
      );
    }

    function initCats() {
      const cooper = makeCatFromGltf('Cooper', cooperGltf, 0.45);
      const roscoe = makeCatFromGltf('Roscoe', roscoeGltf, 0.95);
      cooper.root.position.set(-3, 0, 2);
      roscoe.root.position.set(3, 0, -2);
      cats.push(cooper, roscoe);
      cats.forEach(pickWaypoint);
    }

    const birdTints = [0x3a6ea5, 0xb5482a, 0x4a8a4a, 0xc9a227, 0x9a5ab5, 0xd66b6b];

    function makeBirdFromGltf(tintColor) {
      const root = cloneSkeleton(birdGltf.scene);
      root.traverse((obj) => {
        if (obj.isMesh && obj.material) {
          obj.material = obj.material.clone();
          obj.material.color = new THREE.Color(tintColor);
        }
      });
      root.scale.setScalar(1.0);
      scene.add(root);

      const mixer = new THREE.AnimationMixer(root);
      const clipActions = {};
      birdGltf.animations.forEach((clip) => { clipActions[clip.name] = mixer.clipAction(clip); });

      const ang = Math.random() * Math.PI * 2;
      root.position.set(
        bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
        3 + Math.random() * 2,
        bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ)
      );

      const group = {
        root, mixer, clipActions,
        userData: {
          alive: true,
          vx: Math.cos(ang) * 1.2, vz: Math.sin(ang) * 1.2,
          bobPhase: Math.random() * Math.PI * 2,
          baseY: root.position.y,
          currentClip: null
        }
      };
      const flyClip = [BIRD_CLIPS.fly1, BIRD_CLIPS.fly2, BIRD_CLIPS.fly3][Math.floor(Math.random() * 3)];
      playBirdClip(group, flyClip);
      return group;
    }

    function playBirdClip(bird, clipName) {
      if (bird.userData.currentClip === clipName) return;
      const next = bird.clipActions[clipName];
      if (!next) return;
      const prev = bird.userData.currentClip ? bird.clipActions[bird.userData.currentClip] : null;
      next.reset(); next.setLoop(THREE.LoopRepeat); next.play();
      if (prev) prev.crossFadeTo(next, 0.2, false);
      bird.userData.currentClip = clipName;
    }

    function spawnBird() {
      if (tierIndex === 0 && !goldenMode) {
        const tint = birdTints[Math.floor(Math.random() * birdTints.length)];
        birds.push(makeBirdFromGltf(tint));
        return;
      }
      const tier = goldenMode ? 2 : tierIndex;
      if (tierGltf[tier]) {
        birds.push(makeTierCreatureFromGltf(tierGltf[tier], tier));
      } else {
        loadTierAsset(tier, () => {
          const maxCount = goldenMode ? 10 : (CREATURE_TIERS[tierIndex]?.waveSize || 6);
          if (!disposed && birds.length < maxCount) birds.push(makeTierCreatureFromGltf(tierGltf[tier], tier));
        });
      }
    }

    function initBirds() {
      for (let i = 0; i < 6; i++) spawnBird();
    }

    function orientBeam(mesh, from, to) {
      mesh.position.copy(from).lerp(to, 0.5);
      const dir = new THREE.Vector3().subVectors(to, from).normalize();
      mesh.setRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
    }

    function fireLaser(cat, bird) {
      const eyeWorld = cat.root.localToWorld(cat.userData.eyeOffset.clone());
      const targetWorld = bird.root.position.clone();
      const dir = new THREE.Vector3().subVectors(targetWorld, eyeWorld);
      const dist = dir.length();

      const coreMat = new THREE.MeshBasicMaterial({
        color: 0xff0000, transparent: true, opacity: 1,
        toneMapped: false, blending: THREE.AdditiveBlending
      });
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, dist, 8, 1, true), coreMat);
      orientBeam(core, eyeWorld, targetWorld);
      scene.add(core);
      activeLasers.push({ mesh: core, life: 0.22, maxLife: 0.22, baseOpacity: 1 });

      const glowMat = new THREE.MeshBasicMaterial({
        color: 0xff1500, transparent: true, opacity: 0.6, depthWrite: false,
        toneMapped: false, blending: THREE.AdditiveBlending
      });
      const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, dist, 8, 1, true), glowMat);
      orientBeam(glow, eyeWorld, targetWorld);
      scene.add(glow);
      activeLasers.push({ mesh: glow, life: 0.22, maxLife: 0.22, baseOpacity: 0.6 });

      const flashMat = new THREE.MeshBasicMaterial({
        color: 0xff2000, transparent: true, opacity: 0.9,
        toneMapped: false, blending: THREE.AdditiveBlending
      });
      const flash = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), flashMat);
      flash.position.copy(targetWorld);
      scene.add(flash);
      activeLasers.push({ mesh: flash, life: 0.3, maxLife: 0.3, baseOpacity: 0.9, isFlash: true });
    }

    function triggerConfettiStorm() {
      const count = 120;
      const featherSprites = [];
      const colors = [
        0xffdd67, // gold
        0xff4444, // red
        0x44ff44, // green
        0x4444ff, // blue
        0xff44ff, // magenta
        0x44ffff, // cyan
        0xffaa44, // orange
      ];

      for (let i = 0; i < count; i++) {
        const material = new THREE.SpriteMaterial({
          color: colors[Math.floor(Math.random() * colors.length)],
          transparent: true,
          opacity: 1,
          rotation: Math.random() * Math.PI * 2
        });
        const sprite = new THREE.Sprite(material);
        
        const rx = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
        const rz = bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ);
        const ry = 10 + Math.random() * 4;
        sprite.position.set(rx, ry, rz);
        
        const scale = 0.25 + Math.random() * 0.35;
        sprite.scale.set(scale, scale, 1);
        scene.add(sprite);

        featherSprites.push({
          sprite,
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 1.5,
            -Math.random() * 1.5 - 1.0,
            (Math.random() - 0.5) * 1.5
          ),
          spinSpeed: (Math.random() - 0.5) * 8,
          driftPhase: Math.random() * Math.PI * 2
        });
      }
      activeBursts.push({ featherSprites, life: 4.5 });
    }

    function triggerFinaleSequence() {
      setShowFinaleBanner(true);
      triggerConfettiStorm();
      
      setTimeout(() => {
        if (!disposed) triggerConfettiStorm();
      }, 1000);

      setTimeout(() => {
        if (disposed) return;
        setShowFinaleBanner(false);
        goldenMode = true;
        console.log("Golden mode activated");
        
        for (let i = 0; i < 10; i++) {
          if (!disposed) spawnBird();
        }
      }, 3500);
    }

    function explodeBird(bird) {
      if (bird.userData.dying) return;
      bird.userData.alive = false;
      const origin = bird.root.position.clone();
      const count = 14;
      const featherSprites = [];

      for (let i = 0; i < count; i++) {
        let material;
        if (featherTexture) {
          material = new THREE.SpriteMaterial({
            map: featherTexture.clone(), transparent: true, opacity: 1,
            rotation: Math.random() * Math.PI * 2
          });
          material.map.needsUpdate = true;
          const col = Math.floor(Math.random() * FEATHER_ATLAS_COLS);
          const row = Math.floor(Math.random() * FEATHER_ATLAS_ROWS);
          material.map.repeat.set(1 / FEATHER_ATLAS_COLS, 1 / FEATHER_ATLAS_ROWS);
          material.map.offset.set(col / FEATHER_ATLAS_COLS, row / FEATHER_ATLAS_ROWS);
        } else {
          material = new THREE.SpriteMaterial({ color: 0xffffff, transparent: true, opacity: 1 });
        }
        const sprite = new THREE.Sprite(material);
        sprite.position.copy(origin);
        const scale = 0.5 + Math.random() * 0.4;
        sprite.scale.set(scale, scale, 1);
        scene.add(sprite);

        featherSprites.push({
          sprite,
          velocity: new THREE.Vector3((Math.random() - 0.5) * 2.6, Math.random() * 2 + 1, (Math.random() - 0.5) * 2.6),
          spinSpeed: (Math.random() - 0.5) * 4,
          driftPhase: Math.random() * Math.PI * 2
        });
      }
      activeBursts.push({ featherSprites, life: 2.2 });

      if (bird.userData.tier && bird.userData.tier > 0) {
        bird.userData.dying = true;
        bird.userData.vx = 0;
        bird.userData.vz = 0;
        bird.userData.inFlourish = false;
        bird.userData.flourishTimeLeft = 0;

        const tierConfig = CREATURE_TIERS[bird.userData.tier];
        if (tierConfig && tierConfig.hitClips && tierConfig.hitClips.length) {
          const clipName = tierConfig.hitClips[Math.floor(Math.random() * tierConfig.hitClips.length)];
          const action = bird.clipActions[clipName];
          if (action) {
            const prev = bird.userData.currentClip ? bird.clipActions[bird.userData.currentClip] : null;
            action.reset();
            action.setLoop(THREE.LoopOnce);
            action.clampWhenFinished = true;
            action.play();
            if (prev) prev.crossFadeTo(action, 0.1, false);
            bird.userData.currentClip = clipName;
          }
        }

        setTimeout(() => {
          if (disposed) return;
          scene.remove(bird.root);
          const idx = birds.indexOf(bird);
          if (idx > -1) birds.splice(idx, 1);

          scoreCount++;
          setScore(scoreCount);

          if (tierIndex < CREATURE_TIERS.length - 1) {
            tierKillCount++;
            if (tierKillCount >= CREATURE_TIERS[tierIndex + 1].killsToAdvance) {
              tierIndex++;
              tierKillCount = 0;
              if (CREATURE_TIERS[tierIndex]?.isFinalWave) {
                finalWaveKillCount = 0;
                console.log("Final wave started, resetting finalWaveKillCount");
              }
              birds.slice().forEach((b) => { scene.remove(b.root); });
              birds.length = 0;
              loadTierAsset(tierIndex, () => {
                const targetCount = CREATURE_TIERS[tierIndex]?.waveSize || 6;
                for (let i = 0; i < targetCount; i++) { if (!disposed) spawnBird(); }
              });
            }
          } else {
            const currentTierConfig = CREATURE_TIERS[tierIndex];
            if (currentTierConfig && currentTierConfig.isFinalWave) {
              finalWaveKillCount++;
              const targetKills = currentTierConfig.finalWaveClearCount || 5;
              console.log(`Final wave kill registered: ${finalWaveKillCount}/${targetKills}`);
              if (finalWaveKillCount >= targetKills) {
                console.log("Final wave depleted, triggering finale");
                // Clear out any mutants still alive and roaming
                birds.slice().forEach((b) => { scene.remove(b.root); });
                birds.length = 0;
                triggerFinaleSequence();
              }
            }
          }

          if (goldenMode || !CREATURE_TIERS[tierIndex]?.isFinalWave) {
            const maxCount = goldenMode ? 10 : (CREATURE_TIERS[tierIndex]?.waveSize || 6);
            setTimeout(() => { if (!disposed && birds.length < maxCount) spawnBird(); }, 1500 + Math.random() * 1500);
          }
        }, 450);
      } else {
        scene.remove(bird.root);
        const idx = birds.indexOf(bird);
        if (idx > -1) birds.splice(idx, 1);

        scoreCount++;
        setScore(scoreCount);

        if (tierIndex < CREATURE_TIERS.length - 1) {
          tierKillCount++;
          if (tierKillCount >= CREATURE_TIERS[tierIndex + 1].killsToAdvance) {
            tierIndex++;
            tierKillCount = 0;
            if (CREATURE_TIERS[tierIndex]?.isFinalWave) {
              finalWaveKillCount = 0;
              console.log("Final wave started, resetting finalWaveKillCount");
            }
            birds.slice().forEach((b) => { scene.remove(b.root); });
            birds.length = 0;
            loadTierAsset(tierIndex, () => {
              const targetCount = CREATURE_TIERS[tierIndex]?.waveSize || 6;
              for (let i = 0; i < targetCount; i++) { if (!disposed) spawnBird(); }
            });
          }
        }

        if (goldenMode || !CREATURE_TIERS[tierIndex]?.isFinalWave) {
          const maxCount = goldenMode ? 10 : (CREATURE_TIERS[tierIndex]?.waveSize || 6);
          setTimeout(() => { if (!disposed && birds.length < maxCount) spawnBird(); }, 1500 + Math.random() * 1500);
        }
      }
    }

    function walkToward(cat, dt, point, speed) {
      const dir = new THREE.Vector3().subVectors(point, cat.root.position);
      dir.y = 0;
      const dist = dir.length();
      if (dist > 0.05) dir.normalize();
      cat.root.rotation.y = Math.atan2(dir.x, dir.z) + cat.root.userData.forwardOffset;
      cat.root.position.addScaledVector(dir, dt * speed);
      return dist;
    }

    function updateCat(cat, dt) {
      const ud = cat.userData;
      if (ud.state === 'patrol') {
        ud.idleTimer -= dt;
        const dist = cat.root.position.distanceTo(ud.waypoint);
        if (dist < 0.4 && ud.idleTimer <= 0) { pickWaypoint(cat); ud.idleTimer = 0.8 + Math.random() * 1.2; }

        if (dist > 0.4) {
          walkToward(cat, dt, ud.waypoint, 2.3);
          playClip(cat, CAT_CLIPS.walk);
        } else {
          const playfulPicks = [CAT_CLIPS.sit, CAT_CLIPS.idle03, CAT_CLIPS.idle04, CAT_CLIPS.standIdle];
          if (!ud.pausePick) ud.pausePick = playfulPicks[Math.floor(Math.random() * playfulPicks.length)];
          playClip(cat, ud.pausePick);
          if (dist < 0.4 && ud.idleTimer <= 0.01) ud.pausePick = null;
        }
      } else if (ud.state === 'stalking') {
        if (!ud.target || !ud.target.userData.alive) { ud.state = 'patrol'; ud.target = null; return; }
        const dist = walkToward(cat, dt, ud.target.root.position, 4.2);
        playClip(cat, CAT_CLIPS.run);
        if (dist <= FIRE_RANGE) { ud.state = 'aiming'; ud.aimTimer = 0.3 + Math.random() * 0.25; }
      } else if (ud.state === 'aiming') {
        if (!ud.target || !ud.target.userData.alive) { ud.state = 'patrol'; ud.target = null; return; }
        const dir = new THREE.Vector3().subVectors(ud.target.root.position, cat.root.position);
        const dist = dir.length();
        if (dist > FIRE_RANGE * 1.3) { ud.state = 'stalking'; return; }
        cat.root.rotation.y = Math.atan2(dir.x, dir.z) + cat.root.userData.forwardOffset;
        playClip(cat, CAT_CLIPS.sit);
        ud.aimTimer -= dt;
        if (ud.aimTimer <= 0) {
          ud.state = 'firing';
          fireLaser(cat, ud.target);
          explodeBird(ud.target);
          ud.target = null;
          ud.fireTimer = 0.4;
          playClip(cat, CAT_CLIPS.dash, { loop: false, fade: 0.1 });
        }
      } else if (ud.state === 'firing') {
        ud.fireTimer -= dt;
        if (ud.fireTimer <= 0) ud.state = 'patrol';
      }
      cat.mixer.update(dt);
    }

    function updateBird(bird, dt, t) {
      const ud = bird.userData;
      bird.root.position.x += ud.vx * dt;
      bird.root.position.z += ud.vz * dt;
      if (bird.root.position.x < bounds.minX || bird.root.position.x > bounds.maxX) ud.vx *= -1;
      if (bird.root.position.z < bounds.minZ || bird.root.position.z > bounds.maxZ) ud.vz *= -1;
      bird.root.position.y = ud.baseY + Math.sin(t * 3 + ud.bobPhase) * 0.35;
      bird.root.rotation.y = Math.atan2(ud.vx, ud.vz);

      if (ud.tier) {
        const tierConfig = CREATURE_TIERS[ud.tier];
        if (ud.inFlourish) {
          ud.flourishTimeLeft -= dt;
          if (ud.flourishTimeLeft <= 0) {
            ud.inFlourish = false;
            ud.flourishTimer = 4 + Math.random() * 5;
            const moveAction = bird.clipActions[tierConfig.moveClip];
            if (moveAction) {
              const prev = bird.clipActions[bird.userData.currentClip];
              moveAction.reset(); moveAction.setLoop(THREE.LoopRepeat); moveAction.play();
              if (prev) prev.crossFadeTo(moveAction, 0.3, false);
              bird.userData.currentClip = tierConfig.moveClip;
            }
          }
        } else if (tierConfig.flourishClips && tierConfig.flourishClips.length) {
          ud.flourishTimer -= dt;
          if (ud.flourishTimer <= 0) {
            const clipName = tierConfig.flourishClips[Math.floor(Math.random() * tierConfig.flourishClips.length)];
            const action = bird.clipActions[clipName];
            if (action) {
              const prev = bird.clipActions[bird.userData.currentClip];
              action.reset(); action.setLoop(THREE.LoopOnce); action.clampWhenFinished = true; action.play();
              if (prev) prev.crossFadeTo(action, 0.25, false);
              bird.userData.currentClip = clipName;
              ud.inFlourish = true;
              ud.flourishTimeLeft = action.getClip().duration;
            }
          }
        }
      }

      bird.mixer.update(dt);
    }

    const raycaster = new THREE.Raycaster();
    const mouseVec = new THREE.Vector2();
    function onClick(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouseVec.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseVec.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouseVec, camera);
      const birdRoots = birds.map((b) => b.root);
      const hits = raycaster.intersectObjects(birdRoots, true);
      console.log('[CatLaserOverlay] click at', event.clientX, event.clientY, '| canvas rect:', rect.width, rect.height, '| birds alive:', birds.length, '| raycast hits:', hits.length);
      if (hits.length === 0) return;

      let obj = hits[0].object;
      let matchedBird = null;
      while (obj) {
        matchedBird = birds.find((b) => b.root === obj);
        if (matchedBird) break;
        obj = obj.parent;
      }
      if (!matchedBird || matchedBird.userData.dying) return;

      let best = null, bd = Infinity;
      cats.forEach((cat) => {
        const d = cat.root.position.distanceTo(matchedBird.root.position);
        if (d < bd) { bd = d; best = cat; }
      });
      if (!best) return;

      best.userData.target = matchedBird;
      best.userData.state = bd <= FIRE_RANGE ? 'aiming' : 'stalking';
      if (best.userData.state === 'aiming') best.userData.aimTimer = 0.3;
    }
    window.addEventListener('click', onClick, true);
    console.log('[CatLaserOverlay] click listener attached');

    function tryStart() {
      if (disposed) return;
      if (cooperGltf && roscoeGltf && birdGltf) {
        setLoading(false);
        recomputeBounds();
        initCats();
        initBirds();
        clock.start();
        animationFrameId = requestAnimationFrame(animate);
      }
    }

    const clock = new THREE.Clock();
    function animate() {
      if (disposed) return;
      animationFrameId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      cats.forEach((cat) => updateCat(cat, dt));
      birds.slice().forEach((bird) => updateBird(bird, dt, t));

      for (let i = activeLasers.length - 1; i >= 0; i--) {
        const l = activeLasers[i];
        l.life -= dt;
        const ratio = Math.max(l.life / l.maxLife, 0);
        if (l.mesh.material) l.mesh.material.opacity = l.baseOpacity * ratio;
        if (l.isFlash) l.mesh.scale.multiplyScalar(1.08);
        if (l.life <= 0) { scene.remove(l.mesh); activeLasers.splice(i, 1); }
      }
      for (let i = activeBursts.length - 1; i >= 0; i--) {
        const b = activeBursts[i];
        b.life -= dt;
        const fadeStart = 0.6;
        const opacity = b.life < fadeStart ? Math.max(b.life / fadeStart, 0) : 1;
        b.featherSprites.forEach((f) => {
          f.velocity.y -= 1.1 * dt;
          f.velocity.x += Math.sin(t * 2 + f.driftPhase) * 0.4 * dt;
          f.velocity.z += Math.cos(t * 2 + f.driftPhase) * 0.4 * dt;
          f.velocity.multiplyScalar(0.985);
          f.sprite.position.addScaledVector(f.velocity, dt);
          f.sprite.material.rotation += f.spinSpeed * dt;
          f.sprite.material.opacity = opacity;
        });
        if (b.life <= 0) {
          b.featherSprites.forEach((f) => scene.remove(f.sprite));
          activeBursts.splice(i, 1);
        }
      }

      renderer.render(scene, camera);
    }

    function loadAll() {
      loader.load(ASSET_BASE_URL + 'cooper.glb',
        (gltf) => { cooperGltf = gltf; cooperProgress = 1; updateProgress(); tryStart(); },
        (xhr) => { if (xhr.lengthComputable) { cooperProgress = xhr.loaded / xhr.total; updateProgress(); } },
        (err) => { if (!disposed) setLoadError('cooper.glb failed to load'); console.error(err); }
      );
      loader.load(ASSET_BASE_URL + 'roscoe.glb',
        (gltf) => { roscoeGltf = gltf; roscoeProgress = 1; updateProgress(); tryStart(); },
        (xhr) => { if (xhr.lengthComputable) { roscoeProgress = xhr.loaded / xhr.total; updateProgress(); } },
        (err) => { if (!disposed) setLoadError('roscoe.glb failed to load'); console.error(err); }
      );
      loader.load(ASSET_BASE_URL + 'bird.glb',
        (gltf) => { birdGltf = gltf; birdProgress = 1; updateProgress(); tryStart(); },
        (xhr) => { if (xhr.lengthComputable) { birdProgress = xhr.loaded / xhr.total; updateProgress(); } },
        (err) => { if (!disposed) setLoadError('bird.glb failed to load'); console.error(err); }
      );
    }
    loadAll();

    // ---- cleanup: critical in React so this never doubles up or leaks ----
    return () => {
      disposed = true;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('click', onClick, true);
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
        }
      });
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }}>
      <div ref={hostRef} style={{ position: 'absolute', inset: 0 }} />

      {loading && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10001, background: '#0a0a0f',
          color: '#f1f5f9', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Courier New', monospace", gap: 14, pointerEvents: 'auto'
        }}>
          <style>{`
            @keyframes logoPulse {
              0%, 100% { transform: scale(1); filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.4)); }
              50% { transform: scale(1.05); filter: drop-shadow(0 0 20px rgba(245, 158, 11, 0.8)); }
            }
            .pulsing-logo {
              animation: logoPulse 2.5s infinite ease-in-out;
            }
          `}</style>
          <img 
            src={LOGO_URL} 
            alt="Workshop Ragnarök" 
            className="pulsing-logo"
            referrerPolicy="no-referrer"
            style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              objectFit: 'cover', 
              border: '2px solid #f59e0b',
              marginBottom: '10px'
            }} 
          />
          <div style={{ color: '#f59e0b', fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 'bold' }}>
            Loading minigame… {Math.round(loadProgress)}%
          </div>
          <div style={{ width: 280, height: 6, background: '#13141a', border: '1px solid #1e2028', borderRadius: 10, overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' }}>
            <div style={{ 
              height: '100%', 
              width: `${loadProgress}%`, 
              background: '#f59e0b', 
              borderRadius: 10,
              boxShadow: '0 0 10px #f59e0b, 0 0 5px #f59e0b',
              transition: 'width 0.2s' 
            }} />
          </div>
          {loadError && (
            <div style={{ color: '#ef4444', maxWidth: 400, textAlign: 'center', fontSize: 12, padding: '0 20px', marginTop: 10 }}>
              {loadError}. Check that cooper.glb, roscoe.glb, bird.glb, and feather-atlas.png are reachable at{' '}
              {ASSET_BASE_URL}.
            </div>
          )}
        </div>
      )}

      {!loading && (
        <div style={{
          position: 'fixed', top: 14, right: 14, zIndex: 10000,
          fontFamily: "'Courier New', monospace", color: '#9cffb0',
          background: 'rgba(0,0,0,0.55)', padding: '8px 12px', borderRadius: 6,
          border: '1px solid #2a2', fontSize: 11, lineHeight: 1.4
        }}>
          <b style={{ color: '#fff' }}>Cooper &amp; Roscoe patrol</b><br />
          click a bird within range<br />
          vaporized: <b style={{ color: '#fff' }}>{score}</b>
        </div>
      )}
      {showFinaleBanner && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 10002,
          fontFamily: "'Courier New', monospace",
          color: '#ffd700',
          background: 'rgba(0,0,0,0.85)',
          padding: '20px 40px',
          borderRadius: 8,
          border: '2px solid #ffd700',
          fontSize: 28,
          fontWeight: 'bold',
          textAlign: 'center',
          boxShadow: '0 0 25px rgba(255, 215, 0, 0.35)',
          letterSpacing: '2px',
          textShadow: '0 0 8px rgba(255,215,0,0.5)',
          pointerEvents: 'none',
        }}>
          🐾 GOOD KITTY! 🐾
        </div>
      )}
    </div>
  );
}
