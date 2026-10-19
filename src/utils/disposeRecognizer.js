/**
 * Safely disposes of an initialized gesture recognizer.
 *
 * @param {object|null|undefined} recognizer Gesture recognizer to dispose.
 * @returns {boolean} Whether a recognizer was disposed.
 */
export function disposeRecognizer(recognizer) {
  if (!recognizer || typeof recognizer.close !== "function") {
    return false;
  }

  recognizer.close();
  return true;
}
