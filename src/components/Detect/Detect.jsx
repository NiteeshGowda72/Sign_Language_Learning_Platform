import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Detect.css";
import { v4 as uuidv4 } from "uuid";
import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";
import {
  drawConnectors,
  drawLandmarks,
} from "@mediapipe/drawing_utils";
import { HAND_CONNECTIONS } from "@mediapipe/hands";
import Webcam from "react-webcam";
import { SignImageData } from "../../data/SignImageData";
import { useDispatch, useSelector } from "react-redux";
import { addSignData } from "../../redux/actions/signdataaction";
import ProgressBar from "./ProgressBar/ProgressBar";
import { useGoogleLogin } from "@react-oauth/google";
import { loginSuccess, loginFail } from "../../redux/actions/authaction";
import { useProgress } from "../../context/ProgressContext";
import "../../pages/Test.css";
import gestureModel from "../../assests/sign_language_recognizer_25-04-2025.task";

let startTime = "";

const Detect = ({ onRecognize }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Refs
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const requestRef = useRef();
  const ttsUtteranceRef = useRef(null);
  const gestureOutputRef = useRef("");

  // Timer refs (using refs to avoid re-renders)
  const timerStartedRef = useRef(false);
  const startTimeRef = useRef(null);
  const intervalRef = useRef(null);
  const hasSpokenRef = useRef(false);
  const currentImageNameRef = useRef(null);
  const confidenceRef = useRef(0); // Track confidence for interval checks
  const isCompletedRef = useRef(false); // Track completion state for interval checks
  const autoAdvanceTimeoutRef = useRef(null); // Track auto-advance timeout to allow cancellation

  // Core state
  const [practiceStarted, setPracticeStarted] = useState(false); // Track if practice has started
  const [webcamRunning, setWebcamRunning] = useState(false);
  const [gestureRecognizer, setGestureRecognizer] = useState(null);
  const [runningMode, setRunningMode] = useState("IMAGE");

  // Reset to instructions screen when navigating from sidebar
  useEffect(() => {
    if (location.state?.showInstructions) {
      setPracticeStarted(false);
      // Clear the state to prevent resetting on every render
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Detection state
  const [gestureOutput, setGestureOutput] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [detectedData, setDetectedData] = useState([]);

  // Learning flow state
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [countdownNumber, setCountdownNumber] = useState(null); // 3, 2, 1, or null
  const [isManualSelection, setIsManualSelection] = useState(false); // Track if sign was manually selected (disables auto-advance)
  const [isSelectorOpen, setIsSelectorOpen] = useState(false); // Track dropdown open/close state
  const [isCompleted, setIsCompleted] = useState(false); // Track if current sign is completed (locks detection)

  // Redux state
  const user = useSelector((state) => state.auth?.user);
  const { accessToken } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  // Progress tracking
  const { updatePracticeProgress } = useProgress();

  // Google Login setup (keeping existing logic)
  const handleLoginSuccess = useCallback((tokenResponse) => {
    dispatch(loginSuccess(tokenResponse));
  }, [dispatch]);

  const handleLoginError = useCallback((error) => {
    dispatch(loginFail(error));
  }, [dispatch]);

  const googleLogin = useGoogleLogin({
    onSuccess: handleLoginSuccess,
    onError: handleLoginError,
  });

  // Auto-trigger login when component mounts and user is not logged in
  useEffect(() => {
    if (!accessToken) {
      googleLogin();
    }
  }, [accessToken, googleLogin]);

  // Get current image
  const currentImage = SignImageData[currentImageIndex] || null;

  /**
   * Text-to-Speech function
   * Speaks the detected sign label slowly and clearly for learners
   * Uses slow, teacher-like speech rate for better comprehension
   * Handles single letters (A, B, C, D, etc.) and phrases (I Love You, Thank You)
   * Improved reliability with better error handling and state checking
   */
  const speakSignLabel = useCallback((text) => {
    if (!text || !text.trim() || !('speechSynthesis' in window)) {
      console.warn('TTS: Invalid text or speechSynthesis not available');
      return;
    }

    // Check if speechSynthesis is available and ready
    if (!window.speechSynthesis) {
      console.warn('TTS: speechSynthesis not available');
      return;
    }

    // Cancel any ongoing speech to prevent overlapping
    window.speechSynthesis.cancel();

    // Wait for speechSynthesis to be ready (handle pending state)
    const speakWithRetry = (attempt = 0) => {
      // Check if speechSynthesis is speaking or pending
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        if (attempt < 5) {
          // Retry after a short delay
          setTimeout(() => speakWithRetry(attempt + 1), 50);
          return;
        } else {
          // Force cancel and proceed
          window.speechSynthesis.cancel();
        }
      }

      let textToSpeak = text.trim();

      // Handle single letters - add "letter" prefix for better pronunciation
      // Check if it's a single uppercase letter (A-Z)
      if (textToSpeak.length === 1 && /^[A-Z]$/.test(textToSpeak)) {
        textToSpeak = `Letter ${textToSpeak}`;
      }
      // Handle single lowercase letters
      else if (textToSpeak.length === 1 && /^[a-z]$/.test(textToSpeak)) {
        textToSpeak = `Letter ${textToSpeak.toUpperCase()}`;
      }

      // Ensure text is not empty after processing
      if (!textToSpeak || textToSpeak.trim() === '') {
        console.warn('TTS: Text is empty after processing');
        return;
      }

      try {
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = 'en-US';
        utterance.rate = 0.5; // Slow and clear speech (teacher-like pace for learners)
        utterance.pitch = 1.0; // Normal pitch for clarity
        utterance.volume = 1.0;

        utterance.onstart = () => {
          console.log('TTS started:', textToSpeak, '(original:', text, ')');
        };

        utterance.onend = () => {
          console.log('TTS ended successfully:', textToSpeak);
          ttsUtteranceRef.current = null;
        };

        utterance.onerror = (event) => {
          console.error('TTS error:', event.error, 'for text:', textToSpeak);
          ttsUtteranceRef.current = null;

          // Retry once on error (except for cancelled errors)
          if (event.error !== 'canceled' && attempt === 0) {
            console.log('TTS: Retrying after error...');
            setTimeout(() => speakWithRetry(1), 200);
          }
        };

        ttsUtteranceRef.current = utterance;

        // Ensure speechSynthesis is ready before speaking
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
          setTimeout(() => {
            window.speechSynthesis.speak(utterance);
            console.log('TTS speak() called (after cancel):', textToSpeak);
          }, 100);
        } else {
          window.speechSynthesis.speak(utterance);
          console.log('TTS speak() called for:', textToSpeak);
        }
      } catch (error) {
        console.error('TTS speak() error:', error);
        // Retry once on exception
        if (attempt === 0) {
          setTimeout(() => speakWithRetry(1), 200);
        }
      }
    };

    // Start speaking after a short delay to ensure cancellation is processed
    setTimeout(() => speakWithRetry(), 150);
  }, []);

  /**
   * Reset all timer states and refs
   * Used by both manual selection and auto-advance
   */
  const resetAllTimers = useCallback(() => {
    // Clear interval if still running
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Clear auto-advance timeout if pending
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }

    // Reset all timer refs
    timerStartedRef.current = false;
    startTimeRef.current = null;
    hasSpokenRef.current = false;

    // Reset all states
    setCountdownNumber(null);
    setGestureOutput("");
    gestureOutputRef.current = "";
    setConfidence(0);
  }, []);

  /**
   * Handle Repeat button click
   * Resets completion state and re-enables detection for the current sign
   * Also cancels any pending auto-advance
   */
  const handleRepeat = useCallback(() => {
    console.log('Repeat clicked - resetting for current sign');

    // Cancel any pending auto-advance
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
      console.log('Auto-advance cancelled by Repeat button');
    }

    // Reset completion state
    setIsCompleted(false);
    isCompletedRef.current = false; // Update ref immediately

    // Reset all timers and states
    resetAllTimers();

    console.log('Repeat complete - detection re-enabled for current sign');
  }, [resetAllTimers]);

  /**
   * Navigate to previous sign
   * Resets all timers, completion state, and detection states
   * Wraps to last sign if at first
   */
  const handlePreviousSign = useCallback(() => {
    console.log('Previous sign clicked');

    // Reset all timers and states
    resetAllTimers();

    // Reset completion state for new sign
    setIsCompleted(false);
    isCompletedRef.current = false;

    // Reset manual selection flag
    setIsManualSelection(false);

    // Reset detection states
    setConfidence(0);
    setGestureOutput("");
    gestureOutputRef.current = "";

    setCurrentImageIndex((prevIndex) => {
      const prevIndex_new = prevIndex === 0 ? SignImageData.length - 1 : prevIndex - 1;
      const prevImage = SignImageData[prevIndex_new];
      currentImageNameRef.current = prevImage?.name?.toUpperCase() || null;
      console.log('Navigated to previous sign:', prevImage?.name);
      return prevIndex_new;
    });
  }, [resetAllTimers]);

  /**
   * Navigate to next sign
   * Resets all timers, completion state, and detection states
   * Wraps to first sign if at last
   */
  const handleNextSign = useCallback(() => {
    console.log('Next sign clicked');

    // Reset all timers and states
    resetAllTimers();

    // Reset completion state for new sign
    setIsCompleted(false);
    isCompletedRef.current = false;

    // Reset manual selection flag
    setIsManualSelection(false);

    // Reset detection states
    setConfidence(0);
    setGestureOutput("");
    gestureOutputRef.current = "";

    setCurrentImageIndex((prevIndex) => {
      const nextIndex = (prevIndex + 1) % SignImageData.length;
      const nextImage = SignImageData[nextIndex];
      currentImageNameRef.current = nextImage?.name?.toUpperCase() || null;
      console.log('Navigated to next sign:', nextImage?.name);
      return nextIndex;
    });
  }, [resetAllTimers]);

  /**
   * Handle manual sign selection from the dropdown
   * Resets everything and sets the selected sign as active
   * After completion, will wait 5 seconds then auto-advance (same as Start mode)
   */
  const handleManualSignSelection = useCallback((selectedIndex) => {
    console.log('Manual sign selection - index:', selectedIndex, 'sign:', SignImageData[selectedIndex]?.name);

    // Reset all timers and states
    resetAllTimers();

    // Reset completion state for new sign
    setIsCompleted(false);
    isCompletedRef.current = false; // Update ref

    // Set manual selection flag (will be reset after completion to allow auto-advance)
    setIsManualSelection(true);

    // Set the selected sign as current
    setCurrentImageIndex(selectedIndex);
    const selectedImage = SignImageData[selectedIndex];
    currentImageNameRef.current = selectedImage?.name?.toUpperCase() || null;

    // Close dropdown
    setIsSelectorOpen(false);

    console.log('Manual selection complete - sign:', selectedImage?.name, 'will auto-advance after 5 seconds when completed');
  }, [resetAllTimers]);

  /**
   * Mark current sign as completed
   * Clears countdown, locks detection, and prepares for Repeat button
   * NOTE: Does NOT cancel TTS - allows speech to complete naturally
   */
  const markSignCompleted = useCallback(() => {
    console.log('Sign completed - locking detection');

    // Clear countdown immediately
    setCountdownNumber(null);

    // Clear confidence and gesture output to hide them from UI
    setConfidence(0);
    setGestureOutput("");
    gestureOutputRef.current = "";

    // Mark as completed (locks detection)
    setIsCompleted(true);
    isCompletedRef.current = true; // Update ref immediately

    // Clear interval if still running
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Reset timer refs
    timerStartedRef.current = false;
    startTimeRef.current = null;
    hasSpokenRef.current = false;

    // NOTE: We do NOT cancel TTS here - let it complete naturally
    // This ensures the speech finishes even after sign completion

    console.log('Sign completion locked - Repeat button will appear');
  }, []);

  /**
   * Move to next sign image (AUTO-ADVANCE)
   * Works for both manually selected and auto-advance modes
   * Waits 5 seconds after completion before moving to next sign
   */
  const moveToNextSign = useCallback(() => {
    console.log('moveToNextSign called - will wait 5 seconds before advancing');

    // Cancel any existing auto-advance timeout
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }

    // Mark as completed to show Repeat button for ALL signs
    markSignCompleted();

    // Auto-advance to next sign after 5 seconds (works for both manual and auto modes)
    autoAdvanceTimeoutRef.current = setTimeout(() => {
      console.log('5 seconds elapsed - auto-advancing to next sign');

      // Reset all timers and states
      resetAllTimers();

      // Reset completion state for next sign
      setIsCompleted(false);
      isCompletedRef.current = false; // Update ref

      // Reset manual selection flag so next sign can also auto-advance
      setIsManualSelection(false);

      // Move to next image
      setCurrentImageIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % SignImageData.length;
        const nextImage = SignImageData[nextIndex];
        console.log('Auto-advancing to next sign:', nextImage?.name, 'at index:', nextIndex);
        // Update ref immediately
        currentImageNameRef.current = nextImage?.name?.toUpperCase() || null;
        return nextIndex;
      });

      // Clear the timeout ref
      autoAdvanceTimeoutRef.current = null;
    }, 5000); // 5 second delay before auto-advancing to next sign
  }, [resetAllTimers, markSignCompleted]);

  // Keep refs in sync with state
  useEffect(() => {
    gestureOutputRef.current = gestureOutput;
  }, [gestureOutput]);

  useEffect(() => {
    currentImageNameRef.current = currentImage?.name?.toUpperCase() || null;
  }, [currentImage]);

  useEffect(() => {
    confidenceRef.current = confidence;
  }, [confidence]);

  useEffect(() => {
    isCompletedRef.current = isCompleted;
  }, [isCompleted]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const selectorContainer = document.querySelector('.sign-selector-container');
      if (selectorContainer && !selectorContainer.contains(event.target) && isSelectorOpen) {
        setIsSelectorOpen(false);
      }
    };

    if (isSelectorOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isSelectorOpen]);

  /**
   * Timer logic using refs and Date.now()
   * Starts when confidence first reaches 50% AND sign matches
   * Restarts if confidence drops below 50% during countdown
   * Calculates elapsed time using Date.now() - startTimeRef.current
   */
  useEffect(() => {
    // Use ref for current image name to avoid stale closures
    const currentSignName = currentImageNameRef.current || currentImage?.name?.toUpperCase();
    const detectedSignName = gestureOutput?.toUpperCase();
    const signMatches = currentSignName && detectedSignName && detectedSignName === currentSignName;

    // Debug logging
    if (confidence >= 50 && gestureOutput) {
      console.log('Timer check - confidence:', confidence, 'currentSign:', currentSignName, 'detectedSign:', detectedSignName, 'matches:', signMatches, 'timerStarted:', timerStartedRef.current, 'webcamRunning:', webcamRunning);
    }

    // If confidence drops below 50% AND timer has started, restart the timer
    if (confidence < 50 && timerStartedRef.current && webcamRunning) {
      console.log('Confidence dropped below 50% during timer - restarting timer');
      // Clear the interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Reset timer refs
      timerStartedRef.current = false;
      startTimeRef.current = null;
      hasSpokenRef.current = false;
      setCountdownNumber(null);
    }

    // Don't start timer if sign is already completed
    if (isCompleted) {
      return;
    }

    // Start timer when:
    // 1. Confidence >= 50%
    // 2. Timer hasn't started yet (or was just reset)
    // 3. Webcam is running
    // 4. Sign matches current image
    // 5. Sign is NOT completed
    if (confidence >= 50 && !timerStartedRef.current && webcamRunning && gestureOutput && signMatches && !isCompleted) {
      console.log('Timer starting - confidence:', confidence, 'sign:', gestureOutput, 'currentImage:', currentImage?.name, 'currentImageNameRef:', currentImageNameRef.current);
      timerStartedRef.current = true;
      startTimeRef.current = Date.now();
      hasSpokenRef.current = false;
      setCountdownNumber(3); // Show countdown 3

      // Start interval to update countdown and check timing
      intervalRef.current = setInterval(() => {
        if (!startTimeRef.current) {
          return;
        }

        // If sign is completed, stop the timer immediately
        // This prevents countdown from continuing after completion
        if (isCompletedRef.current) {
          console.log('Sign completed during interval - stopping timer');
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          timerStartedRef.current = false;
          startTimeRef.current = null;
          hasSpokenRef.current = false;
          setCountdownNumber(null);
          return;
        }

        // Check confidence on each interval - restart if drops below 50%
        if (confidenceRef.current < 50) {
          console.log('Confidence dropped below 50% during timer interval - restarting timer');
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          timerStartedRef.current = false;
          startTimeRef.current = null;
          hasSpokenRef.current = false;
          setCountdownNumber(null);
          return;
        }

        // Verify sign still matches current image (check on each interval)
        const currentSign = currentImageNameRef.current;
        const detectedSign = gestureOutputRef.current?.toUpperCase();
        if (!currentSign || !detectedSign || detectedSign !== currentSign) {
          // Sign changed or doesn't match - stop timer
          console.log('Sign changed during timer - stopping. Current:', currentSign, 'Detected:', detectedSign);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          timerStartedRef.current = false;
          startTimeRef.current = null;
          hasSpokenRef.current = false;
          setCountdownNumber(null);
          return;
        }

        // Calculate elapsed time in seconds
        const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000;

        // Update countdown display based on elapsed time
        if (elapsedSeconds >= 0 && elapsedSeconds < 1) {
          setCountdownNumber(3);
        } else if (elapsedSeconds >= 1 && elapsedSeconds < 2) {
          setCountdownNumber(2);
        } else if (elapsedSeconds >= 2 && elapsedSeconds < 3) {
          setCountdownNumber(1);
        }

        // At 2 seconds: Trigger TTS (only once)
        // Expanded window to ensure TTS triggers reliably (2.0 to 2.5 seconds)
        if (elapsedSeconds >= 2.0 && elapsedSeconds < 2.5 && !hasSpokenRef.current && gestureOutputRef.current) {
          hasSpokenRef.current = true;
          const textToSpeak = gestureOutputRef.current;
          console.log('TTS triggered at', elapsedSeconds.toFixed(2), 'seconds:', textToSpeak);
          speakSignLabel(textToSpeak);
        }

        // At 3 seconds: Complete the sign
        if (elapsedSeconds >= 3.0) {
          console.log('Timer complete at 3 seconds - marking sign as completed');

          // Clear the interval
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }

          // Clear countdown immediately
          setCountdownNumber(null);

          // Mark sign as completed (this will lock detection)
          markSignCompleted();

          // Move to next sign (will check isManualSelection internally)
          // This happens after marking as completed
          moveToNextSign();
        }
      }, 50); // Update every 50ms for smooth countdown
    } else if (confidence < 50 && !timerStartedRef.current) {
      // Reset if confidence is below 50% and timer hasn't started
      // Also reset if sign doesn't match (even if confidence is high)
      const currentSignName = currentImageNameRef.current || currentImage?.name?.toUpperCase();
      const detectedSignName = gestureOutput?.toUpperCase();
      const signMatches = currentSignName && detectedSignName && detectedSignName === currentSignName;

      if (!signMatches && gestureOutput) {
        // Sign doesn't match - reset timer
        console.log('Sign mismatch in timer useEffect - resetting. Current:', currentSignName, 'Detected:', detectedSignName);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        timerStartedRef.current = false;
        startTimeRef.current = null;
        hasSpokenRef.current = false;
        setCountdownNumber(null);
      } else if (confidence < 50 && !timerStartedRef.current) {
        // Confidence dropped below 50% and timer hasn't started
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        timerStartedRef.current = false;
        startTimeRef.current = null;
        hasSpokenRef.current = false;
        setCountdownNumber(null);
      }
    }

    // Cleanup on unmount or when conditions change
    return () => {
      // Don't clear interval here - let it run until completion
      // Only clear on unmount
    };
  }, [confidence, webcamRunning, gestureOutput, currentImage, speakSignLabel, moveToNextSign, isCompleted, markSignCompleted]);

  /**
   * Main detection loop
   * Processes webcam frames and detects gestures
   */
  const predictWebcam = useCallback(() => {
    // Check if webcam and gestureRecognizer are available
    if (!webcamRef.current || !webcamRef.current.video || !gestureRecognizer) {
      // Continue loop to wait for webcam/recognizer to be ready
      if (webcamRunning) {
        requestRef.current = requestAnimationFrame(predictWebcam);
      }
      return;
    }

    // If sign is completed, stop all detection and clear canvas
    if (isCompletedRef.current) {
      // Clear canvas to remove any patterns
      if (canvasRef.current) {
        const canvasCtx = canvasRef.current.getContext("2d");
        if (canvasCtx) {
          canvasCtx.clearRect(
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height
          );
        }
      }
      // Continue animation loop but don't process anything
      if (webcamRunning) {
        requestRef.current = requestAnimationFrame(predictWebcam);
      }
      return;
    }

    // Switch to VIDEO mode if needed
    if (runningMode === "IMAGE") {
      setRunningMode("VIDEO");
      gestureRecognizer.setOptions({ runningMode: "VIDEO" });
    }

    let nowInMs = Date.now();
    const results = gestureRecognizer.recognizeForVideo(
      webcamRef.current.video,
      nowInMs
    );

    // Check if canvas is available
    if (!canvasRef.current) {
      if (webcamRunning) {
        requestRef.current = requestAnimationFrame(predictWebcam);
      }
      return;
    }

    const canvasCtx = canvasRef.current.getContext("2d");
    canvasCtx.save();
    canvasCtx.clearRect(
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );

    const videoWidth = webcamRef.current.video.videoWidth;
    const videoHeight = webcamRef.current.video.videoHeight;

    // Check if video dimensions are available
    if (!videoWidth || !videoHeight) {
      if (webcamRunning) {
        requestRef.current = requestAnimationFrame(predictWebcam);
      }
      return;
    }

    // Set video width and height to match actual video dimensions
    webcamRef.current.video.width = videoWidth;
    webcamRef.current.video.height = videoHeight;

    // Set canvas to match video's internal resolution
    // MediaPipe drawing functions expect canvas to match video resolution
    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;

    // Draw the results on the canvas, if any.
    if (results.landmarks) {
      for (const landmarks of results.landmarks) {
        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
          color: "#00FF00",
          lineWidth: 5,
        });

        drawLandmarks(canvasCtx, landmarks, { color: "#FF0000", lineWidth: 2 });
      }
    }

    canvasCtx.restore();

    // Process gesture detection results
    if (results.gestures.length > 0) {
      const recognizedText = results.gestures[0][0].categoryName;
      const confidenceScore = Math.round(parseFloat(results.gestures[0][0].score) * 100);

      // Check if detected sign matches current image sign
      // Use ref to get the most up-to-date image name (avoids stale closures)
      const currentSignName = currentImageNameRef.current || currentImage?.name?.toUpperCase();
      const detectedSignName = recognizedText.toUpperCase();

      // Only process if sign matches current image AND sign is not completed
      if (currentSignName && detectedSignName && detectedSignName === currentSignName && !isCompleted) {
        setGestureOutput(recognizedText);
        setConfidence(confidenceScore);

        // Track detection data for analytics
        setDetectedData((prevData) => [
          ...prevData,
          {
            SignDetected: recognizedText,
            confidence: confidenceScore,
          },
        ]);

        // Call onRecognize callback if provided
        if (onRecognize && typeof onRecognize === 'function') {
          onRecognize(recognizedText);
        }
      } else {
        // Sign doesn't match - reset everything including timer
        // Only reset if we have a detected sign (to avoid resetting on empty detection)
        if (detectedSignName && currentSignName) {
          console.log('Sign mismatch in predictWebcam - Current:', currentSignName, 'Detected:', detectedSignName);
        }
        setGestureOutput("");
        setConfidence(0);

        // Reset timer if it was running (wrong sign detected)
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        timerStartedRef.current = false;
        startTimeRef.current = null;
        hasSpokenRef.current = false;
        setCountdownNumber(null);
      }
    } else {
      // No gesture detected - reset everything
      setGestureOutput("");
      setConfidence(0);

      // Reset timer if it was running
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      timerStartedRef.current = false;
      startTimeRef.current = null;
      hasSpokenRef.current = false;
      setCountdownNumber(null);
    }

    // Continue animation loop
    if (webcamRunning) {
      requestRef.current = requestAnimationFrame(predictWebcam);
    }
  }, [
    webcamRunning,
    runningMode,
    gestureRecognizer,
    currentImage,
    onRecognize,
    isCompleted,
  ]);

  /**
   * Animation loop starter
   */
  const animate = useCallback(() => {
    requestRef.current = requestAnimationFrame(animate);
    predictWebcam();
  }, [predictWebcam]);

  /**
   * Enable/Disable camera
   */
  const enableCam = useCallback(() => {
    if (!gestureRecognizer) {
      alert("Please wait for gestureRecognizer to load");
      return;
    }

    if (webcamRunning === true) {
      // Stop camera
      setWebcamRunning(false);
      cancelAnimationFrame(requestRef.current);

      // Clear interval timer
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Cancel any ongoing TTS
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      // Reset all timer refs
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      timerStartedRef.current = false;
      startTimeRef.current = null;
      hasSpokenRef.current = false;

      // Reset states
      setCountdownNumber(null);
      setCurrentImageIndex(0);
      setGestureOutput("");
      gestureOutputRef.current = "";
      setConfidence(0);
      setIsManualSelection(false); // Reset manual selection flag when stopping
      setIsCompleted(false); // Reset completion state when stopping
      isCompletedRef.current = false; // Update ref

      // Save detection data (existing logic)
      const endTime = new Date();
      // Safety check: ensure startTime is a Date object before calling getTime()
      const timeElapsed = startTime && startTime instanceof Date
        ? (
          (endTime.getTime() - startTime.getTime()) /
          1000
        ).toFixed(2)
        : "0.00";

      const nonEmptyData = detectedData.filter(
        (data) => data && data.SignDetected && data.SignDetected !== ""
      );

      if (nonEmptyData.length > 0) {
        const resultArray = [];
        let current = nonEmptyData[0];

        for (let i = 1; i < nonEmptyData.length; i++) {
          if (
            nonEmptyData[i] &&
            nonEmptyData[i].SignDetected &&
            current &&
            current.SignDetected &&
            nonEmptyData[i].SignDetected !== current.SignDetected
          ) {
            resultArray.push(current);
            current = nonEmptyData[i];
          }
        }

        if (current && current.SignDetected) {
          resultArray.push(current);
        }

        const countMap = new Map();
        for (const item of resultArray) {
          if (item && item.SignDetected) {
            const count = countMap.get(item.SignDetected) || 0;
            countMap.set(item.SignDetected, count + 1);
          }
        }

        const sortedArray = Array.from(countMap.entries()).sort(
          (a, b) => b[1] - a[1]
        );

        const outputArray = sortedArray
          .slice(0, 5)
          .map(([sign, count]) => ({ SignDetected: sign, count }));

        const data = {
          signsPerformed: outputArray,
          id: uuidv4(),
          username: user?.name,
          userId: user?.userId,
          createdAt: String(endTime),
          secondsSpent: Number(timeElapsed),
        };

        if (outputArray.length > 0 && user?.userId) {
          dispatch(addSignData(data));

          // Update progress tracking - count total signs practiced in this session
          const totalSignsInSession = outputArray.reduce(
            (sum, sign) => sum + (sign.count || 0),
            0
          );
          updatePracticeProgress(totalSignsInSession);
        }
      }

      setDetectedData([]);
    } else {
      // Start camera
      setWebcamRunning(true);
      startTime = new Date();
      setCurrentImageIndex(0); // Start from first image

      // Set initial image name ref
      const firstImage = SignImageData[0];
      currentImageNameRef.current = firstImage?.name?.toUpperCase() || null;

      // Reset all timer refs
      timerStartedRef.current = false;
      startTimeRef.current = null;
      hasSpokenRef.current = false;
      setCountdownNumber(null);

      // Reset manual selection flag to enable auto-advance
      setIsManualSelection(false);

      // Reset completion state when starting
      setIsCompleted(false);
      isCompletedRef.current = false; // Update ref

      // Start animation loop - always start, no conditional check
      requestRef.current = requestAnimationFrame(animate);
    }
  }, [
    webcamRunning,
    gestureRecognizer,
    animate,
    detectedData,
    user?.name,
    user?.userId,
    dispatch,
  ]);

  /**
   * Load gesture recognizer model
   */
  useEffect(() => {
    async function loadGestureRecognizer() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        const recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: gestureModel,
          },
          numHands: 2,
          runningMode: runningMode,
        });
        setGestureRecognizer(recognizer);
      } catch (error) {
        console.error("Error loading gesture recognizer:", error);
      }
    }
    loadGestureRecognizer();
  }, [runningMode]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Cancel animation frame
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }

      // Clear interval timer
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Cancel TTS
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Suppress console logs in production
  if (
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "production"
  ) {
    console.log = function () { };
  }

  // Handle Start Practice button click
  const handleStartPractice = () => {
    setPracticeStarted(true);
  };

  // Show start screen if practice hasn't started
  if (!practiceStarted) {
    return (
      <div className="test-container">
        <div className="test-start-screen">
          <h1 className="test-start-title gradient__text">Sign Language Practice</h1>
          <div className="test-start-info">
            <h2>Practice Instructions</h2>
            <ul className="test-rules-list">
              <li>Practice sign language with real-time detection</li>
              <li>Follow the reference images to learn signs</li>
              <li>Get instant feedback on your performance</li>
              <li>Use the sign selector to choose specific signs</li>
              <li>Navigate through signs using the arrow buttons</li>
              <li>Click "Start" to begin practicing</li>
            </ul>
          </div>
          <div className="test-start-buttons">
            <button
              className="test-button primary"
              onClick={handleStartPractice}
            >
              Start Practice
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="signlang_detection-container">
        {accessToken ? (
          <>
            {/* Sign Selector Dropdown - Top Right of Main Container */}
            <div className="sign-selector-container">
              <button
                className="sign-selector-button"
                onClick={() => setIsSelectorOpen(!isSelectorOpen)}
                aria-label="Select sign"
              >
                <span>Select Sign</span>
                <span className={`sign-selector-arrow ${isSelectorOpen ? 'open' : ''}`}>▼</span>
              </button>

              {isSelectorOpen && (
                <div className="sign-selector-dropdown">
                  <div className="sign-selector-header">
                    <span>Choose a sign to practice</span>
                    <button
                      className="sign-selector-close"
                      onClick={() => setIsSelectorOpen(false)}
                      aria-label="Close selector"
                    >
                      ×
                    </button>
                  </div>
                  <div className="sign-selector-list">
                    {SignImageData.map((sign, index) => (
                      <button
                        key={`${sign.name}-${index}`}
                        className={`sign-selector-item ${index === currentImageIndex ? 'active' : ''
                          }`}
                        onClick={() => handleManualSignSelection(index)}
                      >
                        <span className="sign-selector-label">{sign.name}</span>
                        {index === currentImageIndex && (
                          <span className="sign-selector-check">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="signlang_webcam-wrapper" style={{ position: "relative" }}>
              <Webcam
                audio={false}
                ref={webcamRef}
                className="signlang_webcam"
              />

              <canvas ref={canvasRef} className="signlang_canvas" />

              {/* Countdown Overlay on Video Stream - Only show when countdown is active and sign is not completed */}
              {countdownNumber !== null && !isCompleted && (
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    fontSize: "120px",
                    fontWeight: 900,
                    color: "#4ade80",
                    textShadow: "0 0 20px rgba(74, 222, 128, 0.8), 0 0 40px rgba(74, 222, 128, 0.6)",
                    zIndex: 1000,
                    pointerEvents: "none",
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  {countdownNumber}
                </div>
              )}

              <div className="signlang_data-container">
                <div className="signlang_controls-row">
                  <button
                    onClick={enableCam}
                    type="button"
                    style={{ position: 'relative', zIndex: 1003 }}
                  >
                    {webcamRunning ? "Stop" : "Start"}
                  </button>
                </div>

                <div className="signlang_data">
                  {/* Only show gesture output and confidence when sign is NOT completed */}
                  {!isCompleted && (
                    <>
                      <div className="gesture_output-wrapper">
                        <p className="gesture_output">{gestureOutput || "—"}</p>
                      </div>

                      {/* Confidence Progress Bar */}
                      {confidence > 0 && (
                        <div style={{ marginTop: "0.5rem" }}>
                          <ProgressBar progress={confidence} />
                          <p
                            style={{
                              fontSize: "0.875rem",
                              color: confidence >= 50 ? "#4ade80" : "#81AFDD",
                              marginTop: "0.25rem",
                              textAlign: "center",
                            }}
                          >
                            Confidence: {confidence}%
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Show completion message when sign is completed */}
                  {isCompleted && (
                    <div style={{
                      marginTop: "1rem",
                      textAlign: "center",
                      color: "#4ade80",
                      fontSize: "1rem",
                      fontWeight: 600,
                    }}>
                      ✓ Sign Completed!
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="signlang_imagelist-container">
              <h2 className="gradient__text">Image</h2>

              <div className="signlang_image-div">
                {currentImage ? (
                  <>
                    <img
                      src={currentImage.url}
                      alt={`Sign: ${currentImage.name}`}
                    />

                    {/* Repeat Button - Directly below image, always visible when sign is completed */}
                    {isCompleted && currentImage && (
                      <button
                        onClick={handleRepeat}
                        className="repeat-button"
                        aria-label={`Repeat sign ${currentImage.name}`}
                        title={`Repeat sign ${currentImage.name}`}
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                          <path d="M21 3v5h-5"></path>
                          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                          <path d="M3 21v-5h5"></path>
                        </svg>
                        <span>Repeat</span>
                      </button>
                    )}

                    <div className="sign-navigation-row">
                      <div className="nav-button-container prev-container">
                        <button
                          onClick={handlePreviousSign}
                          className="nav-icon prev"
                          aria-label="Previous sign"
                          title="Previous sign"
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#fff"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M15 18l-6-6 6-6" />
                          </svg>
                        </button>
                      </div>

                      <div className="sign-name-container">
                        <div className="sign-name-label">
                          {currentImage.name}
                        </div>
                      </div>

                      <div className="nav-button-container next-container">
                        <button
                          onClick={handleNextSign}
                          className="nav-icon next"
                          aria-label="Next sign"
                          title="Next sign"
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#fff"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <h3 className="gradient__text">
                    Click on the Start Button <br /> to practice with Images
                  </h3>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="signlang_detection_notLoggedIn">
            <h1 className="gradient__text">Please Login !</h1>
          </div>
        )}
      </div>
    </>
  );
};

export default Detect;
