import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../../redux/actions/authaction";
import { toast } from "react-toastify";
import { RiMenu3Line, RiCloseLine } from "react-icons/ri";
import logo from "../../assests/logo2.png";
import "./Sidebar.css";
import {
  RiDashboardLine,
  RiDashboardFill,
  RiHandHeartLine,
  RiHandHeartFill,
  RiFileList3Line,
  RiFileList3Fill,
  RiUserLine,
  RiUserFill,
  RiFeedbackLine,
  RiFeedbackFill,
  RiInformationLine,
  RiInformationFill,
  RiLogoutBoxLine,
  RiArrowLeftLine,
} from "react-icons/ri";

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { accessToken } = useSelector((state) => state.auth);

  const handleBackClick = () => {
    // Get the previous location from state, or use browser history
    const state = location.state;
    const from = state?.from || null;

    if (from && from !== location.pathname) {
      // Navigate to the previous page if we have it
      navigate(from);
    } else if (window.history.length > 1) {
      // Try to go back in browser history
      navigate(-1);
    } else {
      // No history, go to home
      navigate("/", { replace: true });
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    toast.success("Logged out successfully!");
    navigate("/");
  };

  // Menu items configuration
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
    if (path === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  // Close sidebar when a link is clicked (on mobile)
  const handleLinkClick = () => {
    if (window.innerWidth <= 768) {
      onClose && onClose();
    }
  };

  // Handle navigation to test/practice with instructions flag
  const handleTestPracticeClick = (path, e) => {
    e.preventDefault();
    // Navigate with state to show instructions
    navigate(path, { state: { showInstructions: true } });
    handleLinkClick();
  };

  // Handle header click to close sidebar
  const handleHeaderClick = () => {
    onClose && onClose();
  };

  return (
    <div className={`sidebar-container ${isOpen ? "open" : ""}`}>
      {/* Sidebar Header with Back Arrow and Logo */}
      <div className="sidebar-header">
        {/* Back Arrow Button - Only show on sidebar pages (not home) */}
        {location.pathname !== "/" && (
          <button
            className="sidebar-back-button"
            onClick={handleBackClick}
            aria-label="Go back"
            title="Go back"
          >
            <RiArrowLeftLine className="sidebar-back-icon" />
          </button>
        )}
        
        {/* Close Button - Show on mobile when sidebar is open */}
        <button
          className="sidebar-close-button-mobile"
          onClick={handleHeaderClick}
          aria-label="Close sidebar"
        >
          <RiCloseLine className="sidebar-toggle-icon" />
        </button>
        
        <Link to="/" className="sidebar-logo-link" onClick={handleLinkClick}>
          <img src={logo} alt="Sign Language AI" className="sidebar-logo" />
        </Link>
      </div>

      <nav className="sidebar-nav">
        <ul className="sidebar-menu">
          {visibleMenuItems.map((item) => {
            const Icon = isActive(item.path) ? item.iconActive : item.icon;
            const active = isActive(item.path);
            const isTestOrPractice = item.path === "/test" || item.path === "/detect";

            return (
              <li key={item.path} className="sidebar-menu-item">
                {isTestOrPractice ? (
                  <Link
                    to={item.path}
                    className={`sidebar-link ${active ? "active" : ""}`}
                    onClick={(e) => handleTestPracticeClick(item.path, e)}
                  >
                    <Icon className="sidebar-icon" />
                    <span className="sidebar-text">{item.label}</span>
                  </Link>
                ) : (
                  <Link
                    to={item.path}
                    className={`sidebar-link ${active ? "active" : ""}`}
                    onClick={handleLinkClick}
                  >
                    <Icon className="sidebar-icon" />
                    <span className="sidebar-text">{item.label}</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {accessToken && (
        <div className="sidebar-footer">
          <button
            onClick={handleLogout}
            className="sidebar-logout-button"
            aria-label="Logout"
          >
            <RiLogoutBoxLine className="sidebar-icon" />
            <span className="sidebar-text">Logout</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default Sidebar;

