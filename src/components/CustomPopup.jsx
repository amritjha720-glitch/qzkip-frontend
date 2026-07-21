import React, { useState } from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';

const CustomPopup = ({ config, setConfig }) => {
  // NEW: Removed extra states (step, phone, userData)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // FIX: Added missing error state

  if (!config.isOpen) return null;

  const closePopup = () => {
    setError(null);
    setConfig({ ...config, isOpen: false });
  };

  const handleConfirm = () => {
    if (config.onConfirm) {
      config.onConfirm();
    } else {
      closePopup();
    }
  };

  // ==========================================
  // AUTH LOGIC (Direct Login - No Phone Required)
  // ==========================================
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // THE MAGIC: Simplified requirements, save directly
      localStorage.setItem('googleUID', user.uid);
      localStorage.setItem('customerName', user.displayName || 'Customer');
      
      // If a special success function is passed, call it
      if (config.onSuccess) {
        config.onSuccess();
        closePopup();
      } else {
        handleConfirm();
      }
    } catch (err) {
      // If the user closes the popup themselves, ignore it
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        console.log("User closed the popup.");
        setError(null); 
      } else {
        console.error("Login Error: ", err);
        setError("Google Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, padding: '20px' }}>
      <div style={{ background: 'rgba(255, 255, 255, 0.95)', padding: '25px', borderRadius: '18px', width: '100%', maxWidth: '320px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        
        {/* Close Button */}
        <button 
          onClick={closePopup} 
          style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#8E8E93', fontSize: '18px', cursor: 'pointer' }}
        >
          X
        </button>

        {/* IF POPUP IS FOR AUTH */}
        {config.type === 'auth' ? (
          <>
            <h3 style={{ margin: '10px 0 8px 0', color: '#1C1C1E', fontSize: '20px', fontWeight: '700' }}>Login Required</h3>
            <p style={{ margin: '0 0 15px 0', fontSize: '13px', color: '#8E8E93', lineHeight: '1.4' }}>
              Please log in to view booking details
            </p>

            {/* Error Message UI */}
            {error && <p style={{ color: '#FF3B30', fontSize: '12px', marginBottom: '15px' }}>{error}</p>}

            <button 
              onClick={handleGoogleLogin} 
              disabled={loading} 
              style={{ width: '100%', background: '#fff', color: '#1C1C1E', padding: '14px', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', border: '1px solid #E5E5EA', display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}
            >
              {loading ? 'Please wait...' : (
                <>
                  <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  Continue with Google
                </>
              )}
            </button>
          </>
        ) : (
          
          /* OLD REGULAR POPUP (Alert / Confirm) */
          <>
            <h3 style={{ margin: '10px 0 8px 0', color: '#1C1C1E', fontSize: '18px', fontWeight: '600' }}>{config.title || 'Notice'}</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#8E8E93', lineHeight: '1.4' }}>{config.message}</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              {config.type === 'confirm' && (
                <button onClick={closePopup} style={{ flex: 1, padding: '12px', background: '#E5E5EA', border: 'none', borderRadius: '10px', color: '#1C1C1E', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>
                  Cancel
                </button>
              )}
              <button onClick={handleConfirm} style={{ flex: 1, padding: '12px', background: config.isDestructive ? '#FF3B30' : '#007AFF', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>
                {config.confirmText || 'OK'}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default CustomPopup;