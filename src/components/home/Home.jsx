import React, { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { RiMenu3Line, RiCloseLine } from "react-icons/ri";
import logo from "../../assests/logo2.png";
import "./Home.css";
import {
  RiHandHeartFill,
  RiFileList3Fill,
  RiDashboardLine,
  RiDashboardFill,
  RiHandHeartLine,
  RiFileList3Line,
  RiUserLine,
  RiUserFill,
  RiFeedbackLine,
  RiFeedbackFill,
  RiInformationLine,
  RiInformationFill,
} from "react-icons/ri";

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { accessToken } = useSelector((state) => state.auth);
  const user = useSelector((state) => state.auth?.user);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Reset image error when user changes
  useEffect(() => {
    setImageError(false);
  }, [user?.photoURL]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  // Menu items configuration (same as Sidebar)
  const menuItems = [
    {
      path: "/dashboard",
      label: "Dashboard",
      icon: RiDashboardLine,
      iconActive: RiDashboardFill,
      protected: true,
    },
    {
      path: "/detect",
      label: "Practice",
      icon: RiHandHeartLine,
      iconActive: RiHandHeartFill,
      protected: true,
    },
    {
      path: "/test",
      label: "Test",
      icon: RiFileList3Line,
      iconActive: RiFileList3Fill,
      protected: true,
    },
    {
      path: "/profile",
      label: "Profile",
      icon: RiUserLine,
      iconActive: RiUserFill,
      protected: true,
    },
    {
      path: "/feedback",
      label: "Feedback",
      icon: RiFeedbackLine,
      iconActive: RiFeedbackFill,
      protected: false,
    },
    {
      path: "/about",
      label: "About",
      icon: RiInformationLine,
      iconActive: RiInformationFill,
      protected: false,
    },
  ];

  // Filter menu items based on authentication
  const visibleMenuItems = menuItems.filter(
    (item) => !item.protected || accessToken
  );

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  // Close menu when a link is clicked
  const handleLinkClick = () => {
    closeMenu();
  };

  const handlePracticeClick = () => {
    if (accessToken) {
      navigate("/detect");
    } else {
      navigate("/login");
    }
  };

  const handleTestClick = () => {
    // Placeholder for Test route - will be added later
    if (accessToken) {
      navigate("/test");
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="home-container">
      {/* Fixed Header with Menu Toggle */}
      <div className="home-header">
        <div className="home-header-content">
          {/* Hamburger Menu Button - Left Side */}
          <button
            className="home-menu-toggle-button"
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <RiCloseLine className="home-menu-toggle-icon" />
            ) : (
              <RiMenu3Line className="home-menu-toggle-icon" />
            )}
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div className="home-menu-dropdown">
              <nav className="home-menu-nav">
                {visibleMenuItems.map((item) => {
                  const Icon = isActive(item.path) ? item.iconActive : item.icon;
                  const active = isActive(item.path);

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`home-menu-link ${active ? "active" : ""}`}
                      onClick={handleLinkClick}
                    >
                      <Icon className="home-menu-icon" />
                      <span className="home-menu-text">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}

          <Link to="/" className="home-logo-link" onClick={closeMenu}>
            <img src={logo} alt="Sign Language AI" className="home-logo" />
          </Link>
          
          <div className="home-header-right">
            {accessToken ? (
              <Link to="/profile" className="home-profile-link" onClick={closeMenu}>
                {user?.photoURL && user.photoURL.trim() && !imageError ? (
                  <img 
                    src={user.photoURL} 
                    alt="Profile" 
                    className="home-profile-avatar"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="home-profile-avatar-initial">
                    {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U"}
                  </div>
                )}
              </Link>
            ) : (
              <div className="home-auth-links">
                <Link to="/login" className="home-auth-button" onClick={closeMenu}>Sign in</Link>
                <Link to="/register" className="home-auth-button primary" onClick={closeMenu}>Sign up</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isMenuOpen && (
        <div className="home-menu-overlay" onClick={closeMenu}></div>
      )}

      {/* Main Content - Mode Selection */}
      <div className="home-main-content">
        <div className="home-welcome-section">
          <h1 className="home-title gradient__text">Welcome to Sign Language Learning</h1>
          <p className="home-subtitle">Choose your learning mode to get started</p>
        </div>

        <div className="home-mode-cards">
          {/* Practice Card */}
          <div className="home-mode-card" onClick={handlePracticeClick}>
            <div className="home-mode-card-icon practice">
              <RiHandHeartFill />
            </div>
            <h2 className="home-mode-card-title">Practice</h2>
            <p className="home-mode-card-description">
              Learn and practice sign language using real-time detection
            </p>
            <div className="home-mode-card-arrow">→</div>
          </div>

          {/* Test Card */}
          <div className="home-mode-card" onClick={handleTestClick}>
            <div className="home-mode-card-icon test">
              <RiFileList3Fill />
            </div>
            <h2 className="home-mode-card-title">Test</h2>
            <p className="home-mode-card-description">
              Evaluate your sign language skills
            </p>
            <div className="home-mode-card-arrow">→</div>
          </div>
        </div>

        {/* Quick Link to About */}
        <div className="home-about-link">
          <Link to="/about" className="home-about-link-text">
            Learn more about this platform →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;
