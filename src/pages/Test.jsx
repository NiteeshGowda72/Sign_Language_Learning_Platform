import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../components/Detect/Detect.css";
import { v4 as uuidv4 } from "uuid";
import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";
import {
  drawConnectors,
  drawLandmarks,
} from "@mediapipe/drawing_utils";
import { HAND_CONNECTIONS } from "@mediapipe/hands";
import Webcam from "react-webcam";
import { SignImageData } from "../data/SignImageData";
import { useDispatch, useSelector } from "react-redux";
import { addSignData } from "../redux/actions/signdataaction";
import ProgressBar from "../components/Detect/ProgressBar/ProgressBar";
import { useGoogleLogin } from "@react-oauth/google";
import { loginSuccess, loginFail } from "../redux/actions/authaction";
import { useProgress } from "../context/ProgressContext";
import TestScoreboard from "../components/Test/TestScoreboard";
import TestActions from "../components/Test/TestActions";
import "./Test.css";

let startTime = "";

const Test = ({ onRecognize }) => {
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
  const timerIntervalRef = useRef(null); // Track 10-second timer interval
  const markSignCompletedRef = useRef(null); // Ref to store markSignCompleted function
  const moveToNextSignRef = useRef(null); // Ref to store moveToNextSign function
  const lastCompletedSignRef = useRef(null); // Track last completed sign to prevent immediate timer start
  const signTransitionTimeRef = useRef(null); // Track when we moved to a new sign

  // Core state
  const [practiceStarted, setPracticeStarted] = useState(false); // Track if practice has started
  const [webcamRunning, setWebcamRunning] = useState(false);
  
  // Reset to instructions screen when navigating from sidebar
  useEffect(() => {
    if (location.state?.showInstructions) {
      setPracticeStarted(false);
      // Clear the state to prevent resetting on every render
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);
  const [gestureRecognizer, setGestureRecognizer] = useState(null);
  const [runningMode, setRunningMode] = useState("IMAGE");
  
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
  const [timerSeconds, setTimerSeconds] = useState(10); // 10-second timer for each sign
  const [randomSigns, setRandomSigns] = useState([]); // 10 random signs for practice
  const [currentRandomSignIndex, setCurrentRandomSignIndex] = useState(0); // Track current sign in randomSigns array
  const [completedSigns, setCompletedSigns] = useState(new Set()); // Track which signs are completed (by index) - green
  const [failedSigns, setFailedSigns] = useState(new Set()); // Track which signs failed (timed out) - red
  const [testCompleted, setTestCompleted] = useState(false); // Track if test is completed
  const [signResults, setSignResults] = useState([]); // Track results for each sign (accuracy, completion status)
  const [maxConfidenceForSign, setMaxConfidenceForSign] = useState({}); // Track max confidence achieved for each sign
  const [confidenceValuesForSign, setConfidenceValuesForSign] = useState({}); // Track all confidence values during 3-second period for each sign
  const [signStartTime, setSignStartTime] = useState({}); // Track start time for each sign
  const [signEndTime, setSignEndTime] = useState({}); // Track end time for each sign

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

  // Get current sign from randomSigns array (for Test page)
  const currentImage = randomSigns.length > 0 && currentRandomSignIndex < randomSigns.length 
    ? randomSigns[currentRandomSignIndex] 
    : null;

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
          
          // Track TTS completion - mark sign as correct when TTS finishes
          // Check if sign matches and confidence is good, then mark as correct
          const currentSignName = currentImageNameRef.current?.toUpperCase();
          const detectedSignName = gestureOutputRef.current?.toUpperCase();
          const currentConfidence = confidenceRef.current || 0;
          
          // If TTS completed and sign matches with good confidence, mark as correct
          // This allows TTS completion to also mark the sign as correct (alternative to 3-second timer)
          if (currentSignName && detectedSignName && 
              detectedSignName === currentSignName && 
              currentConfidence >= 50 && 
              !isCompletedRef.current) {
            console.log('TTS completed - marking sign as correct:', textToSpeak);
            // Use setTimeout to defer execution and ensure functions are available
            setTimeout(() => {
              // Clear any running interval timer
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
              // Clear countdown
              setCountdownNumber(null);
              // Reset timer refs
              timerStartedRef.current = false;
              startTimeRef.current = null;
              hasSpokenRef.current = false;
              // Mark sign as completed using ref function if available
              if (markSignCompletedRef.current) {
                markSignCompletedRef.current();
              }
              // Move to next sign using ref function if available
              if (moveToNextSignRef.current) {
                moveToNextSignRef.current();
              }
            }, 0);
          }
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
   * Play beep sound
   * Used for test start and sign timeout notifications
   */
  const playBeepSound = useCallback(() => {
    try {
      // Create audio context for beep sound
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Configure beep sound (short, high-pitched beep)
      oscillator.frequency.value = 800; // Frequency in Hz
      oscillator.type = 'sine';
      
      // Set volume envelope (quick fade in/out)
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.15);
      
      // Play beep for 150ms
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    } catch (error) {
      console.warn('Beep sound failed:', error);
      // Fallback: try using a simple audio element
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OSdTgwOUKjk8LZjHAY4kdfyzHksBSR3x/DdkEAKFF606euoVRQKRp/g8r5sIQUqgc7y2Yk2CBtpvfDknU4MDlCo5PC2YxwGOJHX8sx5LAUkd8fw3ZBAC');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      } catch (e) {
        console.warn('Fallback beep sound also failed:', e);
      }
    }
  }, []);

  /**
   * Generate 10 random signs
   */
  const generateRandomSigns = useCallback(() => {
    const shuffled = [...SignImageData].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 10);
    setRandomSigns(selected);
    // Set first sign as current
    setCurrentRandomSignIndex(0);
    // Reset completed and failed signs when generating new random signs
    setCompletedSigns(new Set());
    setFailedSigns(new Set());
    setMaxConfidenceForSign({});
    setConfidenceValuesForSign({});
    setSignStartTime({});
    setSignEndTime({});
    setTestCompleted(false);
    setSignResults([]);
    if (selected.length > 0) {
      currentImageNameRef.current = selected[0].name.toUpperCase();
    }
  }, []);

  /**
   * Calculate test results and show completion page
   */
  const calculateAndShowResults = useCallback(() => {
    if (randomSigns.length === 0) return;
    
    // Ensure we have exactly 10 signs
    const signsToProcess = randomSigns.length >= 10 ? randomSigns.slice(0, 10) : randomSigns;
    
    // Calculate total time for all signs
    let totalTime = 0;
    signsToProcess.forEach((sign, index) => {
      const startTime = signStartTime[index];
      const endTime = signEndTime[index];
      if (startTime && endTime) {
        totalTime += (endTime - startTime) / 1000; // Convert to seconds
      } else if (startTime) {
        // If sign started but didn't complete, use 10 seconds (timeout)
        totalTime += 10;
      }
    });
    
    // Calculate results for each sign - ensure all 10 are included
    const results = signsToProcess.map((sign, index) => {
      const isCompleted = completedSigns.has(index); // Green box = completed
      const isFailed = failedSigns.has(index); // Red box = failed
      
      let accuracy = 0;
      
      // If sign was completed, calculate average confidence during 3-second period
      if (isCompleted) {
        const confidenceValues = confidenceValuesForSign[index] || [];
        if (confidenceValues.length > 0) {
          // Calculate average of all confidence values during the 3-second period
          const sum = confidenceValues.reduce((acc, val) => acc + val, 0);
          accuracy = sum / confidenceValues.length;
        } else {
          // Fallback to max confidence if no values tracked
          accuracy = maxConfidenceForSign[index] || 0;
        }
        // Ensure accuracy is at least 50% if completed
        if (accuracy < 50) {
          accuracy = 50;
        }
      } else {
        // If failed, use max confidence achieved
        accuracy = maxConfidenceForSign[index] || 0;
      }
      
      // Round accuracy to nearest integer
      accuracy = Math.round(accuracy);
      
      let result = "Incorrect";
      
      // If sign is completed (green box), show as Correct
      if (isCompleted) {
        result = "Correct";
      } else if (accuracy >= 40 && accuracy < 50) {
        result = "Almost";
      } else {
        result = "Incorrect";
      }
      
      return {
        sign: sign.name,
        accuracy: accuracy,
        result: result,
        point: isCompleted ? 1 : 0 // 1 point if completed (green box)
      };
    });
    
    // Ensure we have exactly 10 results (pad with empty if needed)
    while (results.length < 10) {
      results.push({
        sign: `Sign ${results.length + 1}`,
        accuracy: 0,
        result: "Incorrect",
        point: 0
      });
    }
    
    setSignResults(results);
    setTestCompleted(true);
          setWebcamRunning(false);
    
    // Cancel animation frame
          if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
          }
    
    // Clear interval timer
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Clear 10-second timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, [randomSigns, completedSigns, maxConfidenceForSign]);

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

    // Clear 10-second timer interval
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
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
    setTimerSeconds(10); // Reset 10-second timer
  }, []);


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
  
  // Store markSignCompleted in ref
  useEffect(() => {
    markSignCompletedRef.current = markSignCompleted;
  }, [markSignCompleted]);

  /**
   * Move to next sign image (AUTO-ADVANCE)
   * Immediately moves to next sign after completion
   */
  const moveToNextSign = useCallback(() => {
    console.log('moveToNextSign called - immediately advancing to next sign');
    
    // Cancel any existing auto-advance timeout
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
    
    // Clear 10-second timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    
    // Mark as completed
    markSignCompleted();
    
    // Immediately move to next sign
    // Reset all timers and states
    resetAllTimers();
    
    // CRITICAL: Clear confidence and gesture output BEFORE moving to next sign
    // This ensures the timer doesn't start immediately with old detection data
    setConfidence(0);
    setGestureOutput("");
    gestureOutputRef.current = "";
    confidenceRef.current = 0;
    
    // Reset completion state for next sign
    setIsCompleted(false);
    isCompletedRef.current = false; // Update ref
    
    // Reset manual selection flag so next sign can also auto-advance
    setIsManualSelection(false);

    // Move to next sign in randomSigns array
    setCurrentRandomSignIndex((prevIndex) => {
      // Mark previous sign as completed (successful completion) before moving to next
      setCompletedSigns((prev) => {
        const newSet = new Set(prev);
        newSet.add(prevIndex);
        console.log('Marking sign as completed:', prevIndex, 'completed signs:', Array.from(newSet));
        return newSet;
      });
      
      if (randomSigns.length === 0) return prevIndex;
      const nextIndex = (prevIndex + 1) % randomSigns.length;
      
      // Check if we've completed all 10 signs (moved from index 9 to 0)
      if (nextIndex === 0 && prevIndex === randomSigns.length - 1 && randomSigns.length === 10) {
        // All 10 signs completed - show completion page
        console.log('All 10 signs completed - showing completion page');
        // Calculate results and show completion page
        setTimeout(() => {
          calculateAndShowResults();
        }, 100);
        return 0;
      }
      
      const nextSign = randomSigns[nextIndex];
      console.log('Auto-advancing to next sign:', nextSign?.name, 'at index:', nextIndex);
      // Update ref immediately - MUST be done before timer logic checks
      currentImageNameRef.current = nextSign?.name?.toUpperCase() || null;
      
      // Track the sign transition time and previous sign to prevent immediate timer start
      signTransitionTimeRef.current = Date.now();
      if (randomSigns[prevIndex]) {
        lastCompletedSignRef.current = randomSigns[prevIndex].name.toUpperCase();
      }
      
      return nextIndex;
    });
  }, [resetAllTimers, markSignCompleted, randomSigns, calculateAndShowResults]);
  
  // Store moveToNextSign in ref
  useEffect(() => {
    moveToNextSignRef.current = moveToNextSign;
  }, [moveToNextSign]);

  // Keep refs in sync with state
  useEffect(() => {
    gestureOutputRef.current = gestureOutput;
  }, [gestureOutput]);

  useEffect(() => {
    if (randomSigns.length > 0 && currentRandomSignIndex < randomSigns.length) {
      currentImageNameRef.current = randomSigns[currentRandomSignIndex]?.name?.toUpperCase() || null;
    }
  }, [randomSigns, currentRandomSignIndex]);

  useEffect(() => {
    confidenceRef.current = confidence;
  }, [confidence]);

  useEffect(() => {
    isCompletedRef.current = isCompleted;
  }, [isCompleted]);

  // 10-second timer effect - starts when webcam is running and resets for each new sign
  useEffect(() => {
    // Clear any existing timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Start timer only when webcam is running and sign is not completed
    if (webcamRunning && !isCompleted) {
      setTimerSeconds(10); // Reset to 10 seconds
      
      // Track start time for current sign when timer starts
      setSignStartTime((prev) => {
        const newTimes = { ...prev };
        if (!newTimes[currentRandomSignIndex]) {
          newTimes[currentRandomSignIndex] = Date.now();
        }
        return newTimes;
      });
      
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            // Timer reached 0, move to next sign
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // Reset timer when webcam stops or sign is completed
      setTimerSeconds(10);
    }

    // Cleanup on unmount or when conditions change
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [webcamRunning, currentRandomSignIndex, isCompleted]);

  // Auto-advance when timer reaches 0 (sign failed - mark as red)
  useEffect(() => {
    if (timerSeconds === 0 && webcamRunning && !isCompleted) {
      console.log('10-second timer reached 0 - sign failed, marking as red');
      
      // Play beep sound when sign times out (user failed to complete)
      playBeepSound();
      
      // Mark current sign as failed (red) - but keep the accuracy tracked
      const failedIndex = currentRandomSignIndex;
      const currentConfidence = confidenceRef.current || 0;
      
      // Track start time if not already tracked (when webcam started for this sign)
      setSignStartTime((prev) => {
        const newTimes = { ...prev };
        if (!newTimes[failedIndex]) {
          // If no start time, assume it started 10 seconds ago (when timer started)
          newTimes[failedIndex] = Date.now() - 10000;
        }
        return newTimes;
      });
      
      // Track end time for failed sign (10 seconds after start)
      setSignEndTime((prev) => {
        const newTimes = { ...prev };
        const startTime = signStartTime[failedIndex] || Date.now() - 10000;
        newTimes[failedIndex] = startTime + 10000; // 10 seconds after start
        return newTimes;
      });
      
      setFailedSigns((prev) => {
        const newSet = new Set(prev);
        newSet.add(failedIndex);
        return newSet;
      });
      
      // Ensure we have accuracy recorded for failed sign (use current confidence if available)
      setMaxConfidenceForSign((prev) => {
        const newMax = { ...prev };
        if (!newMax[failedIndex] || newMax[failedIndex] < currentConfidence) {
          newMax[failedIndex] = currentConfidence;
        }
        return newMax;
      });
      
      setIsCompleted(false);
      isCompletedRef.current = false;
      resetAllTimers();
      setIsManualSelection(false);
      
      setCurrentRandomSignIndex((prevIndex) => {
        if (randomSigns.length === 0) return prevIndex;
        const nextIndex = (prevIndex + 1) % randomSigns.length;
        
        // Check if we've completed all 10 signs (moved from index 9 to 0)
        if (nextIndex === 0 && prevIndex === randomSigns.length - 1 && randomSigns.length === 10) {
          // All 10 signs completed - show completion page
          console.log('All 10 signs completed - showing completion page');
          setTimeout(() => {
            calculateAndShowResults();
          }, 100);
          return 0;
        }
        
        const nextSign = randomSigns[nextIndex];
        console.log('Moving to next sign (timeout):', nextSign?.name, 'at index:', nextIndex);
        currentImageNameRef.current = nextSign?.name?.toUpperCase() || null;
        return nextIndex;
      });
    }
  }, [timerSeconds, webcamRunning, isCompleted, randomSigns, calculateAndShowResults, resetAllTimers, currentRandomSignIndex]);

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
    // 6. At least 500ms has passed since moving to this sign (prevents immediate start with stale data)
    // 7. Detected sign is different from the last completed sign (ensures it's a new detection)
    const timeSinceTransition = signTransitionTimeRef.current 
      ? Date.now() - signTransitionTimeRef.current 
      : 1000; // If no transition time, allow (first sign)
    const isNewSignDetection = !lastCompletedSignRef.current || 
                                gestureOutput?.toUpperCase() !== lastCompletedSignRef.current;
    
    if (confidence >= 50 && 
        !timerStartedRef.current && 
        webcamRunning && 
        gestureOutput && 
        signMatches && 
        !isCompleted &&
        timeSinceTransition >= 500 && // Wait at least 500ms after sign transition
        isNewSignDetection) { // Ensure it's detecting a different sign than the last completed one
      console.log('Timer starting - confidence:', confidence, 'sign:', gestureOutput, 'currentImage:', currentImage?.name, 'currentImageNameRef:', currentImageNameRef.current, 'timeSinceTransition:', timeSinceTransition);
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

        // Track confidence value during the 3-second period (every 50ms)
        const currentConf = confidenceRef.current || 0;
        if (currentConf > 0 && elapsedSeconds < 3.0) {
          setConfidenceValuesForSign((prev) => {
            const newValues = { ...prev };
            const signIndex = currentRandomSignIndex;
            if (!newValues[signIndex]) {
              newValues[signIndex] = [];
            }
            // Add confidence value to array (will calculate average later)
            newValues[signIndex].push(currentConf);
            return newValues;
          });
        }

        // At 3 seconds: Complete the sign
        if (elapsedSeconds >= 3.0) {
          console.log('Timer complete at 3 seconds - marking sign as completed');
          
          // Track end time for current sign
          setSignEndTime((prev) => {
            const newTimes = { ...prev };
            newTimes[currentRandomSignIndex] = Date.now();
            return newTimes;
          });
          
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

    // Set video width
    webcamRef.current.video.width = videoWidth;
    webcamRef.current.video.height = videoHeight;

    // Set canvas height and width
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

        // Track max confidence for current sign
        setMaxConfidenceForSign((prev) => {
          const newMax = { ...prev };
          const currentMax = newMax[currentRandomSignIndex] || 0;
          if (confidenceScore > currentMax) {
            newMax[currentRandomSignIndex] = confidenceScore;
          }
          return newMax;
        });

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
      
      // Generate new random signs when stopping
      generateRandomSigns();
    } else {
      // Start camera
    setWebcamRunning(true);
      startTime = new Date();
      
      // Play beep sound when test starts
      playBeepSound();
      
      // Don't regenerate signs on start - keep the same signs
      // If no signs exist, generate them (first time only)
      if (randomSigns.length === 0) {
        generateRandomSigns();
        } else {
        // Reset to first sign if signs already exist
        setCurrentRandomSignIndex(0);
        if (randomSigns.length > 0) {
          currentImageNameRef.current = randomSigns[0]?.name?.toUpperCase() || null;
        }
      }
      
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
      
      // Start animation loop - ensure it starts
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
    generateRandomSigns,
    playBeepSound,
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
        
        const modelPath =
          process.env.REACT_APP_MODEL_PATH ||
          "/sign_language_recognizer_25-04-2023.task";
        
        const recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelPath,
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
    console.log = function () {};
  }

  // Handle Start Practice button click
  const handleStartPractice = () => {
    generateRandomSigns();
    setPracticeStarted(true);
  };

  // Show test completion page
  if (testCompleted && signResults.length > 0) {
    const correctCount = signResults.filter(r => r.point === 1).length;
    const totalSigns = signResults.length;
    
    // Determine score category for color coding
    let scoreCategory = 'low'; // red
    if (correctCount >= 7) {
      scoreCategory = 'high'; // green
    } else if (correctCount >= 5) {
      scoreCategory = 'medium'; // yellow
    }
    
    // Calculate overall accuracy
    const totalAccuracy = signResults.reduce((sum, r) => sum + r.accuracy, 0);
    const overallAccuracy = Math.round(totalAccuracy / totalSigns);
    
    // Calculate time per sign - total time for all signs divided by number of signs
    let totalTime = 0;
    let signCount = 0;
    randomSigns.forEach((sign, index) => {
      const startTime = signStartTime[index];
      const endTime = signEndTime[index];
      if (startTime && endTime) {
        totalTime += (endTime - startTime) / 1000; // Convert to seconds
        signCount++;
      } else if (startTime) {
        // If sign started but didn't complete, use 10 seconds (timeout)
        totalTime += 10;
        signCount++;
      }
    });
    const timePerSign = signCount > 0 ? `${(totalTime / signCount).toFixed(1)}s` : "10s";
    
    // Get strongest signs (highest accuracy, at least 50%)
    const strongestSigns = [...signResults]
      .filter(r => r.accuracy >= 50)
      .sort((a, b) => b.accuracy - a.accuracy)
      .map(r => r.sign);
    
    // Get signs that need practice (lowest accuracy or incorrect)
    const needsPracticeSigns = [...signResults]
      .filter(r => r.accuracy < 50 || r.result === "Incorrect")
      .sort((a, b) => a.accuracy - b.accuracy)
      .map(r => r.sign);

    return (
      <div className="test-container">
        <div className="test-completion-page">
          {/* Title */}
          <h1 className="test-completion-title">Test Completed</h1>

          {/* Result Box */}
          <div className={`test-result-box ${scoreCategory}`}>
            <div className="test-result-score">{correctCount}/{totalSigns}</div>
            <div className="test-result-accuracy">Overall Accuracy: {overallAccuracy}%</div>
          </div>

          {/* Motivational Message */}
          <div className="test-motivational-message">
            Don't worry. Practice more and try again to improve your accuracy.
          </div>

          {/* Performance Summary and Scoreboard Side by Side */}
          <div className="test-results-grid">
            {/* Performance Summary */}
            <div className="test-performance-summary">
              <h3 className="test-performance-summary-title">Performance Summary</h3>
              <div className="test-performance-summary-content">
                <div className="test-performance-item">
                  <span className="test-performance-label">Total Signs Attempted:</span>
                  <span className="test-performance-value">{totalSigns}</span>
                </div>
                <div className="test-performance-item">
                  <span className="test-performance-label">Correct Signs:</span>
                  <span className="test-performance-value">{correctCount}</span>
                </div>
              <div className="test-performance-item">
                <span className="test-performance-label">Time per Sign:</span>
                <span className="test-performance-value">{timePerSign}</span>
              </div>
                {strongestSigns.length > 0 && (
                  <div className="test-performance-item">
                    <span className="test-performance-label">Strongest Signs:</span>
                    <span className="test-performance-value">{strongestSigns.join(', ')}</span>
                  </div>
                )}
                {needsPracticeSigns.length > 0 && (
                  <div className="test-performance-item">
                    <span className="test-performance-label">Needs Practice:</span>
                    <span className="test-performance-value">{needsPracticeSigns.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Scoreboard */}
            <TestScoreboard results={signResults} />
          </div>

          {/* Action Buttons */}
          <TestActions onRetry={() => {
            setTestCompleted(false);
            setSignResults([]);
            generateRandomSigns();
            setWebcamRunning(false);
          }} />
        </div>
      </div>
    );
  }

  // Show start screen if practice hasn't started
  if (!practiceStarted) {
    return (
      <div className="test-container">
        <div className="test-start-screen">
          <h1 className="test-start-title gradient__text">Sign Language Test</h1>
          <div className="test-start-info">
            <h2 className="test-instructions-title gradient__text">Test Instructions</h2>
            <ul className="test-rules-list">
              <li>You will be tested on 10 randomly selected signs</li>
              <li>Perform each sign correctly for 3 seconds to complete it</li>
              <li>You have 10 seconds per sign to complete it</li>
              <li>Get instant feedback with confidence percentage</li>
              <li>View your results and performance summary at the end</li>
              <li>Click "Start Test" to begin the test</li>
            </ul>
            </div>
          <div className="test-start-buttons">
          <button
              className="test-button primary"
              onClick={handleStartPractice}
            >
              Start Test
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
            <div className="test-practice-wrapper">
              {/* SIGNS TO PRACTICE Section */}
              {randomSigns.length > 0 && (
                <div className="test-signs-practice-container">
                  <h2 className="test-signs-practice-title gradient__text">SIGNS TO PRACTICE</h2>
                  <div className="test-signs-practice-boxes">
                    {randomSigns.map((sign, index) => {
                      const isActive = currentRandomSignIndex === index;
                      const isCompleted = completedSigns.has(index);
                      const isFailed = failedSigns.has(index);
                      return (
                        <div
                    key={`${sign.name}-${index}`}
                          className={`test-sign-practice-box ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isFailed ? 'failed' : ''} ${!isCompleted && !isFailed ? 'incomplete' : ''}`}
                        >
                          <div className="test-sign-practice-number">{index + 1}</div>
                          <div className="test-sign-practice-name">{sign.name}</div>
              </div>
                      );
                    })}
            </div>
        </div>
              )}

        <div style={{ position: "relative" }}>
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

              {/* Control Panel - Start/Repeat button, Confidence, and Timer */}
              <div className="test-control-panel">
              <button 
                  className="test-control-button-panel"
                  onClick={enableCam}
                >
                  {webcamRunning ? (
                    <svg 
                      width="24" 
                      height="24" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      className="test-repeat-icon"
                    >
                      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                      <path d="M21 3v5h-5"></path>
                      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                      <path d="M3 21v-5h5"></path>
                    </svg>
                  ) : (
                    "Start"
                  )}
              </button>
                <div className="test-confidence-panel">
                  {confidence > 0 && (
                  <>
                    <ProgressBar progress={confidence} />
                      <p className="test-confidence-text-panel">
                        Confidence: {confidence}%
                    </p>
                  </>
                  )}
                  {confidence === 0 && (
                    <div className="test-confidence-label-panel">CONFIDENCE</div>
                )}
              </div>
                <div className="test-timer-panel">
                  <div className="test-timer-label-panel">TIME</div>
                  <div className="test-timer-value-panel">{timerSeconds}s</div>
          </div>
        </div>

              <div className="signlang_data-container">
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

export default Test;
