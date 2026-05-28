/**
 * scene.js — Three.js scene, orbit controls, VRM loader, centering, idle animator
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

let _avatarHeight = 1.7;

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(28, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0.9, 2.6);

  // OrbitControls — ENABLED so users can drag / zoom / pan
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.9, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance  = 0.3;
  controls.maxDistance  = 12;
  controls.mouseButtons = {
    LEFT:   THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT:  THREE.MOUSE.PAN,
  };
  controls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN,
  };

  // Neutral three-point lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(1.5, 3, 2.5);
  key.castShadow = true;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xddeeff, 0.45);
  fill.position.set(-2, 1.5, -1);
  scene.add(fill);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { renderer, scene, camera, controls };
}

export async function loadVRM(scene, url, onProgress) {
  const loader = new GLTFLoader();
  loader.register(p => new VRMLoaderPlugin(p));
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      gltf => {
        const vrm = gltf.userData.vrm;
        if (!vrm) { reject(new Error('Not a valid VRM file')); return; }
        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.removeUnnecessaryJoints(gltf.scene);
        VRMUtils.rotateVRM0(vrm);
        scene.add(vrm.scene);
        resolve(vrm);
      },
      p => onProgress?.(Math.round(p.loaded / (p.total || 1) * 100)),
      reject
    );
  });
}

/**
 * Center the avatar in the viewport and set camera distance to show it fully.
 * The avatar is translated so its feet are at Y=0 and its center is at X=Z=0.
 * Camera is positioned so the full avatar fits vertically with comfortable padding.
 */
export function centerAndFitVRM(vrm, camera, controls) {
  vrm.scene.updateWorldMatrix(true, true);

  const box    = new THREE.Box3().setFromObject(vrm.scene);
  const size   = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  // Translate so X/Z centred and feet at Y = 0
  vrm.scene.position.x += -center.x;
  vrm.scene.position.z += -center.z;
  vrm.scene.position.y += -box.min.y;

  const height = size.y;
  const width  = size.x;
  _avatarHeight = height;

  // Use the taller of height or width to ensure avatar fits in frame
  const aspect  = window.innerWidth / window.innerHeight;
  const fovRad  = (camera.fov * Math.PI) / 180;
  // Distance to fit height in view
  const distH   = (height * 0.5) / Math.tan(fovRad * 0.5);
  // Distance to fit width in view (accounting for aspect)
  const distW   = (width  * 0.5) / Math.tan((fovRad * aspect) * 0.5);
  const dist    = Math.max(distH, distW) * 1.25; // 25% padding

  // Orbit target = avatar vertical center
  const targetY = height * 0.5;

  camera.position.set(0, targetY, dist);
  controls.target.set(0, targetY, 0);
  controls.update();
}

/**
 * Smooth-animate camera to a named preset, scaled to current avatar height.
 */
export function setCameraPreset(camera, controls, name) {
  const h = _avatarHeight;
  const fovRad = (camera.fov * Math.PI) / 180;
  const fullDist = (h * 0.5 / Math.tan(fovRad * 0.5)) * 1.25;

  const presets = {
    front: { pos: [0,       h * 0.50, fullDist],       target: [0, h * 0.50, 0] },
    bust:  { pos: [0,       h * 0.78, fullDist * 0.45], target: [0, h * 0.78, 0] },
    side:  { pos: [h * 0.7, h * 0.50, fullDist * 0.7],  target: [0, h * 0.50, 0] },
    full:  { pos: [0,       h * 0.42, fullDist * 1.1],  target: [0, h * 0.42, 0] },
  };

  const preset = presets[name];
  if (!preset) return;

  const sp = camera.position.clone();
  const ep = new THREE.Vector3(...preset.pos);
  const st = controls.target.clone();
  const et = new THREE.Vector3(...preset.target);
  const dur = 600, start = performance.now();

  function tick(now) {
    const t = Math.min((now - start) / dur, 1);
    const e = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(sp, ep, e);
    controls.target.lerpVectors(st, et, e);
    controls.update();
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ── Idle animator ── runs breathing + blink only when no tracking ──────────
// IMPORTANT: does NOT call vrm.update() — that is the rigger's responsibility.
export class IdleAnimator {
  constructor(vrm) {
    this.vrm = vrm;
    this.t = 0;
    this.blinkTimer = 1.5 + Math.random() * 2;
    this.blinkPhase = 'open'; // open | closing | opening
    this.blinkT = 0;
  }

  // Only call this when tracking is NOT active
  update(delta) {
    if (!this.vrm) return;
    this.t += delta;

    // Gentle breathing
    const hips  = this.vrm.humanoid?.getNormalizedBoneNode('hips');
    const spine = this.vrm.humanoid?.getNormalizedBoneNode('spine');
    if (hips)  hips.position.y  = Math.sin(this.t * 0.85) * 0.003;
    if (spine) spine.rotation.z = Math.sin(this.t * 0.65) * 0.007;

    // Idle eye drift
    if (this.vrm.lookAt?.applier) {
      this.vrm.lookAt.applier.applyYawPitch(
        Math.sin(this.t * 0.27) * 0.10,
        Math.sin(this.t * 0.19) * 0.07
      );
    }

    // Autonomous blink
    this.blinkTimer -= delta;
    const eb = this.vrm.expressionManager;
    if (this.blinkTimer <= 0 && this.blinkPhase === 'open') {
      this.blinkPhase = 'closing';
      this.blinkT = 0;
      this.blinkTimer = 2 + Math.random() * 4;
    }
    if (this.blinkPhase === 'closing') {
      this.blinkT += delta * 14;
      const v = Math.min(this.blinkT, 1);
      eb?.setValue('blinkLeft', v);
      eb?.setValue('blinkRight', v);
      if (v >= 1) { this.blinkPhase = 'opening'; this.blinkT = 0; }
    }
    if (this.blinkPhase === 'opening') {
      this.blinkT += delta * 10;
      const v = Math.max(1 - this.blinkT, 0);
      eb?.setValue('blinkLeft', v);
      eb?.setValue('blinkRight', v);
      if (v <= 0) this.blinkPhase = 'open';
    }
    // vrm.update() NOT called here — rigger owns it
  }
}
