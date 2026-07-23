import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomPopup from './CustomPopup';
import { Home, CalendarCheck, Clock, Bell, LifeBuoy, LogOut, LogIn, X, User } from 'lucide-react';

const GlobalSidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [popup, setPopup] = useState({ isOpen: false });
  
  const [customerName, setCustomerName] = useState(localStorage.getItem('customerName'));
  const [customerEmail, setCustomerEmail] = useState(localStorage.getItem('customerEmail')); // Add Email State
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('googleUID'));

  useEffect(() => {
    if (isOpen) {
      setIsLoggedIn(!!localStorage.getItem('googleUID'));
      setCustomerName(localStorage.getItem('customerName'));
      setCustomerEmail(localStorage.getItem('customerEmail')); // Update Email on open
    }
  }, [isOpen]);

  const handleAuthClick = () => {
    onClose(); 
    setTimeout(() => {
      setPopup({
        isOpen: true,
        type: 'auth',
        onSuccess: () => {
          setIsLoggedIn(true);
          setCustomerName(localStorage.getItem('customerName'));
          setCustomerEmail(localStorage.getItem('customerEmail')); // Update Email on successful auth
        }
      });
    }, 300);
  };

  const handleLogout = () => {
    setPopup({
      isOpen: true,
      title: 'Log Out',
      message: 'Are you sure you want to log out?',
      type: 'confirm',
      isDestructive: true,
      confirmText: 'Log Out',
      onConfirm: () => {
        setPopup({ isOpen: false });
        localStorage.removeItem('googleUID');
        localStorage.removeItem('customerPhone'); // Keep this if you still use it elsewhere
        localStorage.removeItem('customerName');
        localStorage.removeItem('customerEmail'); // Clear Email
        localStorage.removeItem('customerToken'); 
        
        setCustomerName(null);
        setCustomerEmail(null); // Clear state
        setIsLoggedIn(false); 
        onClose(); 
        navigate('/');
      }
    });
  };

  const menuItems = [
    { label: 'Home', icon: <Home size={20} />, action: () => { onClose(); navigate('/'); } },
    { label: 'My Bookings', icon: <CalendarCheck size={20} />, action: () => { onClose(); navigate('/my-bookings'); } },
    { label: 'Queue History', icon: <Clock size={20} />, action: () => { onClose(); navigate('/queue-history'); } },
    { label: 'Notifications', icon: <Bell size={20} />, action: () => { onClose(); alert('No new notifications.'); } },
    { label: 'Help & Support', icon: <LifeBuoy size={20} />, action: () => { onClose(); alert('Support portal coming soon!'); } }
  ];

  return (
    <>
      <CustomPopup config={popup} setConfig={setPopup} />
      
      {/* CSS for Premium Hover Animations */}
      <style>{`
        .sidebar-menu-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          border-radius: 16px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          color: #8E8E93;
          font-weight: 600;
          font-size: 15px;
        }
        .sidebar-menu-item:hover, .sidebar-menu-item:active {
          background: rgba(255,255,255,0.08);
          transform: translateX(6px);
          color: #ffffff;
        }
        .sidebar-icon {
          color: inherit;
          transition: color 0.2s ease;
        }
      `}</style>

      {/* GLASSMORPHISM BACKDROP */}
      <div 
        onClick={onClose}
        style={{ 
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
          zIndex: 9999, opacity: isOpen ? 1 : 0, visibility: isOpen ? 'visible' : 'hidden',
          transition: 'opacity 0.3s ease, visibility 0.3s ease'
        }} 
      />

      {/* SLIDING SIDEBAR PANEL */}
      <div style={{
        position: 'fixed', top: 0, right: 0, width: '100%', maxWidth: '320px', 
        height: '100dvh', background: '#1A1A2E', color: '#fff', 
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)', 
        zIndex: 10000, boxShadow: isOpen ? '-10px 0 30px rgba(0,0,0,0.3)' : 'none', 
        display: 'flex', flexDirection: 'column', borderTopLeftRadius: '24px', borderBottomLeftRadius: '24px'
      }}>
        
        {/* Header */}
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '30px 25px 20px 25px'}}>
          <h3 style={{ margin: 0, color: '#A0A0B0', letterSpacing: '1.5px', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase' }}>Menu</h3>
          <button onClick={onClose} style={{background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s'}}>
            <X size={18} />
          </button>
        </div>

        {/* PROFILE SECTION */}
        <div style={{ padding: '0 25px 25px 25px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.1)', padding: '20px', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '15px' }}>
            {/* Added flexShrink: 0 to keep icon size consistent */}
            <div style={{ width: '50px', height: '50px', borderRadius: '16px', flexShrink: 0, background: isLoggedIn ? 'linear-gradient(135deg, #A86423 0%, #754B1A 100%)' : '#333', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '900', boxShadow: isLoggedIn ? '0 8px 16px rgba(168, 100, 35, 0.3)' : 'none' }}>
              {isLoggedIn && customerName ? customerName.charAt(0).toUpperCase() : <User size={24} />}
            </div>
            
            {/* Added minWidth: 0 to allow text truncation */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h4 style={{ margin: '0 0 4px 0', color: '#fff', fontSize: '18px', fontWeight: '800', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {isLoggedIn ? (customerName || 'Customer') : 'Guest User'}
              </h4>
              {/* Replaced 'Premium Member' with the email */}
              <p style={{ margin: 0, color: '#A0A0B0', fontSize: '12px', fontWeight: '500', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {isLoggedIn ? (customerEmail || 'No email provided') : 'Login for full access'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '25px 20px', scrollbarWidth: 'none' }}>
          {isLoggedIn ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {menuItems.map((item, i) => (
                <div key={i} className="sidebar-menu-item" onClick={item.action}>
                  <span className="sidebar-icon">{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  <span style={{ opacity: 0.3 }}>›</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', marginTop: '60px', padding: '0 20px' }}>
              <div style={{ background: 'rgba(255,255,255,0.05)', width: '80px', height: '80px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                <span style={{ fontSize: '32px' }}>[Locked]</span>
              </div>
              <h3 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: '20px', fontWeight: '800' }}>Locked Features</h3>
              <p style={{ color: '#8E8E93', fontSize: '14px', margin: 0, lineHeight: '1.5' }}>Sign in to track your tokens, view history, and manage bookings.</p>
            </div>
          )}
        </div>

        {/* BOTTOM ACTION BUTTON */}
        <div style={{ padding: '25px', display: 'flex', gap: '10px' }}>
          {!isLoggedIn ? (
            <button 
              onClick={handleAuthClick} 
              style={{ width: '100%', padding: '18px', background: '#fff', color: '#1A1A2E', border: 'none', borderRadius: '20px', fontSize: '16px', fontWeight: '800', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', boxShadow: '0 10px 25px rgba(255,255,255,0.1)' }}
            >
              <LogIn size={20} /> Sign In
            </button>
          ) : (
            <button 
              onClick={handleLogout} 
              style={{ width: '100%', padding: '18px', background: 'rgba(255, 59, 48, 0.1)', color: '#FF3B30', border: '1px solid rgba(255, 59, 48, 0.2)', borderRadius: '20px', fontSize: '16px', fontWeight: '800', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', transition: 'all 0.2s' }}
            >
              <LogOut size={20} /> Sign Out
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default GlobalSidebar;