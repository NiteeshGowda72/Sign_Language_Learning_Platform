import React, { useState, useEffect, useRef } from 'react';
import './SpeechToText.css';

/**
 * SpeechToText Component
 * 
 * This component uses the Web Speech API (SpeechRecognition) to convert
 * spoken English words into text. It works best in Chrome and Edge browsers.
 * 
 * Features:
 * - Start/Stop listening with button click
 * - Real-time text display
 * - Error handling for unsupported browsers
 * - Visual feedback for listening state
 */
const SpeechToText = () => {
  // State to store the recognized text
  const [transcript, setTranscript] = useState('');
  
  // State to track if recognition is currently active
  const [isListening, setIsListening] = useState(false);
  
  // State to store any error messages
  const [error, setError] = useState('');
  
  // Reference to the SpeechRecognition instance
  const recognitionRef = useRef(null);

  // Initialize Speech Recognition on component mount
  useEffect(() => {
    // Check if the browser supports Speech Recognition
    const SpeechRecognition = 
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(
        'Speech Recognition is not supported in this browser. ' +
        'Please use Chrome or Edge for best results.'
      );
      return;
    }

    // Create a new SpeechRecognition instance
    const recognition = new SpeechRecognition();
    
    // Configure recognition settings
    recognition.continuous = true; // Keep listening until stopped
    recognition.interimResults = true; // Show interim results as user speaks
    recognition.lang = 'en-US'; // Set language to English (US)

    // Event handler: When speech is recognized
    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      // Process all results from the recognition event
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        // Check if this is a final or interim result
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      // Update the displayed text
      setTranscript(finalTranscript + interimTranscript);
    };

    // Event handler: Handle errors
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      
      // Handle different error types
      switch (event.error) {
        case 'no-speech':
          setError('No speech detected. Please try again.');
          break;
        case 'audio-capture':
          setError('No microphone found. Please check your microphone.');
          break;
        case 'not-allowed':
          setError('Microphone permission denied. Please allow microphone access.');
          break;
        case 'network':
          setError('Network error. Please check your connection.');
          break;
        default:
          setError(`Recognition error: ${event.error}`);
      }
      
      // Stop listening on error
      setIsListening(false);
    };

    // Event handler: When recognition ends
    recognition.onend = () => {
      setIsListening(false);
    };

    // Store recognition instance in ref
    recognitionRef.current = recognition;

    // Cleanup: Stop recognition when component unmounts
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Function to start listening
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setError(''); // Clear any previous errors
      setTranscript(''); // Clear previous transcript
      setIsListening(true);
      
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Error starting recognition:', err);
        setError('Failed to start listening. Please try again.');
        setIsListening(false);
      }
    }
  };

  // Function to stop listening
  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // Function to clear the transcript
  const clearTranscript = () => {
    setTranscript('');
    setError('');
  };

  return (
    <div className="speech-to-text-container">
      <h2 className="speech-to-text-title">Speech to Text</h2>
      <p className="speech-to-text-subtitle">
        Click the button below and start speaking in English
      </p>

      {/* Display error message if any */}
      {error && (
        <div className="speech-to-text-error">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {/* Display transcript */}
      <div className="speech-to-text-display">
        {transcript || (
          <span className="placeholder-text">
            Your spoken text will appear here...
          </span>
        )}
      </div>

      {/* Control buttons */}
      <div className="speech-to-text-controls">
        {!isListening ? (
          <button
            className="speech-to-text-button start-button"
            onClick={startListening}
            disabled={!!error && !recognitionRef.current}
          >
            <span className="button-icon">🎤</span>
            Start Listening
          </button>
        ) : (
          <button
            className="speech-to-text-button stop-button"
            onClick={stopListening}
          >
            <span className="button-icon">⏹️</span>
            Stop Listening
          </button>
        )}

        {/* Clear button - only show when there's text */}
        {transcript && (
          <button
            className="speech-to-text-button clear-button"
            onClick={clearTranscript}
            disabled={isListening}
          >
            <span className="button-icon">🗑️</span>
            Clear
          </button>
        )}
      </div>

      {/* Visual indicator when listening */}
      {isListening && (
        <div className="listening-indicator">
          <div className="pulse-dot"></div>
          <span>Listening...</span>
        </div>
      )}
    </div>
  );
};

export default SpeechToText;






