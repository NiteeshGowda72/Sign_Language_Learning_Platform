import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { signUp, signInWithGoogle } from '../auth/supabaseAuth';
import { loginSuccess, loadProfile } from '../redux/actions/authaction';
import './Register.css';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

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
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
      const { user, session, error } = await signUp(
        formData.email,
        formData.password,
        formData.username || null
      );

      if (error) {
        // Filter out rate limiting messages and show user-friendly error
        let errorMessage = error.message;
        if (errorMessage && errorMessage.includes('seconds')) {
          errorMessage = 'Please wait a moment before trying again.';
        }
        setErrors({ submit: errorMessage });
        setLoading(false);
        return;
      }

      if (user) {
        // Account created successfully - redirect to login page with email pre-filled
        navigate(`/login?email=${encodeURIComponent(formData.email)}&registered=true`);
      } else {
        // Unexpected case
        setErrors({
          submit: 'Account creation failed. Please try again.',
        });
      }
    } catch (error) {
      setErrors({ submit: error.message || 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        // Handle error message - check both error.message and error.msg
        const errorMessage = error.message || error.msg || 'Google sign up failed. Please try again.';
        setErrors({ submit: errorMessage });
      }
    } catch (error) {
      // Handle error object structure
      const errorMessage = error.message || error.msg || error.error?.message || 'Google sign up failed. Please try again.';
      if (errorMessage.includes('not enabled') || errorMessage.includes('provider is not enabled')) {
        setErrors({ submit: 'Google sign-in is not enabled. Please use email/password to create an account.' });
      } else {
        setErrors({ submit: errorMessage });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-wrapper">
        <div className="register-left">
          <h1 className="register-title">Create your account</h1>
          <p className="register-description">
            Join thousands of users learning sign language recognition and communication.
          </p>
        </div>

        <div className="register-right">
          <form className="register-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? 'input-error' : ''}
                placeholder="you@gmail.com"
                autoComplete="email"
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">
                Password
                <span className="password-hint"> (min 8 characters)</span>
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? 'input-error' : ''}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={errors.confirmPassword ? 'input-error' : ''}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <span className="error-message">{errors.confirmPassword}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="username">
                Username <span className="optional">(optional)</span>
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="username"
                autoComplete="username"
              />
            </div>

            {errors.submit && (
              <div className="error-message submit-error">{errors.submit}</div>
            )}

            <button
              type="submit"
              className="register-button"
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div className="register-divider">
            <span>or</span>
          </div>

          <button
            type="button"
            className="google-button"
            onClick={handleGoogleSignUp}
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

          <p className="register-footer">
            Already have an account?{' '}
            <Link to="/login" className="register-link">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;

