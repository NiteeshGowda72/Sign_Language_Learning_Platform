import React, { useState, useEffect } from 'react';
import { SignImageData } from '../../data/SignImageData';
import './TextToSign.css';

/**
 * Helper function to convert SignImageData array to a mapping object
 * Maps letter/word names to their image URLs for easy lookup
 */
const createSignImageMap = () => {
  const imageMap = {};
  SignImageData.forEach((item) => {
    // Map both uppercase and lowercase versions
    imageMap[item.name.toUpperCase()] = item.url;
    imageMap[item.name.toLowerCase()] = item.url;
  });
  return imageMap;
};

/**
 * TextToSign Component
 * 
 * Converts text input into sign language images.
 * User types text, and the component displays corresponding sign images
 * for each character in the input.
 */
const TextToSign = () => {
  const [inputText, setInputText] = useState('');
  const [signImages, setSignImages] = useState([]);
  const [signImageMap, setSignImageMap] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Initialize the sign image mapping
  useEffect(() => {
    const map = createSignImageMap();
    setSignImageMap(map);
  }, []);

  // Update sign images when input text changes
  useEffect(() => {
    if (!inputText.trim()) {
      setSignImages([]);
      setCurrentIndex(0);
      return;
    }

    const text = inputText.trim();
    const images = [];
    
    // Split text into characters and look up images
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      // Handle spaces
      if (char === ' ') {
        images.push({ type: 'space', char: ' ' });
        continue;
      }
      
      // Try to find image for the character
      const imageUrl = signImageMap[char.toUpperCase()] || signImageMap[char.toLowerCase()];
      
      if (imageUrl) {
        images.push({ type: 'image', char: char.toUpperCase(), url: imageUrl });
      } else {
        // Fallback: show a colored box for unsupported characters
        images.push({ type: 'fallback', char: char });
      }
    }
    
    setSignImages(images);
    setCurrentIndex(0);
  }, [inputText, signImageMap]);

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      // Trigger animation if desired
      if (signImages.length > 0) {
        animateSigns();
      }
    }
  };

  // Animate signs one by one (optional feature)
  const animateSigns = () => {
    if (signImages.length === 0) return;
    
    setIsAnimating(true);
    setCurrentIndex(0);
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= signImages.length - 1) {
          clearInterval(interval);
          setIsAnimating(false);
          return prev;
        }
        return prev + 1;
      });
    }, 500); // Change image every 500ms
  };

  // Handle input change
  const handleInputChange = (e) => {
    setInputText(e.target.value);
    setIsAnimating(false);
    setCurrentIndex(0);
  };

  // Clear input
  const handleClear = () => {
    setInputText('');
    setSignImages([]);
    setCurrentIndex(0);
    setIsAnimating(false);
  };

  return (
    <div className="text-to-sign-container">
      <div className="text-to-sign-header">
        <h2 className="gradient__text">Text to Sign Language</h2>
        <p>Type text below to see the corresponding sign language images</p>
      </div>

      <form onSubmit={handleSubmit} className="text-to-sign-form">
        <div className="input-wrapper">
          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder="Type text here (e.g., HELLO, ABC, etc.)"
            className="text-to-sign-input"
            maxLength={100}
          />
          {inputText && (
            <button
              type="button"
              onClick={handleClear}
              className="clear-button"
              aria-label="Clear input"
            >
              ×
            </button>
          )}
        </div>
        
        <div className="button-group">
          <button type="submit" className="submit-button" disabled={!inputText.trim()}>
            Convert to Signs
          </button>
          {signImages.length > 0 && (
            <button
              type="button"
              onClick={animateSigns}
              className="animate-button"
              disabled={isAnimating}
            >
              {isAnimating ? 'Animating...' : 'Animate Signs'}
            </button>
          )}
        </div>
      </form>

      <div className="sign-images-container">
        {signImages.length === 0 ? (
          <div className="empty-state">
            <p>Enter text above to see sign language images</p>
            <p className="hint">Supported: A-Z letters and words like HELLO, BYE, YES, NO, etc.</p>
          </div>
        ) : (
          <div className="sign-images-grid">
            {isAnimating ? (
              // Show only the current sign during animation
              signImages[currentIndex] && (
                <div key={currentIndex} className="sign-image-wrapper animated">
                  {signImages[currentIndex].type === 'image' ? (
                    <img
                      src={signImages[currentIndex].url}
                      alt={signImages[currentIndex].char}
                      className="sign-image"
                    />
                  ) : signImages[currentIndex].type === 'space' ? (
                    <div className="sign-space">Space</div>
                  ) : (
                    <div className="sign-fallback">
                      {signImages[currentIndex].char}
                    </div>
                  )}
                  <div className="sign-label">{signImages[currentIndex].char}</div>
                </div>
              )
            ) : (
              // Show all signs at once
              signImages.map((item, index) => (
                <div key={index} className="sign-image-wrapper">
                  {item.type === 'image' ? (
                    <img
                      src={item.url}
                      alt={item.char}
                      className="sign-image"
                    />
                  ) : item.type === 'space' ? (
                    <div className="sign-space">Space</div>
                  ) : (
                    <div className="sign-fallback">
                      {item.char}
                    </div>
                  )}
                  <div className="sign-label">{item.char}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TextToSign;

