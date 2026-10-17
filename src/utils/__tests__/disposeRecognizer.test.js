import { disposeRecognizer } from "../disposeRecognizer";

describe("disposeRecognizer", () => {
  test("closes an initialized recognizer", () => {
    const recognizer = { close: jest.fn() };

    expect(disposeRecognizer(recognizer)).toBe(true);
    expect(recognizer.close).toHaveBeenCalledTimes(1);
  });

  test("returns false for a null recognizer", () => {
    expect(disposeRecognizer(null)).toBe(false);
  });

  test("returns false for an undefined recognizer", () => {
    expect(disposeRecognizer(undefined)).toBe(false);
  });

  test("returns false when close is unavailable", () => {
    expect(disposeRecognizer({})).toBe(false);
  });

  test("propagates disposal errors", () => {
    const error = new Error("Recognizer disposal failed");
    const recognizer = {
      close: jest.fn(() => {
        throw error;
      }),
    };

    expect(() => disposeRecognizer(recognizer)).toThrow(error);
  });
});
