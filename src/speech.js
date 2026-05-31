/**
 * speech.js — Web Speech API + Web Audio lip amplitude
 * Chrome/Edge: full captions + lip sync
 * Firefox/Safari: lip sync amplitude only (no SpeechRecognition support)
 */
export class SpeechController {
  constructor({ onAmplitude, onCaption, onStatus }) {
    this.onAmplitude = onAmplitude;
    this.onCaption   = onCaption;
    this.onStatus    = onStatus;
    this.recognition  = null;
    this.audioContext = null;
    this.analyser     = null;
    this.micStream    = null;
    this.animFrame    = null;
    this.active       = false;
    this.captionsOn   = true;

    // Detect browser support
    this.hasSpeechAPI = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  async start() {
    if (this.active) { this.stop(); return; }

    // Get microphone
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (e) {
      this.onStatus?.('error', 'Microphone access denied');
      return;
    }

    // Web Audio — for lip-sync amplitude (works in all browsers)
    this.audioContext = new AudioContext();
    // Resume if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const source   = this.audioContext.createMediaStreamSource(this.micStream);
    this.analyser  = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.5;
    source.connect(this.analyser);

    const buf = new Uint8Array(this.analyser.frequencyBinCount);
    const tick = () => {
      if (!this.active) return;
      this.analyser.getByteFrequencyData(buf);
      let sum = 0;
      const end = Math.floor(buf.length * 0.35); // speech frequency range
      for (let i = 0; i < end; i++) sum += buf[i];
      const amp = (sum / end) / 255;
      this.onAmplitude?.(amp);
      this.animFrame = requestAnimationFrame(tick);
    };

    this.active = true;
    this.animFrame = requestAnimationFrame(tick);

    // Web Speech API — captions (Chrome/Edge only)
    if (this.hasSpeechAPI) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SR();
      this.recognition.continuous     = true;
      this.recognition.interimResults = true;
      this.recognition.lang           = 'en-US';

      let hideTimer = null;

      this.recognition.onresult = (event) => {
        if (!this.captionsOn) return;
        let text = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        if (text.trim()) {
          this.onCaption?.(text.trim());
          clearTimeout(hideTimer);
          hideTimer = setTimeout(() => this.onCaption?.(''), 2500);
        }
      };

      this.recognition.onerror = (e) => {
        if (e.error !== 'no-speech') console.warn('[Speech] error:', e.error);
      };

      // Auto-restart on end
      this.recognition.onend = () => {
        if (this.active) {
          try { this.recognition.start(); } catch (_) {}
        }
      };

      try {
        this.recognition.start();
        this.onStatus?.('active', 'Mic + captions active');
      } catch (e) {
        this.onStatus?.('active', 'Mic active (no captions)');
      }
    } else {
      // Firefox / Safari — lip sync works but no captions
      this.onStatus?.('active', 'Mic active (use Chrome for captions)');
      if (this.captionsOn) {
        this.onCaption?.('[Captions require Chrome or Edge]');
        setTimeout(() => this.onCaption?.(''), 4000);
      }
    }
  }

  stop() {
    this.active = false;
    if (this.animFrame) { cancelAnimationFrame(this.animFrame); this.animFrame = null; }
    try { this.recognition?.stop(); } catch (_) {}
    this.recognition = null;
    this.micStream?.getTracks().forEach(t => t.stop());
    this.micStream = null;
    this.audioContext?.close();
    this.audioContext = null;
    this.analyser = null;
    this.onAmplitude?.(0);
    this.onCaption?.('');
    this.onStatus?.('idle', 'Microphone off');
  }

  setCaptionsOn(v) { this.captionsOn = v; }
}
