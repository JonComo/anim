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
   * Stops and saves recording.
   * @returns {Promise<Blob>} The saved video data.
   */
  save() {
    this.stop(); // Stop recording, triggering event listener and saving
    return new Promise((resolve) => {
      this.addEventListener('save', ({ detail: { blob } }) => resolve(blob));
    }); // Return promise that resolves with saved recording
  }
}

/**
 * Sets up a button element to control recording functions.
 * @param {HTMLButtonElement} button The button to control recording.
 */
export function setUpRecordButton(button, canvas) {
  const MSGS = {
    start: 'Start recording',
    stop: 'Stop recording',
  }; // Button labels for different states

  let recording; // Declare 'recording' to store recording

  button.innerText = MSGS.start; // Start button with 'MSGS.start' message

  button.addEventListener('click', () => {
    if (recording === undefined) { // Check if recording doesn't exist yet
      recording = new Recording(canvas); // Initialize new recording with 'rtv.c' as canvas
      recording.addEventListener('start', () => {
        button.innerText = MSGS.stop; // Use 'MSGS.stop' for button label
      }); // Listen for recording start
    } else { // Recording exists
      recording.save(); // Save recording
      recording.save().then(() => {
        recording = undefined; // The 'Recording' instance can now be garbage collected
        button.innerText = MSGS.start; // Use 'MSGS.start' for button label
      }); // Callback is run only after 'save' resolves
    }
  }); // Add 'click' event listener
}
