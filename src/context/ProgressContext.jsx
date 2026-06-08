import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * ProgressContext - Manages user progress tracking
 * Stores progress data in localStorage for persistence
 */
const ProgressContext = createContext();

/**
 * ProgressProvider - Provides progress tracking functionality
 */
export const ProgressProvider = ({ children }) => {
  const [progress, setProgress] = useState({
    totalSignsPracticed: 0,
    totalTestsTaken: 0,
    bestTestScore: 0,
    lastTestAccuracy: 0,
  });

  // Load progress from localStorage on mount
  useEffect(() => {
    const savedProgress = localStorage.getItem('userProgress');
    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress);
        setProgress(parsed);
      } catch (error) {
        console.error('Error loading progress from localStorage:', error);
      }
    }
  }, []);

  // Save progress to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('userProgress', JSON.stringify(progress));
  }, [progress]);

  /**
   * Update progress after practice session
   * @param {number} signsCount - Number of signs practiced in this session
   */
  const updatePracticeProgress = (signsCount) => {
    setProgress((prev) => ({
      ...prev,
      totalSignsPracticed: prev.totalSignsPracticed + signsCount,
    }));
  };

  /**
   * Update progress after test completion
   * @param {number} score - Test score (number of correct answers)
   * @param {number} accuracy - Test accuracy percentage
   */
  const updateTestProgress = (score, accuracy) => {
    setProgress((prev) => ({
      ...prev,
      totalTestsTaken: prev.totalTestsTaken + 1,
      bestTestScore: Math.max(prev.bestTestScore, score),
      lastTestAccuracy: accuracy,
    }));
  };

  /**
   * Reset progress (useful for testing or logout)
   */
  const resetProgress = () => {
    const defaultProgress = {
      totalSignsPracticed: 0,
      totalTestsTaken: 0,
      bestTestScore: 0,
      lastTestAccuracy: 0,
    };
    setProgress(defaultProgress);
    localStorage.setItem('userProgress', JSON.stringify(defaultProgress));
  };

  const value = {
    progress,
    updatePracticeProgress,
    updateTestProgress,
    resetProgress,
  };

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
};

/**
 * useProgress - Hook to access progress context
 */
export const useProgress = () => {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return context;
};






