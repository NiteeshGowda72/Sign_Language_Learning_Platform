import React, { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useGoogleLogin } from '@react-oauth/google';
import { loginSuccess, loginFail } from '../../redux/actions/authaction';
import SpeechToText from '../SpeechToText/SpeechToText';
import TextToSpeech from '../TextToSpeech/TextToSpeech';
import './Speech.css';

/**
 * Speech Component
 * 
 * Wrapper component that requires login to access Speech-to-Text and Text-to-Speech features.
 * Automatically triggers Google login if user is not authenticated.
 */
const Speech = () => {
  const { accessToken } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  // Google Login setup for auto-login when not authenticated
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

  return (
    <div className="speech-container">
      {accessToken ? (
        <div className="speech-content">
          <SpeechToText />
          <TextToSpeech />
        </div>
      ) : (
        <div className="speech_notLoggedIn">
          <h1 className="gradient__text">Please Login !</h1>
        </div>
      )}
    </div>
  );
};

export default Speech;

