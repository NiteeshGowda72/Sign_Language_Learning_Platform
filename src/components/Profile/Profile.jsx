import React, { useState, useEffect } from "react";
import "./Profile.css";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../../redux/actions/authaction";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useProgress } from "../../context/ProgressContext";

const Profile = () => {
  const user = useSelector((state) => state.auth?.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { progress } = useProgress();
  const [isLoading, setIsLoading] = useState(true);

  // Load user data
  useEffect(() => {
    const loadUserData = () => {
      setIsLoading(true);
      setIsLoading(false);
    };

    loadUserData();
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    toast.success("Logged out successfully!");
    navigate("/");
  };

  // Get user avatar (first letter of name or email)
  const getAvatarInitial = () => {
    if (user?.name) {
      return user.name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  if (isLoading) {
    return (
      <div className="profile-container">
        <div className="profile-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-wrapper">
        {/* Profile Header */}
        <div className="profile-header">
          <div className="profile-avatar">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" />
            ) : (
              <div className="profile-avatar-initial">{getAvatarInitial()}</div>
            )}
          </div>
          <div className="profile-header-info">
            <h1 className="gradient__text">{user?.name || "User"}</h1>
            <p className="profile-email">{user?.email || "No email"}</p>
          </div>
        </div>

        {/* Account Details Card */}
        <div className="profile-card">
          <h2 className="profile-card-title">Account Details</h2>
          <div className="profile-card-content">
            <div className="profile-detail-item">
              <span className="profile-detail-label">Name</span>
              <span className="profile-detail-value">{user?.name || "Not set"}</span>
            </div>
            <div className="profile-detail-item">
              <span className="profile-detail-label">Email</span>
              <span className="profile-detail-value">{user?.email || "Not set"}</span>
            </div>
          </div>
        </div>

        {/* Your Progress Card */}
        <div className="profile-card">
          <h2 className="profile-card-title">Your Progress</h2>
          <div className="profile-card-content">
            <div className="progress-grid">
              <div className="progress-card">
                <div className="progress-icon">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <div className="progress-info">
                  <span className="progress-label">Total Signs Practiced</span>
                  <span className="progress-value">{progress.totalSignsPracticed}</span>
                </div>
              </div>

              <div className="progress-card">
                <div className="progress-icon">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                </div>
                <div className="progress-info">
                  <span className="progress-label">Total Tests Taken</span>
                  <span className="progress-value">{progress.totalTestsTaken}</span>
                </div>
              </div>

              <div className="progress-card">
                <div className="progress-icon">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                </div>
                <div className="progress-info">
                  <span className="progress-label">Best Test Score</span>
                  <span className="progress-value">{progress.bestTestScore}</span>
                </div>
              </div>

              <div className="progress-card">
                <div className="progress-icon">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </div>
                <div className="progress-info">
                  <span className="progress-label">Last Test Accuracy</span>
                  <span className="progress-value">
                    {progress.lastTestAccuracy > 0 ? `${progress.lastTestAccuracy}%` : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <div className="profile-card">
          <div className="profile-card-content">
            <button
              className="profile-action-button danger"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

