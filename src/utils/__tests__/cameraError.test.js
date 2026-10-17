import { getCameraErrorMessage } from "../cameraError";

describe("getCameraErrorMessage", () => {
  test.each([
    ["NotAllowedError", /access was denied/i],
    ["PermissionDeniedError", /access was denied/i],
    ["NotFoundError", /no camera was found/i],
    ["DevicesNotFoundError", /no camera was found/i],
    ["NotReadableError", /close other apps/i],
    ["TrackStartError", /close other apps/i],
  ])("returns an actionable message for %s", (name, expectedMessage) => {
    expect(getCameraErrorMessage({ name })).toMatch(expectedMessage);
  });

  test("handles unknown errors", () => {
    expect(getCameraErrorMessage({ name: "UnknownError" })).toMatch(
      /check camera permissions/i
    );
  });

  test("handles a missing error object", () => {
    expect(getCameraErrorMessage(null)).toMatch(
      /check camera permissions/i
    );
  });
});
