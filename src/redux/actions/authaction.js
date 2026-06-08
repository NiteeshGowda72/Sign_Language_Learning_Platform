import Cookies from 'js-cookie';
import { signOut as supabaseSignOut } from '../../auth/supabaseAuth';

import {
  LOAD_PROF,
  LOGIN_FAIL,
  LOGIN_REQ,
  LOGIN_SUCCESS,
  LOGOUT,
} from "../action-types";

// Action creator for successful login (supports both Google OAuth and Supabase)
export const loginSuccess = (tokenResponse) => async (dispatch) => {
  try {
    dispatch({
      type: LOGIN_REQ,
    });

    let accessToken;
    let profile;

    // Check if this is a Google OAuth token response or a Supabase access token string
    if (typeof tokenResponse === 'string') {
      // Supabase access token (string)
      accessToken = tokenResponse;
      // Profile should be loaded separately via loadProfile action
    } else if (tokenResponse?.access_token) {
      // Google OAuth token response
      // Fetch user info from Google using the access token
      const response = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
            Accept: 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }

      const userInfo = await response.json();
      accessToken = tokenResponse.access_token;

      profile = {
        name: userInfo.name,
        photoURL: userInfo.picture,
        userId: userInfo.id,
      };
    } else {
      throw new Error('Invalid token response');
    }

    Cookies.set('sign-language-ai-access-token', accessToken, { expires: 2 });
    if (profile) {
      Cookies.set('sign-language-ai-user', JSON.stringify(profile), { expires: 2 });
    }

    dispatch({
      type: LOGIN_SUCCESS,
      payload: accessToken,
    });

    if (profile) {
      dispatch({
        type: LOAD_PROF,
        payload: profile,
      });
    }
  } catch (error) {
    dispatch({
      type: LOGIN_FAIL,
      payload: error.message,
    });
  }
};

// Action creator to load user profile (for Supabase users)
export const loadProfile = (profile) => (dispatch) => {
  Cookies.set('sign-language-ai-user', JSON.stringify(profile), { expires: 2 });
  dispatch({
    type: LOAD_PROF,
    payload: profile,
  });
};

// Action creator for login failure
export const loginFail = (error) => (dispatch) => {
  dispatch({
    type: LOGIN_FAIL,
    payload: error.message || 'Login failed',
  });
};

// Legacy login function for backward compatibility (not used anymore, but kept for reference)
export const login = () => {
  // This is now handled by the component using useGoogleLogin hook
  // Components should use loginSuccess action directly
};

export const logout = () => async (dispatch) => {
  // Sign out from Supabase if user is authenticated
  try {
    await supabaseSignOut();
  } catch (error) {
    console.error('Supabase sign out error:', error);
  }

  dispatch({
    type: LOGOUT,
  });

  Cookies.remove('sign-language-ai-access-token');
  Cookies.remove('sign-language-ai-user');
};
