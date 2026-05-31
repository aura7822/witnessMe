/**
 * main.js — VTuber3D final
 */
import './style.css';
import * as THREE from 'three';
import { createScene, loadVRM, centerAndFitVRM, setCameraPreset, IdleAnimator } from './scene.js';
import { VRMRigger }        from './rigger.js';
import { startTracking }    from './tracker.js';
import { PreviewRenderer }  from './preview.js';
import { SpeechController } from './speech.js';

const $ = id => document.getElementById(id);

// ── Scene ─────────────────────────────────────────────────
const { renderer, scene, camera, controls } = createScene($('avatar-canvas'));
const preview = new PreviewRenderer($('webcam'), $('preview-canvas'));
preview.start();

// ── State ─────────────────────────────────────────────────
const state = {
  vrm: null, rigger: null, idleAnim: null,
  trackingMode: 'body',
  wiggle: false, wiggleClock: 0,
  fpsHistory: [], lastFrame: 0,
  lastMpFrame: 0,          // timestamp of last MediaPipe callback
};

// ── Render loop ───────────────────────────────────────────
const clock  = new THREE.Clock();
let diagTick = 0;

function renderLoop(now) {
  requestAnimationFrame(renderLoop);
  const delta = Math.min(clock.getDelta(), 0.05);

  if (state.vrm && state.rigger) {
    if (state.wiggle) {
      state.wiggleClock += delta;
      state.rigger.wiggleTest(state.wiggleClock);
    } else if (state.rigger.hasTracking) {
      state.rigger.update(delta);
    } else {
      state.idleAnim?.update(delta);
      state.vrm.update(delta);
    }
  }

  controls.update();
  renderer.render(scene, camera);
  updateFPS(now);
  if (++diagTick % 20 === 0) refreshDiag();

  // Live tracking dot: green within 200ms of last callback, grey otherwise
  const alive = (now - state.lastMpFrame) < 200;
  const dot = $('live-dot');
  if (dot) dot.style.background = alive ? '#2e7d32' : '#ccc';
}
requestAnimationFrame(renderLoop);

function updateFPS(now) {
  const d = now - state.lastFrame; state.lastFrame = now;
  if (d > 0) {
    state.fpsHistory.push(1000 / d);
    if (state.fpsHistory.length > 40) state.fpsHistory.shift();
    $('fps-val').textContent = Math.round(
      state.fpsHistory.reduce((a, b) => a + b, 0) / state.fpsHistory.length
    );
  }
}

function refreshDiag() {
  if (!state.rigger) return;
  const d = state.rigger.debug;
  const set = (id, val, good) => {
    const el = $(id); if (!el) return;
    el.textContent = String(val);
    el.className = good === true ? 'ok' : good === false ? 'bad' : '';
  };
  set('d-mp',   d.mpFrames,                  d.mpFrames > 0);
  set('d-wlm',  d.worldLmLen,                d.worldLmLen > 0);
  set('d-plm',  d.poseLmLen,                 d.poseLmLen > 0);
  set('d-flm',  d.faceLmLen,                  d.faceLmLen > 0);
  set('d-face', d.solvedFace ? '✓' : '✗',   d.solvedFace);
  set('d-pose', d.solvedPose ? '✓' : '✗',   d.solvedPose);
  set('d-bone', d.boneFound  ? '✓' : '✗',   d.boneFound);
  set('d-rz',   d.rightArmZ.toFixed(3),      Math.abs(d.rightArmZ) > 0.01);
  set('d-lz',   d.leftArmZ.toFixed(3),       Math.abs(d.leftArmZ)  > 0.01);
  set('d-hy',   d.headY.toFixed(3),          Math.abs(d.headY)     > 0.01);
}

function setLoading(show, text = '') {
  $('loading-text').textContent = text;
  $('loading-overlay').classList.toggle('hidden', !show);
}
function setStatus(type, text) {
  const el = $('tracking-status');
  el.textContent = '● ' + text;
  el.className   = 'status-line ' + type;
}

// ── VRM loading ───────────────────────────────────────────
async function loadModel(file, label) {
  setLoading(true, 'Loading avatar…');
  if (state.vrm) {
    scene.remove(state.vrm.scene);
    state.vrm = null; state.rigger = null; state.idleAnim = null;
  }
  try {
    const url = URL.createObjectURL(file);
    const vrm = await loadVRM(scene, url, pct =>
      setLoading(true, `Loading avatar… ${pct}%`)
    );
    URL.revokeObjectURL(url);
    centerAndFitVRM(vrm, camera, controls);
    state.vrm      = vrm;
    state.rigger   = new VRMRigger(vrm);
    state.idleAnim = new IdleAnimator(vrm);
    speech.onAmplitude = amp => state.rigger?.setLipAmplitude(amp);

    // Bone availability report
    const boneNames = ['hips','spine','chest','neck','head',
      'rightUpperArm','rightLowerArm','leftUpperArm','leftLowerArm'];
    console.group('[VTuber3D] Bone check');
    boneNames.forEach(b => {
      const norm = vrm.humanoid?.getNormalizedBoneNode(b);
      const raw  = vrm.humanoid?.getRawBoneNode(b);
      console.log(`  ${b}: norm=${!!norm} raw=${!!raw}`);
    });
    console.groupEnd();

    $('avatar-name').textContent = label || file.name.replace('.vrm', '');
    setLoading(false);
  } catch (err) {
    console.error('[VTuber3D] VRM load error:', err);
    setLoading(false);
    alert('Could not load VRM file.');
  }
}

// Try multiple CDN sources for default avatar
async function loadDefault() {
  setLoading(true, 'Loading default avatar…');
  const URLS = [
    'https://cdn.jsdelivr.net/gh/yeemachine/kalidokit@main/docs/vrm/three-vrm-girl.vrm',
    'https://raw.githubusercontent.com/yeemachine/kalidokit/main/docs/vrm/three-vrm-girl.vrm',
  ];
  for (const url of URLS) {
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      const blob = await r.blob();
      await loadModel(new File([blob], 'default.vrm'), 'Default Avatar');
      return;
    } catch (_) {}
  }
  console.warn('[VTuber3D] Default avatar unavailable — please upload a .vrm file');
  setLoading(false);
  $('avatar-name').textContent = 'Upload a .vrm to start';
}

// ── Tracking ──────────────────────────────────────────────
async function initTracking(mode) {
  setStatus('loading', 'Loading tracking models…');
  state.lastMpFrame = 0;
  if (state.rigger) {
    state.rigger.hasTracking = false;
    state.rigger.frameCount  = 0;
    Object.assign(state.rigger.debug, {
      mpFrames: 0, worldLmLen: 0, poseLmLen: 0,
      faceLmLen: 0, solvedFace: false, solvedPose: false,
      rightArmZ: 0, leftArmZ: 0, headY: 0,
    });
  }
  try {
    await startTracking(
      mode, $('webcam'),
      results => {
        state.lastMpFrame = performance.now();
        // Draw landmark overlay on webcam preview
        preview.setResults(results);
        if (!state.rigger || state.wiggle) return;
        if (results.type === 'face') state.rigger.storeface(results);
        else                          state.rigger.storeBody(results);
      },
      (type, text) => setStatus(type, text)
    );
  } catch (e) {
    console.error('[VTuber3D] Tracking error:', e);
    setStatus('error', 'Camera access denied');
  }
}

// ── Speech ────────────────────────────────────────────────
const speech = new SpeechController({
  onAmplitude: amp => state.rigger?.setLipAmplitude(amp),
  onCaption: text => {
    $('captions-text').textContent = text;
    $('captions-bar').classList.toggle('hidden', !text);
  },
  onStatus: (type, text) => { if (type === 'error') setStatus('error', text); },
});

// ── Background ────────────────────────────────────────────
function applyBg(type, value) {
  const solid = $('bg-solid'), img = $('bg-image');
  if (type === 'image') {
    img.src = value; img.style.display = 'block'; solid.style.display = 'none';
  } else {
    solid.style.background = value; solid.style.display = 'block'; img.style.display = 'none';
  }
}

// ── Events ────────────────────────────────────────────────
$('sidebar-toggle').addEventListener('click', () => $('sidebar').classList.toggle('hidden'));

$('diag-open').addEventListener('click', () => {
  $('diag-panel').classList.add('open');
  $('diag-open').style.display = 'none';
});
$('diag-close').addEventListener('click', () => {
  $('diag-panel').classList.remove('open');
  $('diag-open').style.display = '';
});

// Wiggle test
const btnWiggle = $('btn-wiggle');
btnWiggle?.addEventListener('click', () => {
  if (!state.vrm) { alert('Load an avatar first.'); return; }
  state.wiggle = !state.wiggle;
  state.wiggleClock = 0;
  btnWiggle.classList.toggle('active', state.wiggle);
  btnWiggle.textContent = state.wiggle ? '⏹ Stop Wiggle' : '🦾 Wiggle Test';
});

// Drop zone
const dz = $('drop-zone');
dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('drag-over'); });
dz.addEventListener('dragleave', ()  => dz.classList.remove('drag-over'));
dz.addEventListener('drop', e => {
  e.preventDefault(); dz.classList.remove('drag-over');
  const f = e.dataTransfer?.files[0];
  if (f?.name.toLowerCase().endsWith('.vrm')) loadModel(f);
});
$('vrm-input').addEventListener('change', e => {
  const f = e.target.files?.[0]; if (f) loadModel(f); e.target.value = '';
});

const MODE_DESCS = {
  face: 'Tracks face, head rotation, blink, mouth',
  body: 'Tracks face + arms + hands (full body)',
};
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.trackingMode = btn.dataset.mode;
    const desc = $('mode-desc');
    if (desc) desc.textContent = MODE_DESCS[state.trackingMode] ?? '';
    initTracking(state.trackingMode);
  });
});

document.querySelectorAll('.cam-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cam-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    setCameraPreset(camera, controls, btn.dataset.cam);
  });
});

document.querySelectorAll('.bg-type').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.bg-type').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.bg-ctrl').forEach(c => c.classList.remove('active'));
    $('bg-' + btn.dataset.type + '-ctrl').classList.add('active');

    // Reset active states in OTHER sections to avoid visual conflicts
    const type = btn.dataset.type;
    if (type !== 'solid')    document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
    if (type !== 'gradient') document.querySelectorAll('.grad-btn').forEach(g => g.classList.remove('active'));
    if (type !== 'image')    { $('bg-img-name').textContent = ''; }

    // Apply the currently-active item in the newly shown section
    if (type === 'solid') {
      const activeSwatch = document.querySelector('.swatch.active');
      if (activeSwatch) applyBg('solid', activeSwatch.dataset.color);
    } else if (type === 'gradient') {
      const activeGrad = document.querySelector('.grad-btn.active');
      if (activeGrad) applyBg('gradient', activeGrad.dataset.grad);
    }
  });
});

document.querySelectorAll('.swatch').forEach(sw => {
  sw.addEventListener('click', () => {
    document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
    sw.classList.add('active');
    $('solid-color-picker').value = sw.dataset.color;
    applyBg('solid', sw.dataset.color);
  });
});
$('solid-color-picker').addEventListener('input', e => {
  document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
  applyBg('solid', e.target.value);
});

document.querySelectorAll('.grad-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.grad-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyBg('gradient', btn.dataset.grad);
  });
});

function updateCustomGrad() {
  const a = $('grad-color-a').value, b = $('grad-color-b').value;
  document.querySelectorAll('.grad-btn').forEach(b => b.classList.remove('active'));
  applyBg('gradient', `linear-gradient(${$('grad-direction').value},${a},${b})`);
}
$('grad-color-a').addEventListener('input', updateCustomGrad);
$('grad-color-b').addEventListener('input', updateCustomGrad);
$('grad-direction').addEventListener('change', updateCustomGrad);

$('bg-input').addEventListener('change', e => {
  const f = e.target.files?.[0]; if (!f) return;
  $('bg-img-name').textContent = f.name;
  applyBg('image', URL.createObjectURL(f));
  e.target.value = '';
});

const btnMic = $('btn-mic');
btnMic.addEventListener('click', () => {
  if (speech.active) {
    speech.stop(); btnMic.textContent = '🎤 Start Microphone'; btnMic.classList.remove('recording');
  } else {
    speech.start(); btnMic.textContent = '⏹ Stop Microphone'; btnMic.classList.add('recording');
  }
});
$('toggle-captions').addEventListener('change', e => {
  speech.setCaptionsOn(e.target.checked);
  if (!e.target.checked) $('captions-bar').classList.add('hidden');
});
$('toggle-preview').addEventListener('change', e => {
  $('preview-box').classList.toggle('hidden', !e.target.checked);
  e.target.checked ? preview.start() : preview.stop();
});

// ── Boot ──────────────────────────────────────────────────
async function boot() {
  await loadDefault();
  await initTracking('body');
}
boot();
