import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";
import {
  MEDIAPIPE_WASM_URL,
  GESTURE_RECOGNIZER_OPTIONS,
} from "../config/vision";

/**
 * Initializes the MediaPipe gesture recognizer.
 *
 * @param {string} modelAssetPath Path to the trained gesture model.
 * @returns {Promise<object>} Initialized gesture recognizer.
 */
export async function createGestureRecognizer(modelAssetPath) {
  if (!modelAssetPath) {
    throw new Error("A gesture model asset path is required.");
  }

  const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);

  return GestureRecognizer.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath,
    },
    ...GESTURE_RECOGNIZER_OPTIONS,
  });
}
