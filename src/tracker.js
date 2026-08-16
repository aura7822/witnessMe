/**
 * tracker.js
 *
 * Face mode  → FaceMesh 0.4   (~2MB,  loads in ~3s)
 * Body mode  → Holistic 0.5   (~25MB, loads in ~20s)
 *
 * Only one solution runs at a time — proper teardown prevents WASM conflicts.
 * injectHolisticPatch() fixes the Module.dataFileDownloads race in Holistic 0.5.
 */

const CDN = {
  faceMesh: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619',
  holistic: 'https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1675471629',
  camUtils: 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1675466862',
};

// ── Proxy shim: fixes Module.dataFileDownloads race in Holistic 0.5 ──────────
function injectHolisticPatch() {
  if (window.__mpPatched) return;
  window.__mpPatched = true;
  if (!window.Module) window.Module = {};
  window.Module.dataFileDownloads = new Proxy(
    window.Module.dataFileDownloads || {},
    { get(t, k) { if (!(k in t)) t[k] = { loaded: 0, total: 0 }; return t[k]; } }
  );
}

let _solution = null;  // active FaceMesh or Holistic instance
let _mpCam    = null;  // active MediaPipe Camera
let _stream   = null;  // raw MediaStream (reused across mode switches)
let _running  = false;

function loadScript(src) {
  if (document.querySelector(`script[src="${src}"]`)) return Promise.resolve();
  return new Promise((res, rej) => {
    const s = Object.assign(document.createElement('script'), {
      src, crossOrigin: 'anonymous', onload: res,
      onerror: () => rej(new Error(`Failed: ${src}`)),
    });
    document.head.appendChild(s);
  });
}

async function acquireCamera(videoEl) {
  if (_stream?.active) {
    videoEl.srcObject = _stream;
    await videoEl.play().catch(() => {});
    return;
  }
  _stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480, facingMode: 'user' },
    audio: false,
  });
  videoEl.srcObject = _stream;
  await videoEl.play().catch(() => {});
}

async function teardown() {
  _running = false;
  if (_mpCam)    { try { _mpCam.stop();           } catch (_) {} _mpCam    = null; }
  if (_solution) { try { await _solution.close();  } catch (_) {} _solution = null; }
  await new Promise(r => setTimeout(r, 300)); // let WASM GC settle
}

export async function startTracking(mode, videoEl, onResults, onStatus) {
  await teardown();

  onStatus('loading', 'Requesting camera…');
  try { await acquireCamera(videoEl); }
  catch (e) { onStatus('error', 'Camera denied — allow access and refresh'); return; }

  await loadScript(`${CDN.camUtils}/camera_utils.js`);

  if (mode === 'face') {
    await _startFace(videoEl, onResults, onStatus);
  } else {
    await _startBody(videoEl, onResults, onStatus);
  }
}

// ── FaceMesh — fast, face landmarks only ─────────────────────────────────────
async function _startFace(videoEl, onResults, onStatus) {
  onStatus('loading', 'Loading face model…');
  await loadScript(`${CDN.faceMesh}/face_mesh.js`);

  const fm = new window.FaceMesh({ locateFile: f => `${CDN.faceMesh}/${f}` });
  fm.setOptions({
    maxNumFaces:            1,
    refineLandmarks:        true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence:  0.5,
  });
  fm.onResults(r => {
    if (_running) onResults({ type: 'face', ...r });
  });
  await fm.initialize();
  _solution = fm;

  _mpCam = new window.Camera(videoEl, {
    onFrame: async () => { if (_running && _solution) try { await fm.send({ image: videoEl }); } catch(_){} },
    width: 640, height: 480,
  });
  _running = true;
  await _mpCam.start();
  onStatus('active', 'Face tracking active');
}

// ── Holistic — full body (pose + face + hands) ────────────────────────────────
async function _startBody(videoEl, onResults, onStatus) {
  onStatus('loading', 'Loading body model (~25MB)…');
  injectHolisticPatch();                         // fix dataFileDownloads race
  await loadScript(`${CDN.holistic}/holistic.js`);

  const h = new window.Holistic({ locateFile: f => `${CDN.holistic}/${f}` });
  h.setOptions({
    modelComplexity:        2,   // max accuracy for fingers/body contact
    smoothLandmarks:        true,
    enableSegmentation:     false,
    refineFaceLandmarks:    true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence:  0.6,   // higher = less jitter
    selfieMode:             false, // correct mirror orientation
  });
  h.onResults(r => {
    if (_running) onResults({ type: 'body', ...r });
  });
  await h.initialize();
  _solution = h;

  _mpCam = new window.Camera(videoEl, {
    onFrame: async () => { if (_running && _solution) try { await h.send({ image: videoEl }); } catch(_){} },
    width: 640, height: 480,
  });
  _running = true;
  await _mpCam.start();
  onStatus('active', 'Body tracking active');
}
