import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { signIn, signInWithGoogle, resetPassword, getSession } from '../auth/supabaseAuth';
import { loginSuccess, loadProfile } from '../redux/actions/authaction';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const accessToken = useSelector((state) => state.auth?.accessToken);
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';
  const registeredEmail = searchParams.get('email');
  const isRegistered = searchParams.get('registered') === 'true';

  // Pre-fill email if coming from registration
  useEffect(() => {
    if (registeredEmail) {
      setFormData(prev => ({
        ...prev,
        email: registeredEmail,
      }));
    }
  }, [registeredEmail]);

  // Check if user is already authenticated and redirect to home
  useEffect(() => {
    const checkAuth = async () => {
      // Check Redux store first
      if (accessToken) {
        // If user is authenticated, redirect to home (not the protected route they tried to access)
        navigate('/', { replace: true });
        return;
      }

      // Check Supabase session
      try {
        const { session } = await getSession();
        if (session) {
          // If user is authenticated, redirect to home
          navigate('/', { replace: true });
        }
      } catch (error) {
        // User is not authenticated, stay on login page
      }
    };

    checkAuth();
  }, [accessToken, navigate]);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const { user, session, error } = await signIn(formData.email, formData.password);

      if (error) {
        // Handle specific error messages
        let errorMessage = error.message || 'Invalid email or password';
        
        if (errorMessage.includes('Email not confirmed') || errorMessage.includes('email_not_confirmed')) {
          errorMessage = 'Please check your email and confirm your account before signing in. If you didn\'t receive the email, please contact support.';
        } else if (errorMessage.includes('Invalid login credentials') || errorMessage.includes('invalid_credentials')) {
          errorMessage = 'Invalid email or password. Please try again.';
        }
        
        setErrors({ submit: errorMessage });
        setLoading(false);
        return;
      }

      if (user && session) {
        // Dispatch login success
        dispatch(loginSuccess(session.access_token));
        dispatch(
          loadProfile({
            name: user.user_metadata?.username || user.email?.split('@')[0] || 'User',
            photoURL: user.user_metadata?.avatar_url || null,
            userId: user.id,
            email: user.email,
          })
        );
        // Always redirect to home page after login
        navigate('/', { replace: true });
      }
    } catch (error) {
      setErrors({ submit: error.message || 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        // Handle error message - check both error.message and error.msg
        const errorMessage = error.message || error.msg || 'Google sign in failed. Please try again.';
        setErrors({ submit: errorMessage });
      }
    } catch (error) {
      // Handle error object structure
      const errorMessage = error.message || error.msg || error.error?.message || 'Google sign in failed. Please try again.';
      if (errorMessage.includes('not enabled') || errorMessage.includes('provider is not enabled')) {
        setErrors({ submit: 'Google sign-in is not enabled. Please use email/password to sign in.' });
      } else {
        setErrors({ submit: errorMessage });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail || !validateEmail(resetEmail)) {
      setResetMessage('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const { error } = await resetPassword(resetEmail);
      if (error) {
        setResetMessage(error.message);
      } else {
        setResetMessage('Password reset email sent! Please check your inbox.');
        setResetEmail('');
        setTimeout(() => {
          setShowForgotPassword(false);
          setResetMessage('');
        }, 3000);
      }
    } catch (error) {
      setResetMessage(error.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">Sign in to your account</h1>
          <p className="login-subtitle">Welcome back! Please enter your details.</p>
        </div>

        {!showForgotPassword ? (
          <>
            {isRegistered && (
              <div className="success-message">
                Account created successfully! Please sign in with your credentials.
              </div>
            )}
            <form className="login-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email">Email address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={errors.email ? 'input-error' : ''}
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                />
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>

              <div className="form-group">
                <div className="password-label-row">
                  <label htmlFor="password">Password</label>
                  <button
                    type="button"
                    className="forgot-password-link"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={errors.password ? 'input-error' : ''}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                {errors.password && <span className="error-message">{errors.password}</span>}
              </div>

              {errors.submit && (
                <div className="error-message submit-error">{errors.submit}</div>
              )}

              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <div className="login-divider">
              <span>or</span>
            </div>

            <button
              type="button"
              className="google-button"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg
                className="google-icon"
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
              >
                <path
                  d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
                  fill="#4285F4"
                />
                <path
                  d="M9 18c2.43 0 4.467-.806 5.96-2.184l-2.908-2.258c-.806.54-1.837.86-3.052.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
                  fill="#34A853"
                />
                <path
                  d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.348 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"
                  fill="#FBBC05"
                />
                <path
                  d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>

            <p className="login-footer">
              New user?{' '}
              <Link to="/register" className="login-link">
                Create an account
              </Link>
            </p>
          </>
        ) : (
          <div className="forgot-password-form">
            <h2 className="forgot-password-title">Reset your password</h2>
            <p className="forgot-password-description">
              Enter your email address and we'll send you a link to reset your password.
            </p>
            <form onSubmit={handleForgotPassword}>
              <div className="form-group">
                <label htmlFor="resetEmail">Email address</label>
                <input
                  type="email"
                  id="resetEmail"
                  name="resetEmail"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                />
              </div>
              {resetMessage && (
                <div
                  className={`reset-message ${
                    resetMessage.includes('sent') ? 'success' : 'error'
                  }`}
                >
                  {resetMessage}
                </div>
              )}
              <div className="forgot-password-actions">
                <button
                  type="submit"
                  className="login-button"
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
                <button
                  type="button"
                  className="back-button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmail('');
                    setResetMessage('');
                  }}
                  disabled={loading}
                >
                  Back to sign in
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;

