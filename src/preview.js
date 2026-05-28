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
  _loop() {
    const { video: v, canvas: c, ctx, mirror } = this;
    if (v.readyState >= 2) {
      ctx.save();
      if (mirror) { ctx.scale(-1, 1); ctx.translate(-c.width, 0); }
      ctx.drawImage(v, 0, 0, c.width, c.height);
      ctx.restore();
    }
    this._raf = requestAnimationFrame(this._loop);
  }
}
