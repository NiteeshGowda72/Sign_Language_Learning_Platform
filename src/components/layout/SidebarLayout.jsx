import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../sidebar/Sidebar";
import { RiMenu3Line } from "react-icons/ri";
import "./SidebarLayout.css";

const SidebarLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  // Auto-close sidebar when screen size decreases and content would overlap
  useEffect(() => {
    const handleResize = () => {
      const viewportWidth = window.innerWidth;
      const sidebarWidth = 240; // Sidebar width in pixels
      const minContentWidth = 900; // Minimum width needed for sign boxes (10 boxes × 80px + gaps + padding)
      
      // Close sidebar if viewport is too small to accommodate both sidebar and content
      // Or if we're on mobile/tablet breakpoint
      if (viewportWidth < minContentWidth + sidebarWidth || viewportWidth <= 768) {
        setIsSidebarOpen(false);
      }
    };

    // Check on mount
    handleResize();

    // Listen for resize events
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="sidebar-layout">
      {/* Mobile Menu Button - Only visible on small screens when sidebar is closed */}
      {!isSidebarOpen && (
        <button 
          className="sidebar-mobile-toggle"
          onClick={toggleSidebar}
          aria-label="Toggle menu"
        >
          <RiMenu3Line className="sidebar-mobile-toggle-icon" />
        </button>
      )}

      {/* Overlay - Only visible when sidebar is open on mobile */}
      {isSidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - Always visible on desktop, overlay on mobile */}
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      {/* Main Content */}
      <main className="sidebar-main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default SidebarLayout;

