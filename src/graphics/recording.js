import { saveAs } from 'file-saver';
import { rtv } from '../resources';

/**
 * Creates a new recording of `canvas`.
 * @param {HTMLCanvasElement} canvas The canvas to be captured.
 */
export default class Recording extends EventTarget {
  constructor(canvas) {
    super();
    const videoStream = canvas.captureStream(); // Obtain media stream from canvas

    this.chunks = []; // Initialize array to hold recorded media
    // Initialize a media recorder with the video stream
    this.mediaRecorder = new MediaRecorder(videoStream);

    this.mediaRecorder.addEventListener('dataavailable', ({ data }) => {
      this.chunks.push(data); // Store media data
    }); // Attach event listener to the 'dataavailable' event

    // Listen for 'pause' event
    this.mediaRecorder.addEventListener('pause', (e) => this.dispatchEvent(e)); // Dispatch 'pause' event

    // Listen for 'resume' event
    this.mediaRecorder.addEventListener('resume', (e) => this.dispatchEvent(e)); // Dispatch 'resume' event

    this.mediaRecorder.addEventListener('stop', () => {
      const blob = new Blob(this.chunks, { type: 'video/mp4' }); // Convert media data to MP4 video

      const saveEvent = new CustomEvent('save', {
        detail: { blob }, // Pass object with blob as a detail
      }); // Create custom 'save' event

      // Dispatch event and continue only if it's is not prevented
      if (this.dispatchEvent(saveEvent)) {
        saveAs(blob, 'recording.mp4'); // Save video
      }
    }); // Attach event listener to the 'stop' event

    this.mediaRecorder.start(); // Start recording
  }

  /**
   * Pauses recording.
   */
  pause() {
    this.mediaRecorder.pause(); // Pause recording
  }

  /**
   * Resumes recording.
   */
  resume() {
    this.mediaRecorder.resume(); // Resume recording
  }

  /**
   * Stops and saves recording.
   */
  save() {
    this.mediaRecorder.stop(); // Stop recording, triggering event listener and saving
  }
}

/**
 * Sets up a button element to control recording functions.
 * @param {HTMLButtonElement} button The button to control recording.
 */
export function setUpRecordButton(button) {
  const MSGS = {
    start: 'Start recording',
    stop: 'Stop recording',
  }; // Button labels for different states

  let recording; // Declare 'recording' to store recording

  button.innerText = MSGS.start; // Start button with 'MSGS.start' message

  button.addEventListener('click', () => {
    if (recording === undefined) { // Check if recording doesn't exist yet
      recording = new Recording(rtv.c); // Initialize new recording with 'rtv.c' as canvas
      button.innerText = MSGS.stop; // Use 'MSGS.stop' for button label
    } else { // Recording exists
      recording.save(); // Save recording
      recording = undefined;
      button.innerText = MSGS.start; // Use 'MSGS.start' for button label
    }
  }); // Add 'click' event listener
}
