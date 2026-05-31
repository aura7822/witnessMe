<<<<<<< HEAD
/**
 * preview.js — webcam preview + MediaPipe landmark overlay
 * Draws face mesh, pose skeleton, and hand connections exactly like the Glitch demo GIF
 */

const DRAWING_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3.1675466124';
const HOLISTIC_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1675471629';

let _drawUtils = false; // whether drawing utils scripts are loaded

function loadScript(src) {
  if (document.querySelector(`script[src="${src}"]`)) return Promise.resolve();
  return new Promise((res, rej) => {
    const s = Object.assign(document.createElement('script'), {
      src, crossOrigin: 'anonymous', onload: res,
      onerror: () => { console.warn('Drawing utils unavailable'); res(); }
    });
    document.head.appendChild(s);
  });
}

async function ensureDrawingUtils() {
  if (_drawUtils) return;
  await loadScript(`${DRAWING_CDN}/drawing_utils.js`);
  await loadScript(`${HOLISTIC_CDN}/holistic.js`); // provides POSE_CONNECTIONS etc
  _drawUtils = true;
}

export class PreviewRenderer {
  constructor(videoEl, canvasEl) {
    this.video  = videoEl;
    this.canvas = canvasEl;
    this.ctx    = canvasEl.getContext('2d');
    this.mirror = true;
    this._raf   = null;
    this._lastResults = null;
    this._drawingReady = false;
    this._loop  = this._loop.bind(this);

    // Load drawing utils in background
    ensureDrawingUtils().then(() => { this._drawingReady = true; });
  }

  start() { if (!this._raf) this._raf = requestAnimationFrame(this._loop); }
  stop()  { if (this._raf) cancelAnimationFrame(this._raf); this._raf = null; }
  setMirror(v) { this.mirror = v; }

  /** Called from MediaPipe onResults — stores latest results for overlay */
  setResults(results) { this._lastResults = results; }

=======
export class PreviewRenderer {
  constructor(videoEl, canvasEl) {
    this.video = videoEl; this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.mirror = true; this._raf = null;
    this._loop = this._loop.bind(this);
  }
  start()  { if (!this._raf) this._raf = requestAnimationFrame(this._loop); }
  stop()   { if (this._raf) cancelAnimationFrame(this._raf); this._raf = null; }
  setMirror(v) { this.mirror = v; }
>>>>>>> 51c8c7ab16f3e0a69a6217237bbc7121b21c679f
  _loop() {
    const { video: v, canvas: c, ctx, mirror } = this;
    if (v.readyState >= 2) {
      ctx.save();
      if (mirror) { ctx.scale(-1, 1); ctx.translate(-c.width, 0); }
      ctx.drawImage(v, 0, 0, c.width, c.height);
      ctx.restore();
<<<<<<< HEAD

      // Draw landmark overlays if drawing utils are ready
      if (this._drawingReady && this._lastResults) {
        this._drawOverlay(this._lastResults);
      }
    }
    this._raf = requestAnimationFrame(this._loop);
  }

  _drawOverlay(results) {
    const { ctx, canvas: c, mirror } = this;
    const dU  = window.drawConnectors;
    const dL  = window.drawLandmarks;
    if (!dU || !dL) return;

    ctx.save();
    if (mirror) { ctx.scale(-1, 1); ctx.translate(-c.width, 0); }

    // ── Pose skeleton ─────────────────────────────────────────────────────
    if (results.poseLandmarks && window.POSE_CONNECTIONS) {
      dU(ctx, results.poseLandmarks, window.POSE_CONNECTIONS, {
        color: '#00FF00', lineWidth: 2,
      });
      dL(ctx, results.poseLandmarks, {
        color: '#FF0000', lineWidth: 1, radius: 3,
      });
    }

    // ── Face mesh ─────────────────────────────────────────────────────────
    if (results.faceLandmarks && window.FACEMESH_TESSELATION) {
      dU(ctx, results.faceLandmarks, window.FACEMESH_TESSELATION, {
        color: '#C0C0C070', lineWidth: 1,
      });
    }
    if (results.faceLandmarks && window.FACEMESH_RIGHT_EYE) {
      dU(ctx, results.faceLandmarks, window.FACEMESH_RIGHT_EYE, { color: '#30FF30' });
      dU(ctx, results.faceLandmarks, window.FACEMESH_LEFT_EYE,  { color: '#30FF30' });
      dU(ctx, results.faceLandmarks, window.FACEMESH_LIPS,      { color: '#E0E0E0' });
    }

    // ── Hands ─────────────────────────────────────────────────────────────
    if (results.leftHandLandmarks && window.HAND_CONNECTIONS) {
      dU(ctx, results.leftHandLandmarks, window.HAND_CONNECTIONS, {
        color: '#CC0000', lineWidth: 2,
      });
      dL(ctx, results.leftHandLandmarks, {
        color: '#00FF00', lineWidth: 1, radius: 3,
      });
    }
    if (results.rightHandLandmarks && window.HAND_CONNECTIONS) {
      dU(ctx, results.rightHandLandmarks, window.HAND_CONNECTIONS, {
        color: '#00CC00', lineWidth: 2,
      });
      dL(ctx, results.rightHandLandmarks, {
        color: '#FF0000', lineWidth: 1, radius: 3,
      });
    }

    ctx.restore();
  }
=======
    }
    this._raf = requestAnimationFrame(this._loop);
  }
>>>>>>> 51c8c7ab16f3e0a69a6217237bbc7121b21c679f
}
