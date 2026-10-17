import {
  FilesetResolver,
  GestureRecognizer,
} from "@mediapipe/tasks-vision";
import { createGestureRecognizer } from "../gestureRecognizer";
import {
  MEDIAPIPE_WASM_URL,
  GESTURE_RECOGNIZER_OPTIONS,
} from "../../config/vision";

jest.mock("@mediapipe/tasks-vision", () => ({
  FilesetResolver: {
    forVisionTasks: jest.fn(),
  },
  GestureRecognizer: {
    createFromOptions: jest.fn(),
  },
}));

describe("createGestureRecognizer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("rejects an empty model asset path", async () => {
    await expect(createGestureRecognizer("")).rejects.toThrow(
      "A gesture model asset path is required."
    );

    expect(FilesetResolver.forVisionTasks).not.toHaveBeenCalled();
    expect(GestureRecognizer.createFromOptions).not.toHaveBeenCalled();
  });

  test.each([null, 123, "   "])(
    "rejects an invalid model asset path: %p",
    async (modelPath) => {
      await expect(createGestureRecognizer(modelPath)).rejects.toThrow(
        "A gesture model asset path is required."
      );

      expect(FilesetResolver.forVisionTasks).not.toHaveBeenCalled();
      expect(GestureRecognizer.createFromOptions).not.toHaveBeenCalled();
    }
  );

  test("initializes MediaPipe with the configured model and options", async () => {
    const vision = { runtime: "mock-vision" };
    const recognizer = { close: jest.fn() };

    FilesetResolver.forVisionTasks.mockResolvedValue(vision);
    GestureRecognizer.createFromOptions.mockResolvedValue(recognizer);

    await expect(
      createGestureRecognizer("/models/gesture.task")
    ).resolves.toBe(recognizer);

    expect(FilesetResolver.forVisionTasks).toHaveBeenCalledWith(
      MEDIAPIPE_WASM_URL
    );

    expect(GestureRecognizer.createFromOptions).toHaveBeenCalledWith(
      vision,
      {
        baseOptions: {
          modelAssetPath: "/models/gesture.task",
        },
        ...GESTURE_RECOGNIZER_OPTIONS,
      }
    );
  });

  test("propagates MediaPipe runtime initialization failures", async () => {
    const error = new Error("WASM runtime unavailable");
    FilesetResolver.forVisionTasks.mockRejectedValue(error);

    await expect(
      createGestureRecognizer("/models/gesture.task")
    ).rejects.toBe(error);

    expect(GestureRecognizer.createFromOptions).not.toHaveBeenCalled();
  });

  test("propagates model initialization failures", async () => {
    const vision = { runtime: "mock-vision" };
    const error = new Error("Invalid model asset");

    FilesetResolver.forVisionTasks.mockResolvedValue(vision);
    GestureRecognizer.createFromOptions.mockRejectedValue(error);

    await expect(
      createGestureRecognizer("/models/gesture.task")
    ).rejects.toBe(error);
  });

  test("propagates a WASM resolver rejection value unchanged", async () => {
    const rejection = "WASM resolver failed";
    FilesetResolver.forVisionTasks.mockRejectedValue(rejection);

    await expect(
      createGestureRecognizer("/models/gesture.task")
    ).rejects.toBe(rejection);

    expect(GestureRecognizer.createFromOptions).not.toHaveBeenCalled();
  });

  test("propagates a model creation rejection value unchanged", async () => {
    const vision = { runtime: "mock-vision" };
    const rejection = "Model creation failed";

    FilesetResolver.forVisionTasks.mockResolvedValue(vision);
    GestureRecognizer.createFromOptions.mockRejectedValue(rejection);

    await expect(
      createGestureRecognizer("/models/gesture.task")
    ).rejects.toBe(rejection);

    expect(GestureRecognizer.createFromOptions).toHaveBeenCalledTimes(1);
  });
});
