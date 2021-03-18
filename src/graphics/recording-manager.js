import Recording from './recording';
import { rtv } from '../resources';

/**
 * Starts, pauses, resumes and saves recordings of `canvas`.
 * Sets up `recordBtn` and `prBtn` (if specified) to control recording.
 * Attaches an event listener to `kbdEvents` to handle keyboard shortcuts.
 * @param {HTMLCanvasElement} canvas The canvas to be recorded.
 * @param {HTMLButtonElement?} recordBtn The button to start and stop recording.
 * @param {HTMLButtonElement?} prBtn The button to pause and resume recording.
 * @param {boolean} handleKeys Whether or not a shortcut handler should be attached
 * @param {EventTarget} kbdEvents Keyoard events target.
 */
export default class RecordingManager {
  constructor(canvas, recordBtn, prBtn, handleKeys = true, kbdEvents = window) {
    this.canvas = canvas;

    if (recordBtn !== undefined && prBtn !== undefined) {
      this.recordBtn = recordBtn;
      this.prBtn = prBtn;
      this.setUpButtons();
    }

    if (handleKeys) {
      this.kbdEvents = kbdEvents;
      this.attachKeyboardListener();
    }
  }

  /**
   * Creates a new recording if one doesn't already exist
   * @returns {Promise<Event>?} The `start` event.
   */
  startRecording() {
    if (this.recording === undefined) {
      this.recording = new Recording(this.canvas);
      return this.recording.init;
    }
  }

  /**
   * Pauses the recording, if it exists.
   * @returns {Promise<Event>?} The `pause` event.
   */
  pauseRecording() {
    if (this.recording !== undefined) {
      return this.recording.pause();
    }
  }

  /**
   * Resumes the recording, if it exists.
   * @returns {Promise<SpeechSynthesisEvent>?} The `resume` event
   */
  resumeRecording() {
    if (this.recording !== undefined) {
      return this.recording.resume();
    }
  }

  /**
   * If a recording exists, saves it and allows it to be garbage collected.
   * @param {boolean} cancel Whether or not the `save` event should be canceled.
   * @returns {Promise<Blob>?} Saved video data.
   */
  async saveRecording(cancel = false) {
    if (this.recording !== undefined) {
      // Save and forget about old recording
      const blob = await this.recording.save(cancel);
      this.recording = undefined; // The 'Recording' instance should now be garbage collected
      return blob;
    }
  }

  /**
   * Sets up button elements to control recording functions.
   */
  setUpButtons() {
    const LABELS = {
      start: 'Start recording',
      pause: 'Pause recording',
      resume: 'Resume recording',
      stop: 'Stop recording',
    }; // Button labels for different recording states

    this.recordBtn.innerText = LABELS.start;
    this.prBtn.hidden = true;

    this.recordBtn.addEventListener('click', async () => {
      if (this.recording === undefined) {
        await this.startRecording();
        this.recordBtn.innerText = LABELS.stop;

        this.prBtn.innerText = LABELS.pause;
        this.prBtn.hidden = false;
      } else {
        await this.saveRecording();
        this.recordBtn.innerText = LABELS.start;

        this.prBtn.hidden = true;
      }
    });

    this.prBtn.addEventListener('click', async () => {
      if (this.recording.state === 'paused') {
        await resumeRecording();
        this.prBtn.innerText = LABELS.pause;
      } else {
        await pauseRecording();
        this.prBtn.innerText = LABELS.resume;
      }
    }); // Add 'click' event listener
  }

  /**
   * Adds a keyboard event listener to `this.kbdEvents` for handling shortcuts.
   */
  attachKeyboardListener() {
    this.kbdEvents.addEventListener('keydown', (e) => {
      if (rtv.keys.ctrl) {
        switch (e.key) {
          case 'B':
            e.preventDefault();
            this.startRecording();
            break;
          case 'M':
            e.preventDefault();
            this.pauseRecording();
            break;
          case 'R':
            e.preventDefault();
            this.resumeRecording();
            break;
          case 'E':
            e.preventDefault();
            this.saveRecording();
            break;
          // no default
        }
      }
    });
  }
}
