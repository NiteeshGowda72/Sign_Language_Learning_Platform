import React, { useState, useEffect, useRef } from 'react';
import { FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';
import './SpeechControls.css';

/**
 * SpeechToTextButton Component
 * 
 * A compact, embeddable microphone button for speech-to-text functionality.
 * Uses Web Speech API to convert spoken English to text.
 * 
 * @param {Function} onTranscriptChange - Callback function called when transcript changes
 * @param {string} className - Additional CSS classes
 */
const SpeechToTextButton = ({ onTranscriptChange, className = '' }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);
  const tooltipRef = useRef(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = 
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech Recognition not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      const newTranscript = finalTranscript + interimTranscript;
      setTranscript(newTranscript);
      
      // Call callback if provided
      if (onTranscriptChange) {
        onTranscriptChange(newTranscript.trim());
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech' || event.error === 'aborted') {
        // These are common and can be ignored
        return;
      }
      setError(`Error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onTranscriptChange]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setError('');
      setTranscript('');
      setIsListening(true);
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Error starting recognition:', err);
        setError('Failed to start');
        setIsListening(false);
      }
    }
  };

  return (
    <div className={`speech-control-wrapper ${className}`}>
      <button
        className={`speech-btn microphone-btn ${isListening ? 'active' : ''}`}
        onClick={toggleListening}
        aria-label={isListening ? 'Stop listening' : 'Start listening'}
        aria-pressed={isListening}
        disabled={!!error && !recognitionRef.current}
        onMouseEnter={() => {
          if (tooltipRef.current) {
            tooltipRef.current.style.opacity = '1';
            tooltipRef.current.style.visibility = 'visible';
          }
        }}
        onMouseLeave={() => {
          if (tooltipRef.current) {
            tooltipRef.current.style.opacity = '0';
            tooltipRef.current.style.visibility = 'hidden';
          }
        }}
      >
        {isListening ? (
          <FaMicrophone className="speech-icon listening" />
        ) : (
          <FaMicrophoneSlash className="speech-icon" />
        )}
        <span className="speech-btn-tooltip" ref={tooltipRef}>
          {isListening ? 'Stop listening' : 'Click to speak'}
        </span>
      </button>
      
      {/* Small transcript display */}
      {transcript && (
        <div className="speech-transcript-box" role="status" aria-live="polite">
          {transcript}
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="speech-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};

export default SpeechToTextButton;






