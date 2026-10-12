import {
  MEDIAPIPE_WASM_URL,
  GESTURE_RECOGNIZER_OPTIONS,
  MIN_GESTURE_CONFIDENCE,
} from "../vision";

describe("MediaPipe vision configuration", () => {
  test("uses the pinned MediaPipe WASM version", () => {
    expect(MEDIAPIPE_WASM_URL).toBe(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.1.0-alpha-8/wasm"
    );
  });

  test("configures gesture recognition for video and two hands", () => {
    expect(GESTURE_RECOGNIZER_OPTIONS).toEqual({
      numHands: 2,
      runningMode: "VIDEO",
    });
  });

  test("uses a minimum gesture confidence threshold of 50", () => {
    expect(MIN_GESTURE_CONFIDENCE).toBe(50);
  });
});
