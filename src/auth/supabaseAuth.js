import { supabase } from '../config';

/**
 * Sign up a new user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} username - Optional username
 * @returns {Promise<{user: object, error: object}>}
 */
export const signUp = async (email, password, username = null) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          username: username || email.split('@')[0],
        },
      },
    });

    if (error) throw error;

    // If we have a session, user is immediately signed in (email confirmation disabled)
    // If no session but user exists, email confirmation is required
    return { user: data.user, session: data.session, error: null };
  } catch (error) {
    console.error('Sign up error:', error);
    // Filter out rate limiting errors and show a more user-friendly message
    if (error.message && error.message.includes('seconds')) {
      return { 
        user: null, 
        session: null, 
        error: { 
          message: 'Please wait a moment before trying again.' 
        } 
      };
    }
    return { user: null, session: null, error };
  }
};

/**
 * Sign in a user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{user: object, session: object, error: object}>}
 */
export const signIn = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    return { user: data.user, session: data.session, error: null };
  } catch (error) {
    console.error('Sign in error:', error);
    return { user: null, session: null, error };
  }
};

/**
 * Sign out the current user
 * @returns {Promise<{error: object}>}
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Sign out error:', error);
    return { error };
  }
};

/**
 * Get the current authenticated user
 * @returns {Promise<{user: object, error: object}>}
 */
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return { user, error: null };
  } catch (error) {
    console.error('Get user error:', error);
    return { user: null, error };
  }
};

/**
 * Get the current session
 * @returns {Promise<{session: object, error: object}>}
 */
export const getSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return { session, error: null };
  } catch (error) {
    console.error('Get session error:', error);
    return { session: null, error };
  }
};

/**
 * Sign in with Google OAuth
 * @returns {Promise<{error: object}>}
 */
export const signInWithGoogle = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      // Handle specific error cases
      if (error.message && error.message.includes('not enabled')) {
        return { 
          data: null, 
          error: { 
            message: 'Google sign-in is not enabled. Please contact support or use email/password to sign in.' 
          } 
        };
      }
      throw error;
    }
    return { data, error: null };
  } catch (error) {
    console.error('Google sign in error:', error);
    // Handle error object structure from Supabase
    let errorMessage = error.message || error.msg || 'Google sign in failed. Please try again.';
    if (errorMessage.includes('not enabled') || errorMessage.includes('provider is not enabled')) {
      errorMessage = 'Google sign-in is not enabled. Please contact support or use email/password to sign in.';
    }
    return { data: null, error: { message: errorMessage } };
  }
};

/**
 * Reset password for a user
 * @param {string} email - User email
 * @returns {Promise<{error: object}>}
 */
export const resetPassword = async (email) => {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Reset password error:', error);
    return { data: null, error };
  }
};

