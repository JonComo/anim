import { saveAs } from 'file-saver';

/**
 * Creates a new recording of `canvas`.
 * @param {HTMLCanvasElement} canvas The canvas to be captured.
 */
export default class Recording {
  constructor(canvas) {
    const videoStream = canvas.captureStream(); // Obtain media stream from canvas

    this.chunks = []; // Initialize array to hold recorded media
    // Initialize a media recorder with the video stream
    this.mediaRecorder = new MediaRecorder(videoStream);

    this.mediaRecorder.addEventListener('dataavailable', ({ data }) => {
      this.chunks.push(data); // Store media data
    }); // Attach event listener to the 'dataavailable' event

    this.mediaRecorder.addEventListener('stop', () => {
      const blob = new Blob(this.chunks, { type: 'video/mp4' }); // Convert media data to MP4 video
      saveAs(blob, 'recording.mp4'); // Save video
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
