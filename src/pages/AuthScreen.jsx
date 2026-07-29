/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomPopup from "../components/CustomPopup";
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signOut } from 'firebase/auth'; 
import SmartLogo from '../components/SmartLogo';
import axios from 'axios';

const API_URL = 'https://qzkip-backend.onrender.com/api/auth'; 

const AuthScreen = () => {
  const navigate = useNavigate();
  
  const [step, setStep] = useState('LOGIN'); 
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState({ isOpen: false }); // 🟢 FIXED: Added missing Popup State
  
  const [googleData, setGoogleData] = useState(() => {
    const savedData = localStorage.getItem('vendorGoogleData');
    return savedData ? JSON.parse(savedData) : { googleUID: '', email: '', name: '' };
  });
  
  const [form, setForm] = useState({ 
    phone: '', 
    shop_name: '', 
    document_type: 'PAN',
    document_number: '',
    shop_type: 'clinic' 
  });

  // 🟢 Vendor Location States
  const [locationStatus, setLocationStatus] = useState('idle'); 
  const [coords, setCoords] = useState(null);

  const config = { withCredentials: true };

  useEffect(() => {
    if (localStorage.getItem('vendorToken')) navigate('/dashboard');
  }, [navigate]);

  // 🟢 FEATURE: Reusable Location Request Function
  const requestLocation = () => {
    setLocationStatus('locating');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationStatus('found');
        },
        (err) => {
          console.error("Location access denied by vendor:", err);
          setLocationStatus('denied');
          if (err.code === err.PERMISSION_DENIED) {
            setPopup({ 
              isOpen: true, 
              title: 'Location Disabled', 
              message: 'Please allow location so customers can navigate to your shop via Google Maps.', 
              type: 'alert', 
              confirmText: 'Got It' 
            });
          }
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setLocationStatus('denied');
    }
  };

  // 🟢 MAGICAL TRICK: Form khulte hi location maang lo
  useEffect(() => {
    if (step === 'FORM') {
      requestLocation();
    }
  }, [step]);

  // ==========================================
  // 1. GOOGLE LOGIN HANDLER 
  // ==========================================
  const handleGoogleLogin = async (forceSelect = false) => {
    setLoading(true);
    try {
      if (forceSelect) {
        googleProvider.setCustomParameters({ prompt: 'select_account' });
      } else {
        googleProvider.setCustomParameters({}); 
      }

      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const gData = {
        googleUID: user.uid,
        email: user.email,
        name: user.displayName || 'Vendor'
      };
      
      setGoogleData(gData);

      const res = await axios.post(`${API_URL}/google`, { 
        googleUID: gData.googleUID, 
        email: gData.email 
      }, config);
      
      if (res.data.action === 'SHOW_FORM') {
        setStep('FORM');
        localStorage.setItem('vendorGoogleData', JSON.stringify(gData));
      } else if (res.data.action === 'SHOW_PENDING') {
        setStep('PENDING');
        localStorage.setItem('vendorGoogleData', JSON.stringify(gData));
      } else if (res.data.action === 'SHOW_REJECTED') {
        setStep('REJECTED');
        localStorage.setItem('vendorGoogleData', JSON.stringify(gData));
      } else if (res.data.action === 'LOGIN_SUCCESS') {
        localStorage.setItem('vendorToken', res.data.token);
        localStorage.setItem('vendorEmail', gData.email); 
        localStorage.removeItem('vendorGoogleData');
        navigate('/dashboard');
      }
    } catch (e) {
      if (e.code !== 'auth/popup-closed-by-user') {
        console.error("Login Error:", e);
        setPopup({ isOpen: true, title: 'Login Failed', message: 'Google login failed. Please try again.', type: 'alert', confirmText: 'OK' });
      }
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 2. KYC FORM SUBMIT HANDLER
  // ==========================================
  const handleFormSubmit = async () => {
    if (form.phone.length !== 10 || !form.shop_name || !form.document_number) {
      return setPopup({ isOpen: true, title: 'Missing Fields', message: 'Please fill out all the fields correctly!', type: 'alert', confirmText: 'OK' });
    }
    
    setLoading(true);
    try {
      // 🟢 Payload mein coords (lat, lng) merge kar diye
      const payload = { ...googleData, ...form };
      if (coords) {
        payload.lat = coords.lat;
        payload.lng = coords.lng;
      }

      const res = await axios.post(`${API_URL}/complete-profile`, payload, config);
      
      if (res.data.action === 'SHOW_PENDING') {
        setStep('PENDING');
      } else if (res.data.action === 'SHOW_REJECTED') {
        setStep('REJECTED');
      }
    } catch (e) {
      if (e.response?.data?.errors) {
        setPopup({ isOpen: true, title: 'Validation Error', message: e.response.data.errors.join('\n'), type: 'alert', confirmText: 'OK' });
      } else {
        setPopup({ isOpen: true, title: 'Error', message: e.response?.data?.message || "Registration failed!", type: 'alert', confirmText: 'OK' });
      }
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 3. SILENT STATUS CHECKER
  // ==========================================
  const checkVerificationStatus = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/google`, { 
        googleUID: googleData.googleUID, 
        email: googleData.email 
      }, config);
      
      if (res.data.action === 'SHOW_PENDING') {
        console.log("Status check: Still Pending");
      } else if (res.data.action === 'SHOW_REJECTED') {
         setStep('REJECTED');
      } else if (res.data.action === 'LOGIN_SUCCESS') {
        localStorage.setItem('vendorToken', res.data.token);
        localStorage.setItem('vendorEmail', googleData.email); 
        localStorage.removeItem('vendorGoogleData');
        navigate('/dashboard');
      }
    } catch (e) {
      console.error("Error occurred while checking status:", e);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 4. LOGOUT & CHANGE ACCOUNT HANDLER
  // ==========================================
  const handleLogout = async () => {
    await signOut(auth); 
    
    try {
      await axios.post(`${API_URL}/logout`, {}, config);
    } catch (e) { console.log("Logout backend clear failed", e); }

    setStep('LOGIN'); 
    setGoogleData({googleUID: '', email: '', name: ''});
    
    localStorage.removeItem('vendorGoogleData');
    localStorage.removeItem('vendorToken');
    localStorage.removeItem('vendorEmail'); 
    localStorage.removeItem('vendorAuthStep'); 
    
    handleGoogleLogin(true); 
  };

  const inputStyle = {
    width: '100%', padding: '16px', marginBottom: '16px', borderRadius: '16px', 
    border: '1px solid #E5E5EA', background: '#F8F9FA', fontSize: '15px', 
    outline: 'none', fontWeight: '600', color: '#1A1A2E', boxSizing: 'border-box',
    transition: 'border-color 0.2s'
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8F7F3', display: 'flex', flexDirection: 'column', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      
      <CustomPopup config={popup} setConfig={setPopup} /> {/* 🟢 FIXED: Added Popup Component */}

      {/* GLOBAL BRANDING HEADER */}
      <div style={{ 
        width: '100%', background: 'linear-gradient(135deg, #A86423 0%, #754B1A 100%)', 
        padding: '20px 24px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', boxSizing: 'border-box',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div 
          onClick={() => navigate('/')} 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
        >
          <SmartLogo size={30} />
          <h1 style={{margin: 0, fontSize: '22px', color: '#ffffff', fontWeight: '800', letterSpacing: '-0.5px'}}>Qzkip</h1>
        </div>
        <span style={{ background: 'rgba(255,255,255,0.15)', color: '#F9F3EA', padding: '6px 12px', borderRadius: '10px', fontSize: '13px', fontWeight: '700' }}>Vendor Portal</span>
      </div>
      
      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        
        <div style={{ background: '#ffffff', width: '100%', maxWidth: '420px', borderRadius: '32px', padding: '40px 30px', boxShadow: '0 12px 40px rgba(0,0,0,0.06)', boxSizing: 'border-box' }}>
          
          {/* ================= STEP 1: GOOGLE LOGIN ================= */}
          {step === 'LOGIN' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <h2 style={{ margin: '0 0 8px 0', color: '#1A1A2E', fontSize: '26px', fontWeight: '900', letterSpacing: '-0.5px' }}>Partner Login</h2>
                <p style={{ margin: 0, color: '#8E8E93', fontSize: '14px', fontWeight: '500' }}>Manage your queue seamlessly</p>
              </div>
              
              <button 
                onClick={() => handleGoogleLogin(false)} 
                disabled={loading} 
                style={{ background: '#1A1A2E', color: '#fff', padding: '16px', borderRadius: '16px', fontWeight: '700', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '15px', boxShadow: '0 8px 24px rgba(26,26,46,0.2)', transition: 'transform 0.2s', marginTop: '10px' }}
              >
                {loading ? 'Please wait...' : (
                  <>
                    <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>
              
              <p style={{ textAlign: 'center', fontSize: '12px', color: '#8E8E93', marginTop: '10px', fontWeight: '500' }}>
                One-click secure login for our partners.
              </p>
            </div>
          )}

          {/* ================= STEP 2: KYC FORM ================= */}
          {step === 'FORM' && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                <h2 style={{ margin: '0 0 5px 0', color: '#1A1A2E', fontSize: '24px', fontWeight: '900', letterSpacing: '-0.5px' }}>Complete Profile</h2>
                <p style={{ margin: 0, color: '#8E8E93', fontSize: '13px', fontWeight: '500' }}>Setup your shop details to get started</p>
              </div>
              
              {/* 🟢 INTERACTIVE LOCATION STATUS INDICATOR */}
              <div style={{ 
                marginBottom: '15px', padding: '12px', borderRadius: '12px', 
                background: locationStatus === 'denied' ? '#FEF2F2' : '#F0FDF4', 
                border: `1px solid ${locationStatus === 'denied' ? '#FECACA' : '#BBF7D0'}`, 
                display: 'flex', alignItems: 'center', gap: '8px',
                cursor: locationStatus === 'denied' ? 'pointer' : 'default' // Add pointer if denied
              }}
              onClick={() => locationStatus === 'denied' && requestLocation()} // Retry on click
              >
                {locationStatus === 'locating' && <span style={{ fontSize: '12px', color: '#B45309', fontWeight: '600' }}>📍 Detecting shop location...</span>}
                {locationStatus === 'found' && <span style={{ fontSize: '12px', color: '#15803D', fontWeight: '600' }}>📍 Exact shop location captured</span>}
                {locationStatus === 'denied' && (
                  <span style={{ fontSize: '12px', color: '#B91C1C', fontWeight: '600' }}>
                    📍 Location denied. <span style={{textDecoration: 'underline'}}>Tap to retry</span> so customers can find you.
                  </span>
                )}
              </div>

              <input type="text" placeholder="Shop Name" style={inputStyle} value={form.shop_name} onChange={e => setForm({...form, shop_name: e.target.value})} />
              
              <select style={{...inputStyle, cursor: 'pointer'}} value={form.shop_type} onChange={e => setForm({...form, shop_type: e.target.value})}>
                <option value="clinic">Clinic</option>
                <option value="barber">Barber</option>
                <option value="cyber cafe">Cyber Cafe</option>
              </select>

              <div style={{display: 'flex', gap: '10px'}}>
                <select style={{...inputStyle, flex: '0.35', padding: '16px 12px'}} value={form.document_type} onChange={e => setForm({...form, document_type: e.target.value})}>
                  <option value="PAN">PAN</option>
                  <option value="GSTIN">GSTIN</option>
                  <option value="Shop License">Shop Act</option>
                </select>
                <input type="text" placeholder="Document Number" style={{...inputStyle, flex: '0.65', textTransform: 'uppercase'}} value={form.document_number} onChange={e => setForm({...form, document_number: e.target.value})} />
              </div>
              
              <input type="tel" placeholder="10-Digit WhatsApp Number" style={inputStyle} value={form.phone} onChange={e => {
                  const onlyNums = e.target.value.replace(/\D/g, ''); 
                  if (onlyNums.length <= 10) setForm({...form, phone: onlyNums});
              }}/>

              <button onClick={handleFormSubmit} disabled={loading} style={{ background: 'linear-gradient(135deg, #A86423 0%, #754B1A 100%)', color: '#fff', border: 'none', padding: '18px', borderRadius: '16px', fontWeight: '800', marginTop: '10px', cursor: 'pointer', fontSize: '16px', boxShadow: '0 8px 24px rgba(168, 100, 35, 0.25)', transition: 'transform 0.2s' }}>
                {loading ? 'Submitting...' : 'Submit Details'}
              </button>
              
              <span onClick={handleLogout} style={{ textAlign: 'center', color: '#A86423', fontSize: '13px', cursor: 'pointer', marginTop: '20px', fontWeight: '700' }}>
                Cancel & Use a different account
              </span>
            </div>
          )}

          {/* ================= STEP 3: PENDING SCREEN ================= */}
          {step === 'PENDING' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0' }}>
              <div style={{ background: '#FFF4E5', padding: '16px 40px', borderRadius: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '20px', boxShadow: '0 8px 20px rgba(255, 149, 0, 0.15)' }}>
                <span style={{ fontSize: '32px' }}>⏳</span>
              </div>
              <h2 style={{ color: '#1A1A2E', fontSize: '24px', margin: '0 0 10px 0', fontWeight: '900', letterSpacing: '-0.5px' }}>Under Review</h2>
              <p style={{ color: '#8E8E93', fontSize: '15px', textAlign: 'center', lineHeight: '1.5', margin: '0 0 20px 0', fontWeight: '500' }}>
                Your documents are being verified. Once approved, you will be able to start your queue.
              </p>

              <div style={{ background: '#F2F2F7', padding: '8px 16px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '25px' }}>
                <div style={{ width: '8px', height: '8px', background: '#FF9500', borderRadius: '50%', boxShadow: '0 0 5px rgba(255, 149, 0, 0.6)' }}></div>
                <span style={{ fontSize: '12px', color: '#8E8E93', fontWeight: '600' }}>Logged in as <b style={{color: '#1A1A2E'}}>{googleData.email}</b></span>
              </div>
              
              <button onClick={checkVerificationStatus} disabled={loading} style={{ background: '#F2F2F7', color: '#1A1A2E', border: 'none', fontWeight: '800', cursor: 'pointer', padding: '16px 24px', borderRadius: '16px', fontSize: '15px', width: '100%', transition: 'background 0.2s' }}>
                {loading ? 'Checking...' : '↻ Check Status'}
              </button>

              <span onClick={handleLogout} style={{ color: '#A86423', fontSize: '13px', cursor: 'pointer', marginTop: '20px', fontWeight: '700' }}>
                Use a different account
              </span>
            </div>
          )}

         {/* ================= STEP 4: REJECTED SCREEN 🔴 ================= */}
          {step === 'REJECTED' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0' }}>
              <div style={{ background: '#FEE2E2', padding: '16px 40px', borderRadius: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '20px', boxShadow: '0 8px 20px rgba(220, 38, 38, 0.15)' }}>
                <span style={{ fontSize: '32px' }}>❌</span>
              </div>
              <h2 style={{ color: '#1A1A2E', fontSize: '24px', margin: '0 0 10px 0', fontWeight: '900', letterSpacing: '-0.5px' }}>Application Rejected</h2>
              <p style={{ color: '#8E8E93', fontSize: '15px', textAlign: 'center', lineHeight: '1.5', margin: '0 0 20px 0', fontWeight: '500' }}>
                We're sorry, but your vendor application has been declined. You can update your details and re-apply.
              </p>
              
              <div style={{ background: '#F2F2F7', padding: '8px 16px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '25px' }}>
                <div style={{ width: '8px', height: '8px', background: '#DC2626', borderRadius: '50%', boxShadow: '0 0 5px rgba(220, 38, 38, 0.6)' }}></div>
                <span style={{ fontSize: '12px', color: '#8E8E93', fontWeight: '600' }}>Logged in as <b style={{color: '#1A1A2E'}}>{googleData.email}</b></span>
              </div>

              <button 
                onClick={() => setStep('FORM')} 
                style={{ background: '#1A1A2E', color: '#FFF', border: 'none', fontWeight: '800', cursor: 'pointer', padding: '16px 24px', borderRadius: '16px', fontSize: '15px', width: '100%', transition: 'background 0.2s', marginTop: '10px' }}
              >
                Update Details & Re-apply
              </button>

              <button 
                onClick={handleLogout} 
                style={{ background: 'transparent', color: '#DC2626', border: '1px solid #DC2626', fontWeight: '800', cursor: 'pointer', padding: '14px 24px', borderRadius: '16px', fontSize: '14px', width: '100%', marginTop: '15px' }}
              >
                Use a different account
              </button>
            </div>
          )}

        </div>
        
        <p style={{textAlign:'center', marginTop:'30px'}}>
          <span style={{color: '#8E8E93', cursor:'pointer', fontSize:'14px', fontWeight: '700', padding: '10px'}} onClick={() => navigate('/')}>
            ← Back to Customer App
          </span>
        </p>
        
      </div>
    </div>
  );
};

export default AuthScreen;