import { saveAs } from 'file-saver';

/**
 * Creates a new recording of `canvas`.
 * @param {HTMLCanvasElement} canvas The canvas to be captured.
 */
export default class Recording extends MediaRecorder {
  constructor(canvas) {
    const videoStream = canvas.captureStream(); // Obtain media stream from canvas
    super(videoStream); // Pass 'videoStream' to 'MediaRecorder' constructor

    this.chunks = []; // Initialize array to hold recorded media

    this.addEventListener('dataavailable', ({ data }) => {
      this.chunks.push(data); // Store media data
    }); // Attach event listener to the 'dataavailable' event

    this.addEventListener('stop', () => {
      const blob = new Blob(this.chunks, { type: 'video/mp4' }); // Convert media data to MP4 video

      const saveEvent = new CustomEvent('save', {
        detail: { blob }, // Pass object with blob as a detail
      }); // Create custom 'save' event

      // Dispatch event and continue only if it's is not prevented
      if (this.dispatchEvent(saveEvent)) {
        saveAs(blob, 'recording.mp4'); // Save video
      }
    }); // Attach event listener to the 'stop' event

    this.start(); // Start recording
  }

  /**
   * Pauses recording.
   * @returns {Promise<Event>} Pause event.
   */
  pause() {
    super.pause();
    return new Promise((resolve) => this.addEventListener('pause', resolve, { once: true })); // Return promise that resolves when recording is paused
  }

  /**
   * Resumes recording.
   * @returns {Promise<SpeechSynthesisEvent>} Resume event.
   */
  resume() {
    super.resume();
    return new Promise((resolve) => this.addEventListener('resume', resolve, { once: true })); // Return promise that resolves when recording is resumed
  }

  /**
   * Stops and saves recording.
   * @param {boolean?} cancel Whether or not the `save` event should be canceled
   * @returns {Promise<Blob>} The saved video data.
   */
  save(cancel = false) {
    this.stop(); // Stop recording, triggering event listener and saving
    return new Promise((resolve) => {
      this.addEventListener('save', (e) => {
        resolve(e.detail.blob); // Resolve with 'blob'
        if (cancel) e.preventDefault(); // Prevent default if 'cancel' is true
      }, { once: true });
    }); // Return promise that resolves with saved recording
  }
}

/**
 * Sets up button elements to control recording functions.
 * @param {HTMLButtonElement} recordBtn The button to start and stop recording.
 * @param {HTMLButtonElement} prBtn The button to pause and resume recording.
 */
export function setUpRecordingButtons(recordBtn, prBtn, canvas) {
  const MSGS = {
    start: 'Start recording',
    pause: 'Pause recording',
    resume: 'Resume recording',
    stop: 'Stop recording',
  }; // Button labels for different states

  let recording; // Declare 'recording' to store recording

  recordBtn.innerText = MSGS.start; // Start button with 'MSGS.start' message
  prBtn.hidden = true; // Hide button

  recordBtn.addEventListener('click', () => {
    if (recording === undefined) { // Check if recording doesn't exist yet
      recording = new Recording(canvas); // Initialize new recording with 'rtv.c' as canvas
      recording.addEventListener('start', () => {
        recordBtn.innerText = MSGS.stop; // Use 'MSGS.stop' for button label

        prBtn.innerText = MSGS.pause; // Use 'MSGS.pause' for button label
        prBtn.hidden = false; // Show button
      }); // Listen for recording start
    } else { // Recording exists
      recording.save(); // Save recording
      recording.save().then(() => {
        recording = undefined; // The 'Recording' instance can now be garbage collected
        recordBtn.innerText = MSGS.start; // Use 'MSGS.start' for button label

        prBtn.hidden = true; // Hide button
      }); // Callback is run only after 'save' resolves
    }
  }); // Add 'click' event listener

  prBtn.addEventListener('click', () => {
    if (recording.state === 'paused') { // Check if recording is paused
      recording.resume().then(() => {
        prBtn.innerText = MSGS.pause; // Use 'MSGS.pause' for button label
      }); // Resume recording
    } else {
      recording.pause().then(() => {
        prBtn.innerText = MSGS.resume; // Use 'MSGS.resume' for button label
      }); // Pause recording
    }
  }); // Add 'click' event listener
}
