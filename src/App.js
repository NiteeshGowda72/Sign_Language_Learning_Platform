import { Route, Routes, Navigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import "./App.css";
import {
  Navbar,
  Footer,
  Home,
  Detect,
  NotFound,
  Dashboard,
  TextToSign,
  Feedback,
  Profile,
  SidebarLayout,
  About,
} from "./components";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Test from "./pages/Test";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { GOOGLE_CLIENT_ID, supabase } from "./config";
import { loginSuccess, loadProfile } from "./redux/actions/authaction";
import { getSession, getCurrentUser } from "./auth/supabaseAuth";
import { ProgressProvider } from "./context/ProgressContext";

const notifyMsg = (type, msg) => {
  if (type === "success") {
    const notify = () => toast.success(msg);
    notify();
  } else {
    const notify = () => toast.error(msg);
    notify();
  }
};

const Layout = ({ children }) => {
  return (
    <>
      <Navbar notifyMsg={notifyMsg} />
      {children}
      <Footer />
    </>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const accessToken = useSelector((state) => state.auth?.accessToken);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      // Check Redux store first
      if (accessToken) {
        setIsAuthenticated(true);
        setLoading(false);
        return;
      }

      // Check Supabase session
      if (supabase) {
        try {
          const { session } = await getSession();
          if (session) {
            setIsAuthenticated(true);
            // Optionally sync with Redux here
          } else {
            setIsAuthenticated(false);
          }
        } catch (error) {
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
      setLoading(false);
    };

    checkAuth();
  }, [accessToken]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Save the intended destination before redirecting to login
    const currentPath = window.location.pathname;
    return <Navigate to={`/login?redirect=${encodeURIComponent(currentPath)}`} replace />;
  }

  return children;
};

// App Initialization Component
const AppContent = () => {
  const dispatch = useDispatch();
  const accessToken = useSelector((state) => state.auth?.accessToken);

  useEffect(() => {
    // Initialize Supabase auth state on app load
    const initializeAuth = async () => {
      if (supabase && !accessToken) {
        try {
          const { session } = await getSession();
          if (session) {
            // User is authenticated via Supabase
            dispatch(loginSuccess(session.access_token));
            
            const { user } = await getCurrentUser();
            if (user) {
              dispatch(
                loadProfile({
                  name: user.user_metadata?.username || user.email?.split('@')[0] || 'User',
                  photoURL: user.user_metadata?.avatar_url || null,
                  userId: user.id,
                  email: user.email,
                })
              );
            }
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
        }
      }
    };

    initializeAuth();

    // Listen for auth state changes
    if (supabase) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          dispatch(loginSuccess(session.access_token));
          // Profile will be loaded by the component that triggered the sign in
        } else if (event === 'SIGNED_OUT') {
          // Logout is handled by the logout action
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [dispatch, accessToken]);

  return (
    <Routes>
      <Route
        exact
        path="/"
        element={<Home />}
      />

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />

      {/* Protected routes with sidebar */}
      <Route
        element={
          <ProtectedRoute>
            <SidebarLayout />
          </ProtectedRoute>
        }
      >
        <Route exact path="/detect" element={<Detect />} />
        <Route exact path="/dashboard" element={<Dashboard />} />
        <Route path="/texttosign" element={<TextToSign />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/test" element={<Test />} />
      </Route>

      {/* Public routes with sidebar (Feedback, About) */}
      <Route element={<SidebarLayout />}>
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/about" element={<About />} />
      </Route>

      
      {/* Redirect common variations to /texttosign */}
      <Route path="/text-to-sign" element={<Navigate to="/texttosign" replace />} />
      <Route path="/signtext" element={<Navigate to="/texttosign" replace />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ProgressProvider>
        <div className="App">
          <AppContent />
          <ToastContainer
            position="top-left"
            autoClose={2000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            pauseOnHover
          />
        </div>
      </ProgressProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
