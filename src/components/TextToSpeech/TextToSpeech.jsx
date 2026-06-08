import React, { useState, useEffect, useRef } from 'react';
import './TextToSpeech.css';

/**
 * TextToSpeech Component
 * 
 * This component uses the Web Speech API (SpeechSynthesis) to convert
 * text into spoken words. It works in Chrome, Edge, and other modern browsers.
 * 
 * Features:
 * - Accepts text as a prop or through input field
 * - Speaks text when button is clicked
 * - Supports English language
 * - Can pause, resume, and stop speech
 * - Visual feedback for speaking state
 * 
 * @param {string} text - Optional text prop to be spoken
 */
const TextToSpeech = ({ text: propText = '' }) => {
  // State to store the text to be spoken
  const [text, setText] = useState(propText);
  
  // State to track if speech is currently playing
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // State to track if speech is paused
  const [isPaused, setIsPaused] = useState(false);
  
  // State to store any error messages
  const [error, setError] = useState('');
  
  // Reference to the SpeechSynthesisUtterance instance
  const utteranceRef = useRef(null);

  // Update text when prop changes
  useEffect(() => {
    if (propText) {
      setText(propText);
    }
  }, [propText]);

  // Check browser support on mount
  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setError(
        'Text-to-Speech is not supported in this browser. ' +
        'Please use Chrome, Edge, or another modern browser.'
      );
    }
  }, []);

  // Function to speak the text
  const speakText = () => {
    // Clear any previous errors
    setError('');

    // Validate that there's text to speak
    if (!text.trim()) {
      setError('Please enter some text to speak.');
      return;
    }

    // Check if speech synthesis is available
    if (!('speechSynthesis' in window)) {
      setError('Speech synthesis is not supported in this browser.');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Create a new SpeechSynthesisUtterance instance
    const utterance = new SpeechSynthesisUtterance(text.trim());

    // Configure speech settings
    utterance.lang = 'en-US'; // Set language to English (US)
    utterance.rate = 1.0; // Speech rate (0.1 to 10, default is 1)
    utterance.pitch = 1.0; // Speech pitch (0 to 2, default is 1)
    utterance.volume = 1.0; // Speech volume (0 to 1, default is 1)

    // Event handler: When speech starts
    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };

    // Event handler: When speech ends
    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      utteranceRef.current = null;
    };

    // Event handler: Handle errors
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      setIsSpeaking(false);
      setIsPaused(false);
      
      switch (event.error) {
        case 'network':
          setError('Network error. Please check your connection.');
          break;
        case 'synthesis-failed':
          setError('Speech synthesis failed. Please try again.');
          break;
        case 'synthesis-unavailable':
          setError('Speech synthesis is unavailable.');
          break;
        default:
          setError(`Speech error: ${event.error}`);
      }
      
      utteranceRef.current = null;
    };

    // Store utterance in ref
    utteranceRef.current = utterance;

    // Start speaking
    window.speechSynthesis.speak(utterance);
  };

  // Function to pause speech
  const pauseSpeech = () => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  // Function to resume speech
  const resumeSpeech = () => {
    if (window.speechSynthesis.speaking && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  };

  // Function to stop speech
  const stopSpeech = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    utteranceRef.current = null;
  };

  // Cleanup: Stop speech when component unmounts
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <div className="text-to-speech-container">
      <h2 className="text-to-speech-title">Text to Speech</h2>
      <p className="text-to-speech-subtitle">
        Enter text below and click the button to hear it spoken
      </p>

      {/* Display error message if any */}
      {error && (
        <div className="text-to-speech-error">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {/* Text input area */}
      <div className="text-to-speech-input-container">
        <textarea
          className="text-to-speech-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter the text you want to hear spoken..."
          rows={6}
          disabled={isSpeaking && !isPaused}
        />
        <div className="character-count">
          {text.length} characters
        </div>
      </div>

      {/* Control buttons */}
      <div className="text-to-speech-controls">
        {!isSpeaking ? (
          <button
            className="text-to-speech-button speak-button"
            onClick={speakText}
            disabled={!text.trim() || !!error}
          >
            <span className="button-icon">🔊</span>
            Speak
          </button>
        ) : (
          <>
            {!isPaused ? (
              <button
                className="text-to-speech-button pause-button"
                onClick={pauseSpeech}
              >
                <span className="button-icon">⏸️</span>
                Pause
              </button>
            ) : (
              <button
                className="text-to-speech-button resume-button"
                onClick={resumeSpeech}
              >
                <span className="button-icon">▶️</span>
                Resume
              </button>
            )}
            <button
              className="text-to-speech-button stop-button"
              onClick={stopSpeech}
            >
              <span className="button-icon">⏹️</span>
              Stop
            </button>
          </>
        )}

        {/* Clear button */}
        {text && (
          <button
            className="text-to-speech-button clear-button"
            onClick={() => {
              setText('');
              setError('');
              stopSpeech();
            }}
            disabled={isSpeaking && !isPaused}
          >
            <span className="button-icon">🗑️</span>
            Clear
          </button>
        )}
      </div>

      {/* Visual indicator when speaking */}
      {isSpeaking && (
        <div className="speaking-indicator">
          <div className="sound-wave">
            <div className="wave-bar"></div>
            <div className="wave-bar"></div>
            <div className="wave-bar"></div>
            <div className="wave-bar"></div>
            <div className="wave-bar"></div>
          </div>
          <span>{isPaused ? 'Paused' : 'Speaking...'}</span>
        </div>
      )}
    </div>
  );
};

export default TextToSpeech;






