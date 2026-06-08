import React, { useEffect, useState, useCallback } from "react";
import "./Navbar.css";
import { Link } from "react-router-dom";
import logo from "../../assests/logo2.png";
import { RiMenu3Line, RiCloseLine } from "react-icons/ri";
import { useDispatch, useSelector } from "react-redux";
import { useGoogleLogin } from "@react-oauth/google";
import { loginSuccess, loginFail, logout, loadProfile } from "../../redux/actions/authaction";
import { signInWithGoogle } from "../../auth/supabaseAuth";

const Navbar = ({ notifyMsg }) => {
  const [toggle, setToggle] = useState(false);

  const user = useSelector((state) => state.auth?.user);

  const { accessToken } = useSelector((state) => state.auth);

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const dispatch = useDispatch();

  const handleLoginSuccess = useCallback((tokenResponse) => {
    dispatch(loginSuccess(tokenResponse));
    setIsLoggedIn(true);
  }, [dispatch]);

  const handleLoginError = useCallback((error) => {
    dispatch(loginFail(error));
    if (notifyMsg) {
      notifyMsg("error", "Login failed. Please try again.");
    }
  }, [dispatch, notifyMsg]);

  // Welcome message removed
  // useEffect(() => {
  //   if (isLoggedIn && user && notifyMsg) {
  //     notifyMsg(
  //       "success",
  //       `Welcome! ${user?.name}, You Logged in Successfully`
  //     );
  //   }
  // }, [isLoggedIn, user, notifyMsg]);

  const googleLogin = useGoogleLogin({
    onSuccess: handleLoginSuccess,
    onError: handleLoginError,
  });

  const handleLogin = () => {
    // Navigate to login page instead of auto Google login
    window.location.href = "/login";
  };

  const handleGoogleLogin = async () => {
    try {
      // Try Supabase Google OAuth first
      const { error } = await signInWithGoogle();
      if (error) {
        // Fallback to React OAuth if Supabase fails
        googleLogin();
      }
    } catch (error) {
      console.error("Google login error:", error);
      // Fallback to React OAuth
      googleLogin();
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    notifyMsg("success", "Logged Out Successfully !");
  };

  return (
    <div className="signlang_navbar  gradient__bg">
      <div className="singlang_navlinks">
        <div className="signlang_navlinks_logo">
          <a href="/">
            <img className="logo" src={logo} alt="logo" />
          </a>
        </div>

        <div className="signlang_navlinks_container">
          <p>
            <Link to="/">Home</Link>
          </p>

          <p>
            <Link to="/detect">Detect</Link>
          </p>


          {/* <p>
            <Link to="/guide">Guide</Link>
          </p> */}

          {accessToken && (
            <>
            <p>
              <Link to="/dashboard">Dashboard</Link>
            </p>
              <p>
                <Link to="/profile">Profile</Link>
              </p>
            </>
          )}
          <p>
            <Link to="/feedback">Feedback</Link>
          </p>
        </div>

        <div className="signlang_auth-data">
          {accessToken ? (
            <>
              {user?.photoURL && (
                <img src={user.photoURL} alt="user-icon" />
              )}
              <span className="username">{user?.name || user?.email || 'User'}</span>
              <button type="button" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link-button">
                Sign in
              </Link>
              <Link to="/register" className="nav-link-button primary">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="signlang__navbar-menu">
        {toggle ? (
          <RiCloseLine
            color="#fff"
            size={27}
            onClick={() => setToggle(false)}
          />
        ) : (
          <RiMenu3Line color="#fff" size={27} onClick={() => setToggle(true)} />
        )}
        {toggle && (
          <div className="signlang__navbar-menu_container scale-up-center">
            <div className="signlang__navbar-menu_container-links">
              <p>
                <Link to="/">Home</Link>
              </p>

              <p>
                <Link to="/detect">Detect</Link>
              </p>


              {accessToken && (
                <>
                <p>
                  <Link to="/dashboard">Dashboard</Link>
                </p>
                  <p>
                    <Link to="/profile">Profile</Link>
                  </p>
                </>
              )}
              <p>
                <Link to="/feedback">Feedback</Link>
              </p>
            </div>

            <div className="signlang__navbar-menu_container-links-authdata">
              {accessToken ? (
                <>
                  {user?.photoURL && (
                    <img src={user.photoURL} alt="user-icon" />
                  )}
                  <span className="username">{user?.name || user?.email || 'User'}</span>
                  <button type="button" onClick={handleLogout}>
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="nav-link-button">
                    Sign in
                  </Link>
                  <Link to="/register" className="nav-link-button primary">
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Navbar;
