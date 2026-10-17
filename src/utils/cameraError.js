/**
 * Returns a user-friendly message for a camera access failure.
 *
 * @param {Error|null|undefined} error Camera initialization error.
 * @returns {string} Actionable camera error message.
 */
export function getCameraErrorMessage(error) {
  switch (error?.name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
    case "SecurityError":
      return "Camera access was denied. Allow camera permission in your browser settings and try again.";

    case "NotFoundError":
    case "DevicesNotFoundError":
      return "No camera was found. Connect a camera and try again.";

    case "NotReadableError":
    case "TrackStartError":
      return "The camera could not start. Close other apps using the camera and try again.";

    default:
      return "Unable to access the camera. Check camera permissions and try again.";
  }
}
