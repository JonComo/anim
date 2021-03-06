function Animator(fps, canvas, frames, callback) {
  this.fps = fps;
  this.canvas = canvas;
  this.frames = frames;
  this.callback = callback;

  if (this.frames > 0) {
    // Create a capturer that exports a WebM video
    this.capturer = new CCapture({ format: 'png', framerate: this.fps });
    this.capturer.start();
  }

  this.animate = function () {
    if (this.frames > 0) {
      this.frames -= 1;
      requestAnimationFrame(this.animate);
    } else {
      if (this.capturer) {
        this.capturer.stop();
        this.capturer.save();
        this.capturer = null;
      }

      setTimeout(function () {
        requestAnimationFrame(this.animate);
      }, 1000 / this.fps);
    }

    this.callback();
    this.capturer.capture(this.canvas);
  };

  this.animate();
}
