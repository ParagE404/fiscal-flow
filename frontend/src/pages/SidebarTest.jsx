import React, { useState } from 'react';
import { Sidebar } from '../components/layout/Sidebar';

/**
 * Sidebar Test Page
 * Simple test to check if the sidebar is rendering correctly
 */
const SidebarTest = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen bg-background flex">
      <div className="text-center p-8">
        <h1 className="text-h1 mb-4">Sidebar Test</h1>
        <p className="text-body mb-4">
          Testing if the sidebar component renders correctly.
        </p>
        <button 
          onClick={toggleSidebar}
          className="px-4 py-2 bg-primary text-white rounded-lg"
        >
          Toggle Sidebar (Currently: {sidebarOpen ? 'Open' : 'Closed'})
        </button>
      </div>
      
      {/* Test Sidebar */}
      <nav 
        role="navigation" 
        aria-label="Main navigation"
        className={sidebarOpen ? '' : 'sr-only md:not-sr-only'}
      >
        <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      </nav>
    </div>
  );
};

export default SidebarTest;