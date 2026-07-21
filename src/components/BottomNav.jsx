import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  if (
    location.pathname.includes('/vendor') || 
    location.pathname.includes('/dashboard')
  ) {
    return null; 
  }

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/my-bookings', label: 'My Bookings' },
    { path: '/queue-history', label: 'History' }
  ];

  // Added event parameter to stop bubbling
  const handleNavClick = (e, path) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(path);
  };

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '20px', 
      left: '50%',               
      transform: 'translateX(-50%)', 
      width: 'calc(100% - 40px)', 
      maxWidth: '420px',         
      background: '#2B2624', 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      padding: '16px 24px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.2)', 
      zIndex: 1000,
      boxSizing: 'border-box',
      borderRadius: '40px', 
      userSelect: 'none',
      WebkitUserSelect: 'none',
      WebkitTouchCallout: 'none' // Stops Chrome touch callouts globally on navigation
    }}>
      {navItems.map(item => {
        const isActive = location.pathname === item.path;
        return (
          /* CHANGED TO <button> TAG: Browsers never text-select or perform touch-to-search on real buttons */
          <button 
            key={item.path} 
            onClick={(e) => handleNavClick(e, item.path)} 
            style={{ 
              background: 'transparent', // Reset button styling
              border: 'none',
              outline: 'none',
              padding: '4px 8px',
              cursor: 'pointer', 
              color: isActive ? '#DC734A' : '#8D8785', 
              transition: 'all 0.3s ease', 
              WebkitTapHighlightColor: 'transparent', 
              fontSize: '14px', 
              fontWeight: isActive ? '800' : '600',
              textAlign: 'center',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none', // Prevents long-press menu
              touchAction: 'manipulation' // Instantly registers tap without 300ms zoom/search delay
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
};

export default BottomNav;