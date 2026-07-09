import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

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

  useEffect(() => {
    const hostEl = hostRef.current;
    if (!hostEl) return;

    let disposed = false;
    let animationFrameId = null;

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 16, 15);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
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
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
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
      tex.encoding = THREE.sRGBEncoding;
      featherTexture = tex;
    });

    let cooperGltf = null, roscoeGltf = null, birdGltf = null;
    let cooperProgress = 0, roscoeProgress = 0, birdProgress = 0;
    function updateProgress() {
      if (disposed) return;
      setLoadProgress(((cooperProgress + roscoeProgress + birdProgress) / 3) * 100);
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
      const tint = birdTints[Math.floor(Math.random() * birdTints.length)];
      birds.push(makeBirdFromGltf(tint));
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

    function explodeBird(bird) {
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

      scene.remove(bird.root);
      const idx = birds.indexOf(bird);
      if (idx > -1) birds.splice(idx, 1);

      scoreCount++;
      setScore(scoreCount);
      setTimeout(() => { if (!disposed && birds.length < 6) spawnBird(); }, 1500 + Math.random() * 1500);
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
      bird.mixer.update(dt);
    }

    const raycaster = new THREE.Raycaster();
    const mouseVec = new THREE.Vector2();
    function onClick(event) {
      mouseVec.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseVec.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouseVec, camera);
      const birdRoots = birds.map((b) => b.root);
      const hits = raycaster.intersectObjects(birdRoots, true);
      if (hits.length === 0) return;

      let obj = hits[0].object;
      let matchedBird = null;
      while (obj) {
        matchedBird = birds.find((b) => b.root === obj);
        if (matchedBird) break;
        obj = obj.parent;
      }
      if (!matchedBird) return;

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
          position: 'fixed', inset: 0, zIndex: 10001, background: '#0d1117',
          color: '#9cffb0', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Courier New', monospace", gap: 14, pointerEvents: 'auto'
        }}>
          <div>Loading Cooper, Roscoe &amp; the bird…</div>
          <div style={{ width: 280, height: 8, background: '#1a212b', border: '1px solid #2a3a2a', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${loadProgress}%`, background: '#3a9a55', transition: 'width 0.2s' }} />
          </div>
          {loadError && (
            <div style={{ color: '#ff6a5a', maxWidth: 400, textAlign: 'center', fontSize: 12, padding: '0 20px' }}>
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
    </div>
  );
}
