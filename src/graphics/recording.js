import { saveAs } from 'file-saver';

export default class Recording extends MediaRecorder {
  /**
   * Creates a new recording of `canvas`.
   * @param {HTMLCanvasElement} canvas The canvas to be captured.
   */
  constructor(canvas) {
    const videoStream = canvas.captureStream();
    super(videoStream); // Pass 'videoStream' to 'MediaRecorder' constructor

    this.chunks = []; // Initialize array to hold recorded media

    this.addEventListener('dataavailable', ({ data }) => {
      this.chunks.push(data);
    });

    this.addEventListener('stop', () => {
      const blob = new Blob(this.chunks, { type: 'video/mp4' });

      const saveEvent = new CustomEvent('save', { detail: { blob } });

      // Dispatch event and continue only if it's is not prevented
      if (this.dispatchEvent(saveEvent)) {
        saveAs(blob, 'recording.mp4');
      }
    });

    this.start(); // Start recording
    this.init = new Promise((resolve) => this
      .addEventListener('start', resolve, { once: true }));
  }

  /**
   * Pauses recording.
   * @returns {Promise<Event>} Pause event.
   */
  pause() {
    super.pause();
    return new Promise((resolve) => this
      .addEventListener('pause', resolve, { once: true }));
  }

  /**
   * Resumes recording.
   * @returns {Promise<SpeechSynthesisEvent>} Resume event.
   */
  resume() {
    super.resume();
    return new Promise((resolve) => this
      .addEventListener('resume', resolve, { once: true }));
  }

  /**
   * Stops and saves recording.
   * @param {boolean?} cancel Whether or not the `save` event should be canceled
   * @returns {Promise<Blob>} Saved video data.
   */
  save(cancel = false) {
    this.stop(); // Stop recording, triggering event listener and saving
    return new Promise((resolve) => {
      this.addEventListener('save', (e) => {
        resolve(e.detail.blob);
        if (cancel) {
          e.preventDefault();
        }
      }, { once: true });
    });
  }
}
