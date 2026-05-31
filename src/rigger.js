/**
<<<<<<< HEAD
 * rigger.js — exact port of kalidoface-3d Glitch template
 * lerpAmount values match the working demo: 0.3 arms, 0.7 neck/head
 * getNormalizedBoneNode + quaternion.slerp
=======
 * rigger.js — mirror-precision tracking with Holistic 0.5
 * Uses results.poseWorldLandmarks (Holistic 0.5 stable API, not results.ea)
>>>>>>> 51c8c7ab16f3e0a69a6217237bbc7121b21c679f
 */
import * as Kalidokit from 'kalidokit';
import * as THREE from 'three';

const lerpN = THREE.MathUtils.lerp;
const clamp = THREE.MathUtils.clamp;

<<<<<<< HEAD
=======
const L = {
  head: 0.9, neck: 0.9, blink: 0.7, mouth: 0.8, eye: 0.5,
  arm: 0.8, hand: 0.9, spine: 0.6, hips: 0.7, pos: 0.07,
};

>>>>>>> 51c8c7ab16f3e0a69a6217237bbc7121b21c679f
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
<<<<<<< HEAD
    this._oldLook    = new THREE.Euler();
=======
    this._lookX      = 0;
    this._lookY      = 0;
>>>>>>> 51c8c7ab16f3e0a69a6217237bbc7121b21c679f
    this._logN       = 0;

    this.debug = {
      mpFrames: 0, faceLmLen: 0, worldLmLen: 0, poseLmLen: 0,
      solvedFace: false, solvedPose: false, boneFound: false,
      rightArmZ: 0, leftArmZ: 0, headY: 0,
    };
  }

<<<<<<< HEAD
  // ── Core helpers (exact Glitch template) ─────────────────────────────────
  _rot(boneName, rotation = { x: 0, y: 0, z: 0 }, dampener = 1, lerpAmount = 0.3) {
    const bone = this.vrm?.humanoid?.getNormalizedBoneNode(boneName);
    if (!bone) return;
    this.debug.boneFound = true;
    const euler = new THREE.Euler(
      rotation.x * dampener,
      rotation.y * dampener,
      rotation.z * dampener
    );
    bone.quaternion.slerp(new THREE.Quaternion().setFromEuler(euler), lerpAmount);
  }

  _pos(boneName, position = { x: 0, y: 0, z: 0 }, dampener = 1, lerpAmount = 0.3) {
    const bone = this.vrm?.humanoid?.getNormalizedBoneNode(boneName);
    if (!bone) return;
    bone.position.lerp(
      new THREE.Vector3(position.x * dampener, position.y * dampener, position.z * dampener),
      lerpAmount
    );
  }

  // ── Face ─────────────────────────────────────────────────────────────────
  _applyFace(rig) {
    if (!rig || !this.vrm) return;
    const eb = this.vrm.expressionManager;

    // Head rotation — 0.7 dampener on neck, 1.0 on head (matches Glitch demo)
    this._rot('neck', rig.head, 0.7, 0.7);
    this._rot('head', rig.head, 1.0, 0.7);

    if (eb) {
      // Blink
      try { eb.setValue('blinkLeft',  clamp(1 - rig.eye.l, 0, 1)); } catch(_){}
      try { eb.setValue('blinkRight', clamp(1 - rig.eye.r, 0, 1)); } catch(_){}

      // Mouth — audio amplitude overrides face tracking when mic active
      if (this.lipAmp > 0.05) {
        const o = clamp(this.lipAmp * 2.5, 0, 1);
        try { eb.setValue('aa', o);       } catch(_){}
        try { eb.setValue('oh', o * 0.3); } catch(_){}
        try { eb.setValue('ih', 0); } catch(_){}
        try { eb.setValue('ou', 0); } catch(_){}
        try { eb.setValue('ee', 0); } catch(_){}
      } else {
        const s = rig.mouth.shape;
        try { eb.setValue('aa', s.A ?? 0); } catch(_){}
        try { eb.setValue('ih', s.I ?? 0); } catch(_){}
        try { eb.setValue('ou', s.U ?? 0); } catch(_){}
        try { eb.setValue('ee', s.E ?? 0); } catch(_){}
        try { eb.setValue('oh', s.O ?? 0); } catch(_){}
      }
    }

    // Eye look-at (smooth lerp to avoid jitter)
    if (this.vrm.lookAt?.applier) {
      const lt = new THREE.Euler(
        lerpN(this._oldLook.x, rig.pupil.y, 0.4),
        lerpN(this._oldLook.y, rig.pupil.x, 0.4),
        0, 'XYZ'
      );
      this._oldLook.copy(lt);
      this.vrm.lookAt.applier.applyYawPitch(lt.y, lt.x);
    }
  }

  // ── Pose (matches Glitch template exactly) ────────────────────────────────
  _applyPose(rig) {
    if (!rig || !this.vrm) return;

    this._rot('hips', rig.Hips?.rotation, 0.7, 0.7);
    this._pos('hips', {
      x: -(rig.Hips?.position?.x ?? 0),
      y:  (rig.Hips?.position?.y ?? 0) + 1,
      z: -(rig.Hips?.position?.z ?? 0),
    }, 1, 0.07);

    this._rot('chest', rig.Spine, 0.25, 0.3);
    this._rot('spine', rig.Spine, 0.45, 0.3);

    this._rot('rightUpperArm', rig.RightUpperArm, 1, 0.3);
    this._rot('rightLowerArm', rig.RightLowerArm, 1, 0.3);
    this._rot('leftUpperArm',  rig.LeftUpperArm,  1, 0.3);
    this._rot('leftLowerArm',  rig.LeftLowerArm,  1, 0.3);
  }

  // ── Hands ─────────────────────────────────────────────────────────────────
  _applyHand(rig, side) {
    if (!rig || !this.vrm) return;
    const bP = side === 'right' ? 'right' : 'left';
    const rP = side === 'right' ? 'Right' : 'Left';

    // Wrist rotation
    if (rig[`${rP}Wrist`]) this._rot(`${bP}Hand`, rig[`${rP}Wrist`], 1, 0.3);

    // All fingers
    ['Thumb','Index','Middle','Ring','Little'].forEach(f =>
      ['Proximal','Intermediate','Distal'].forEach(s =>
        this._rot(`${bP}${f}${s}`, rig[`${rP}${f}${s}`], 1, 0.6)
=======
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
>>>>>>> 51c8c7ab16f3e0a69a6217237bbc7121b21c679f
      )
    );
  }

<<<<<<< HEAD
  // ── MediaPipe FaceMesh results ────────────────────────────────────────────
=======
  // ── FaceMesh / Holistic face-only ─────────────────────────
>>>>>>> 51c8c7ab16f3e0a69a6217237bbc7121b21c679f
  storeface(results) {
    this.debug.mpFrames++;
    this.debug.faceLmLen = results?.faceLandmarks?.length ?? 0;
    if (!results?.faceLandmarks?.length) return;

    const rig = Kalidokit.Face.solve(results.faceLandmarks, {
      runtime: 'mediapipe',
      video: document.getElementById('webcam'),
    });
    if (!rig) return;

<<<<<<< HEAD
    this._faceRig = rig;
    this.hasTracking = true;
    this.frameCount++;
    this.debug.solvedFace = true;
    this.debug.headY = rig.head.y;
    this._applyFace(rig);
  }

  // ── Holistic full-body results ────────────────────────────────────────────
=======
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
>>>>>>> 51c8c7ab16f3e0a69a6217237bbc7121b21c679f
  storeBody(results) {
    this.debug.mpFrames++;
    this.debug.faceLmLen = results?.faceLandmarks?.length ?? 0;

<<<<<<< HEAD
    // Face
=======
>>>>>>> 51c8c7ab16f3e0a69a6217237bbc7121b21c679f
    if (results.faceLandmarks?.length) {
      const rig = Kalidokit.Face.solve(results.faceLandmarks, {
        runtime: 'mediapipe',
        video: document.getElementById('webcam'),
      });
      if (rig) {
<<<<<<< HEAD
        this._faceRig = rig;
        this.debug.solvedFace = true;
        this.debug.headY = rig.head.y;
=======
        this._faceRig         = rig;
        this.debug.solvedFace = true;
        this.debug.headY      = rig.head.y;
>>>>>>> 51c8c7ab16f3e0a69a6217237bbc7121b21c679f
        this._applyFace(rig);
      }
    }

<<<<<<< HEAD
    // World landmarks — try all known property names across Holistic versions
    const worldLm = (
      results.poseWorldLandmarks ??
      results.ea ??
      results.za ??
      results.poseLandmarks   // 2D fallback: arms move, less Z depth
    );
=======
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
>>>>>>> 51c8c7ab16f3e0a69a6217237bbc7121b21c679f
    this.debug.worldLmLen = worldLm?.length ?? 0;
    this.debug.poseLmLen  = results.poseLandmarks?.length ?? 0;

    if (worldLm?.length && results.poseLandmarks?.length) {
      const rig = Kalidokit.Pose.solve(worldLm, results.poseLandmarks, {
        runtime: 'mediapipe',
        video: document.getElementById('webcam'),
        enableLegs: false,
      });
      if (rig) {
<<<<<<< HEAD
        this._poseRig = rig;
        this.debug.solvedPose = true;
        this.debug.rightArmZ  = rig.RightUpperArm?.z ?? 0;
        this.debug.leftArmZ   = rig.LeftUpperArm?.z  ?? 0;

        this._logN++;
        if (this._logN % 30 === 0)
          console.log(`[Rigger] pose R:${rig.RightUpperArm?.z?.toFixed(3)} L:${rig.LeftUpperArm?.z?.toFixed(3)} worldLm:${worldLm.length}`);

=======
        this._poseRig         = rig;
        this.debug.solvedPose = true;
        this.debug.rightArmZ  = rig.RightUpperArm?.z ?? 0;
        this.debug.leftArmZ   = rig.LeftUpperArm?.z  ?? 0;
        this._logN++;
        if (this._logN % 30 === 0)
          console.log(`[Rigger] pose — R:${rig.RightUpperArm?.z?.toFixed(3)} L:${rig.LeftUpperArm?.z?.toFixed(3)} worldLm:${worldLm.length}`);
>>>>>>> 51c8c7ab16f3e0a69a6217237bbc7121b21c679f
        this._applyPose(rig);
      }
    }

<<<<<<< HEAD
    // Hands
=======
>>>>>>> 51c8c7ab16f3e0a69a6217237bbc7121b21c679f
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

<<<<<<< HEAD
  // ── Called every render frame ─────────────────────────────────────────────
=======
>>>>>>> 51c8c7ab16f3e0a69a6217237bbc7121b21c679f
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
<<<<<<< HEAD
    this._rot('rightUpperArm', { x: 0, y: 0, z: -w }, 1, 1);
    this._rot('leftUpperArm',  { x: 0, y: 0, z:  w }, 1, 1);
    this._rot('head',          { x: 0, y: w * 0.3, z: 0 }, 1, 1);
=======
    this._rot('rightUpperArm', { x: 0, y: 0, z: -w * 1.0 }, 1, 1);
    this._rot('leftUpperArm',  { x: 0, y: 0, z:  w * 1.0 }, 1, 1);
    this._rot('head',          { x: 0, y: w * 0.3, z: 0  }, 1, 1);
>>>>>>> 51c8c7ab16f3e0a69a6217237bbc7121b21c679f
    this.vrm.update(0.016);
  }

  setLipAmplitude(amp) { this.lipAmp = amp; }
}
