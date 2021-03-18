import { saveAs } from 'file-saver';

/**
 * Creates a new recording of `canvas`.
 * @param {HTMLCanvasElement} canvas The canvas to be captured.
 */
export default class Recording extends MediaRecorder {
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

/**
 * Sets up button elements to control recording functions.
 * @param {HTMLButtonElement} recordBtn The button to start and stop recording.
 * @param {HTMLButtonElement} prBtn The button to pause and resume recording.
 */
export function setUpRecordingButtons(recordBtn, prBtn, canvas) {
  const LABELS = {
    start: 'Start recording',
    pause: 'Pause recording',
    resume: 'Resume recording',
    stop: 'Stop recording',
  }; // Button labels for different recording states

  let recording;

  recordBtn.innerText = LABELS.start;
  prBtn.hidden = true;

  recordBtn.addEventListener('click', () => {
    if (recording === undefined) { // Check if a recording doesn't exist yet
      // Set up a new recording
      recording = new Recording(canvas);
      recording.addEventListener('start', () => {
        recordBtn.innerText = LABELS.stop;

        prBtn.innerText = LABELS.pause;
        prBtn.hidden = false;
      });
    } else {
      // Save and forget about old recording
      recording.save();
      recording.save().then(() => {
        recording = undefined; // The 'Recording' instance will now be garbage collected
        recordBtn.innerText = LABELS.start;

        prBtn.hidden = true;
      });
    }
  });

  prBtn.addEventListener('click', () => {
    if (recording.state === 'paused') {
      recording.resume().then(() => {
        prBtn.innerText = LABELS.pause;
      });
    } else {
      recording.pause().then(() => {
        prBtn.innerText = LABELS.resume;
      });
    }
  }); // Add 'click' event listener
}
