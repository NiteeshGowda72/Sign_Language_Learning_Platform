import React, { useState, useEffect, useRef } from 'react';
import { FaVolumeUp, FaVolumeMute } from 'react-icons/fa';
import './SpeechControls.css';

/**
 * TextToSpeechButton Component
 * 
 * A compact, embeddable speaker button for text-to-speech functionality.
 * Uses Web Speech API to speak the provided text.
 * 
 * @param {string} text - The text to be spoken
 * @param {string} className - Additional CSS classes
 */
const TextToSpeechButton = ({ text, className = '' }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState('');
  const utteranceRef = useRef(null);
  const tooltipRef = useRef(null);

  // Check browser support
  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setError('Text-to-Speech not supported');
    }
  }, []);

  // Auto-speak when text prop changes
  useEffect(() => {
    if (text && text.trim() && 'speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text.trim());
      utterance.lang = 'en-US';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsPaused(false);
        setError('');
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        utteranceRef.current = null;
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error);
        setIsSpeaking(false);
        setIsPaused(false);
        setError('Speech error');
        utteranceRef.current = null;
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  }, [text]); // Re-run whenever text prop changes

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakText = () => {
    if (!text || !text.trim()) {
      setError('No text to speak');
      return;
    }

    if (!('speechSynthesis' in window)) {
      setError('Speech synthesis not supported');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
      setError('');
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      utteranceRef.current = null;
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      setIsSpeaking(false);
      setIsPaused(false);
      setError('Speech error');
      utteranceRef.current = null;
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const pauseSpeech = () => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const resumeSpeech = () => {
    if (window.speechSynthesis.speaking && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  };

  const stopSpeech = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    utteranceRef.current = null;
  };

  const handleClick = () => {
    if (isSpeaking) {
      if (isPaused) {
        resumeSpeech();
      } else {
        pauseSpeech();
      }
    } else {
      speakText();
    }
  };

  const isDisabled = !text || !text.trim() || !!error;

  return (
    <div className={`speech-control-wrapper ${className}`}>
      <button
        className={`speech-btn speaker-btn ${isSpeaking ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
        onClick={handleClick}
        onDoubleClick={stopSpeech}
        aria-label={isSpeaking ? (isPaused ? 'Resume speech' : 'Pause speech') : 'Speak text'}
        aria-pressed={isSpeaking}
        disabled={isDisabled}
        onMouseEnter={() => {
          if (tooltipRef.current && !isDisabled) {
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
        {isSpeaking && !isPaused ? (
          <FaVolumeUp className="speech-icon speaking" />
        ) : (
          <FaVolumeMute className="speech-icon" />
        )}
        <span className="speech-btn-tooltip" ref={tooltipRef}>
          {isDisabled 
            ? 'No text available' 
            : isSpeaking 
              ? (isPaused ? 'Resume (double-click to stop)' : 'Pause (double-click to stop)')
              : 'Click to speak text'}
        </span>
      </button>
      
      {error && (
        <div className="speech-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};

export default TextToSpeechButton;






