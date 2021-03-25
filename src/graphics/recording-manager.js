import Recording from './recording';
import { rtv } from '../resources';

export default class RecordingManager extends EventTarget {
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
  constructor(canvas, recordBtn, prBtn, handleKeys = true, kbdEvents = window) {
    super();

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
      this.recording.init.then(() => {
        const newEvent = new CustomEvent('new', { detail: { recording: this.recording } });
        this.dispatchEvent(newEvent);
      });
      return this.recording.init;
    }
  }

  /**
   * Pauses the recording, if it exists.
   * @returns {Promise<Event>?} The `pause` event.
   */
  pauseRecording() {
    if (this.recording !== undefined) {
      const p = this.recording.pause();
      p.then(() => this.dispatchEvent(new Event('pause')));
      return p;
    }
  }

  /**
   * Resumes the recording, if it exists.
   * @returns {Promise<SpeechSynthesisEvent>?} The `resume` event
   */
  resumeRecording() {
    if (this.recording !== undefined) {
      const p = this.recording.resume();
      p.then(() => this.dispatchEvent(new Event('resume')));
      return p;
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
      const saveEvent = new CustomEvent('save', { detail: { blob } });
      this.dispatchEvent(saveEvent);
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

    this.recordBtn.addEventListener('click', () => {
      if (this.recording === undefined) {
        this.startRecording();
      } else {
        this.saveRecording();
      }
    });

    this.prBtn.addEventListener('click', () => {
      if (this.recording.state === 'paused') {
        this.resumeRecording();
      } else {
        this.pauseRecording();
      }
    }); // Add 'click' event listener

    this.addEventListener('new', () => {
      this.recordBtn.innerText = LABELS.stop;

      this.prBtn.innerText = LABELS.pause;
      this.prBtn.hidden = false;
    });

    this.addEventListener('pause', () => {
      this.prBtn.innerText = LABELS.resume;
    });

    this.addEventListener('resume', () => {
      this.prBtn.innerText = LABELS.pause;
    });

    this.addEventListener('save', () => {
      this.recordBtn.innerText = LABELS.start;

      this.prBtn.hidden = true;
    });
  }

  /**
   * Adds a keyboard event listener to `this.kbdEvents` for handling shortcuts.
   */
  attachKeyboardListener() {
    // Letters for keyboard shortcuts
    // They are uppercase since shift must be held down to activate them
    const SHORTCUTS = {
      B: this.startRecording,
      M: this.pauseRecording,
      R: this.resumeRecording,
      E: this.saveRecording,
    };

    this.kbdEvents.addEventListener('keydown', (e) => {
      if ((rtv.keys.meta || rtv.keys.ctrl) && e.key in SHORTCUTS) {
        e.preventDefault();
        /* Run shortcut action.
           Since 'this' points to 'SHORTCUTS' by default, '.call' must be used to substitute it. */
        SHORTCUTS[e.key].call(this);
      }
    });
  }
}
