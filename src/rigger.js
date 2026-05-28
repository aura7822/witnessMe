/**
 * rigger.js — mirror-precision tracking with Holistic 0.5
 * Uses results.poseWorldLandmarks (Holistic 0.5 stable API, not results.ea)
 */
import * as Kalidokit from 'kalidokit';
import * as THREE from 'three';

const lerpN = THREE.MathUtils.lerp;
const clamp = THREE.MathUtils.clamp;

const L = {
  head: 0.9, neck: 0.9, blink: 0.7, mouth: 0.8, eye: 0.5,
  arm: 0.8, hand: 0.9, spine: 0.6, hips: 0.7, pos: 0.07,
};

export class VRMRigger {
  constructor(vrm) {
    this.vrm         = vrm;
    this.hasTracking = false;
    this.lipAmp      = 0;
    this.frameCount  = 0;
    this._faceRig    = null;
    this._poseRig    = null;
    this._rHandRig   = null;
    this._lHandRig   = null;
    this._lookX      = 0;
    this._lookY      = 0;
    this._logN       = 0;

    this.debug = {
      mpFrames: 0, faceLmLen: 0, worldLmLen: 0, poseLmLen: 0,
      solvedFace: false, solvedPose: false, boneFound: false,
      rightArmZ: 0, leftArmZ: 0, headY: 0,
    };
  }

  _bone(name) {
    return this.vrm?.humanoid?.getNormalizedBoneNode(name)
        ?? this.vrm?.humanoid?.getRawBoneNode(name);
  }

  _rot(name, rot, damp = 1, alpha = 0.3) {
    if (!rot) return;
    const b = this._bone(name);
    if (!b) return;
    this.debug.boneFound = true;
    b.quaternion.slerp(
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(rot.x * damp, rot.y * damp, rot.z * damp, 'XYZ')
      ), alpha
    );
  }

  _pos(name, pos, damp = 1, alpha = L.pos) {
    if (!pos) return;
    const b = this._bone(name);
    if (!b) return;
    b.position.lerp(new THREE.Vector3(pos.x * damp, pos.y * damp, pos.z * damp), alpha);
  }

  _applyFace(rig) {
    if (!rig) return;
    const eb = this.vrm?.expressionManager;
    if (eb) {
      try { eb.setValue('blinkLeft',  lerpN(eb.getValue('blinkLeft')  ?? 0, clamp(1 - rig.eye.l, 0, 1), L.blink)); } catch(_){}
      try { eb.setValue('blinkRight', lerpN(eb.getValue('blinkRight') ?? 0, clamp(1 - rig.eye.r, 0, 1), L.blink)); } catch(_){}
      if (this.lipAmp > 0.05) {
        const o = clamp(this.lipAmp * 2.5, 0, 1);
        try { eb.setValue('aa', lerpN(eb.getValue('aa') ?? 0, o,       L.mouth)); } catch(_){}
        try { eb.setValue('oh', lerpN(eb.getValue('oh') ?? 0, o * 0.3, L.mouth)); } catch(_){}
      } else {
        const s = rig.mouth.shape;
        try { eb.setValue('aa', lerpN(eb.getValue('aa') ?? 0, s.A ?? 0, L.mouth)); } catch(_){}
        try { eb.setValue('ih', lerpN(eb.getValue('ih') ?? 0, s.I ?? 0, L.mouth)); } catch(_){}
        try { eb.setValue('ou', lerpN(eb.getValue('ou') ?? 0, s.U ?? 0, L.mouth)); } catch(_){}
        try { eb.setValue('ee', lerpN(eb.getValue('ee') ?? 0, s.E ?? 0, L.mouth)); } catch(_){}
        try { eb.setValue('oh', lerpN(eb.getValue('oh') ?? 0, s.O ?? 0, L.mouth)); } catch(_){}
      }
    }
    if (this.vrm?.lookAt?.applier) {
      this._lookX = lerpN(this._lookX, rig.pupil.x, L.eye);
      this._lookY = lerpN(this._lookY, rig.pupil.y, L.eye);
      this.vrm.lookAt.applier.applyYawPitch(this._lookX, this._lookY);
    }
    this._rot('neck', rig.head, 0.7, L.neck);
    this._rot('head', rig.head, 1.0, L.head);
  }

  _applyPose(rig) {
    if (!rig) return;
    this._rot('hips',          rig.Hips?.rotation,     1,    L.hips);
    this._pos('hips',          rig.Hips?.worldPosition, 1,    L.pos);
    this._rot('chest',         rig.Spine,               0.4,  L.spine);
    this._rot('spine',         rig.Spine,               0.6,  L.spine);
    this._rot('rightUpperArm', rig.RightUpperArm,       1,    L.arm);
    this._rot('rightLowerArm', rig.RightLowerArm,       1,    L.arm);
    this._rot('leftUpperArm',  rig.LeftUpperArm,        1,    L.arm);
    this._rot('leftLowerArm',  rig.LeftLowerArm,        1,    L.arm);
  }

  _applyHand(rig, side) {
    if (!rig) return;
    const bP = side === 'right' ? 'right' : 'left';
    const rP = side === 'right' ? 'Right' : 'Left';
    ['Thumb','Index','Middle','Ring','Little'].forEach(f =>
      ['Proximal','Intermediate','Distal'].forEach(s =>
        this._rot(`${bP}${f}${s}`, rig[`${rP}${f}${s}`], 1, L.hand)
      )
    );
  }

  // ── FaceMesh / Holistic face-only ─────────────────────────
  storeface(results) {
    this.debug.mpFrames++;
    this.debug.faceLmLen = results?.faceLandmarks?.length ?? 0;
    if (!results?.faceLandmarks?.length) return;

    const rig = Kalidokit.Face.solve(results.faceLandmarks, {
      runtime: 'mediapipe',
      video: document.getElementById('webcam'),
    });
    if (!rig) return;

    this._logN++;
    if (this._logN % 30 === 0)
      console.log(`[Rigger] face — head y:${rig.head.y.toFixed(3)} blink L:${rig.eye.l.toFixed(2)}`);

    this._faceRig        = rig;
    this.hasTracking     = true;
    this.frameCount++;
    this.debug.solvedFace = true;
    this.debug.headY      = rig.head.y;
    this._applyFace(rig);
  }

  // ── Holistic full-body ────────────────────────────────────
  storeBody(results) {
    this.debug.mpFrames++;
    this.debug.faceLmLen = results?.faceLandmarks?.length ?? 0;

    if (results.faceLandmarks?.length) {
      const rig = Kalidokit.Face.solve(results.faceLandmarks, {
        runtime: 'mediapipe',
        video: document.getElementById('webcam'),
      });
      if (rig) {
        this._faceRig         = rig;
        this.debug.solvedFace = true;
        this.debug.headY      = rig.head.y;
        this._applyFace(rig);
      }
    }

    // Probe all plausible keys for world pose landmarks.
    // Holistic 0.5 build 1675471629 uses an obfuscated name; try known variants.
    // Log once to show which key has 33 landmarks, then cache it.
    const worldLm = (
      results.poseWorldLandmarks      // official public API (some builds)
      ?? results.ea                   // Holistic 0.5.1635989137 internal
      ?? results.za                   // alternate obfuscated name
      ?? results.wa                   // alternate obfuscated name
      // last resort: use 2D poseLandmarks for both args (less accurate Z but arms move)
      ?? results.poseLandmarks
    );
    if (this._logN === 1 && results) {
      // One-time log of all result keys to identify correct world landmarks property
      const keys = Object.keys(results).filter(k => Array.isArray(results[k]));
      console.log('[Rigger] Holistic result array keys:', keys);
      keys.forEach(k => console.log(`  ${k}: length=${results[k]?.length}`));
    }
    this.debug.worldLmLen = worldLm?.length ?? 0;
    this.debug.poseLmLen  = results.poseLandmarks?.length ?? 0;

    if (worldLm?.length && results.poseLandmarks?.length) {
      const rig = Kalidokit.Pose.solve(worldLm, results.poseLandmarks, {
        runtime: 'mediapipe',
        video: document.getElementById('webcam'),
        enableLegs: false,
      });
      if (rig) {
        this._poseRig         = rig;
        this.debug.solvedPose = true;
        this.debug.rightArmZ  = rig.RightUpperArm?.z ?? 0;
        this.debug.leftArmZ   = rig.LeftUpperArm?.z  ?? 0;
        this._logN++;
        if (this._logN % 30 === 0)
          console.log(`[Rigger] pose — R:${rig.RightUpperArm?.z?.toFixed(3)} L:${rig.LeftUpperArm?.z?.toFixed(3)} worldLm:${worldLm.length}`);
        this._applyPose(rig);
      }
    }

    if (results.rightHandLandmarks?.length) {
      const r = Kalidokit.Hand.solve(results.rightHandLandmarks, 'Right');
      if (r) { this._rHandRig = r; this._applyHand(r, 'right'); }
    } else { this._rHandRig = null; }

    if (results.leftHandLandmarks?.length) {
      const l = Kalidokit.Hand.solve(results.leftHandLandmarks, 'Left');
      if (l) { this._lHandRig = l; this._applyHand(l, 'left'); }
    } else { this._lHandRig = null; }

    this.hasTracking = true;
    this.frameCount++;
  }

  update(delta) {
    if (!this.vrm) return;
    this._applyFace(this._faceRig);
    this._applyPose(this._poseRig);
    this._applyHand(this._rHandRig, 'right');
    this._applyHand(this._lHandRig, 'left');
    this.vrm.update(delta);
  }

  wiggleTest(t) {
    if (!this.vrm) return;
    const w = Math.sin(t * 2.5);
    this._rot('rightUpperArm', { x: 0, y: 0, z: -w * 1.0 }, 1, 1);
    this._rot('leftUpperArm',  { x: 0, y: 0, z:  w * 1.0 }, 1, 1);
    this._rot('head',          { x: 0, y: w * 0.3, z: 0  }, 1, 1);
    this.vrm.update(0.016);
  }

  setLipAmplitude(amp) { this.lipAmp = amp; }
}
