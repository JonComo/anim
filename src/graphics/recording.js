import { saveAs } from 'file-saver';
import { rtv } from '../resources';

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
 * Creates a new recording if one doesn't exist already and assigns it to `rtv.recording`.
 * @returns {Promise<Event>?} The `start` event.
 */
export function startRecording() {
  if (rtv.recording === undefined) {
    rtv.recording = new Recording(rtv.c);
    return new Promise((resolve) => {
      rtv.recording.addEventListener('start', resolve);
    });
  }
}

/**
 * Pauses the recording, if it exists.
 * @returns {Promise<Event>?} The `pause` event.
 */
export async function pauseRecording() {
  if (rtv.recording !== undefined) {
    return rtv.recording.pause();
  }
}

/**
 * Resumes the recording, if it exists.
 * @returns {Promise<SpeechSynthesisEvent>?} The `resume` event
 */
export async function resumeRecording() {
  if (rtv.recording !== undefined) {
    return rtv.recording.resume();
  }
}

/**
 * If a recording exists, saves it and allows it to be garbage collected.
 * @param {boolean} cancel Whether or not the `save` event should be canceled.
 * @returns {Promise<Blob>?} Saved video data.
 */
export async function saveRecording(cancel = false) {
  if (rtv.recording !== undefined) {
    // Save and forget about old recording
    const blob = await rtv.recording.save(cancel);
    rtv.recording = undefined; // The 'Recording' instance should now be garbage collected
    return blob;
  }
}

/**
 * Sets up button elements to control recording functions.
 * @param {HTMLButtonElement} recordBtn The button to start and stop recording.
 * @param {HTMLButtonElement} prBtn The button to pause and resume recording.
 */
export function setUpRecordingButtons(recordBtn, prBtn) {
  const LABELS = {
    start: 'Start recording',
    pause: 'Pause recording',
    resume: 'Resume recording',
    stop: 'Stop recording',
  }; // Button labels for different recording states

  recordBtn.innerText = LABELS.start;
  prBtn.hidden = true;

  recordBtn.addEventListener('click', () => {
    if (rtv.recording === undefined) { // Check if a recording doesn't exist yet
      startRecording().then(() => {
        recordBtn.innerText = LABELS.stop;

        prBtn.innerText = LABELS.pause;
        prBtn.hidden = false;
      });
    } else {
      saveRecording().then(() => {
        recordBtn.innerText = LABELS.start;

        prBtn.hidden = true;
      });
    }
  });

  prBtn.addEventListener('click', () => {
    if (rtv.recording.state === 'paused') {
      resumeRecording().then(() => {
        prBtn.innerText = LABELS.pause;
      });
    } else {
      pauseRecording().then(() => {
        prBtn.innerText = LABELS.resume;
      });
    }
  }); // Add 'click' event listener
}
