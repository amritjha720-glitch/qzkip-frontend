/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomPopup from "../components/CustomPopup";
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signOut } from 'firebase/auth'; 
import SmartLogo from '../components/SmartLogo';
import axios from 'axios';
import { Helmet, HelmetProvider } from 'react-helmet-async';

// 🟢 NEW: Leaflet Map Imports for Exact Pinpoint Location
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// 🟢 FIX: Leaflet default marker icons in React
const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const API_URL = 'https://qzkip-backend.onrender.com/api/auth'; 

// 🟢 NEW: Map Click Component (Allows user to move the pin exactly)
const LocationPicker = ({ coords, setCoords }) => {
  useMapEvents({
    click(e) {
      setCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });
  return coords ? <Marker position={[coords.lat, coords.lng]} icon={customIcon} /> : null;
};

const AuthScreen = () => {
  const navigate = useNavigate();
  
  const [step, setStep] = useState('LOGIN'); 
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState({ isOpen: false }); 
  
  const [googleData, setGoogleData] = useState(() => {
    const savedData = localStorage.getItem('vendorGoogleData');
    return savedData ? JSON.parse(savedData) : { googleUID: '', email: '', name: '' };
  });
  
  const [form, setForm] = useState({ 
    phone: '', 
    shop_name: '', 
    shop_address: '', // 🟢 Manual Address Field
    document_type: 'PAN',
    document_number: '',
    shop_type: 'clinic' 
  });

  const [locationStatus, setLocationStatus] = useState('idle'); 
  const [coords, setCoords] = useState(null);

  const config = { withCredentials: true };

  useEffect(() => {
    if (localStorage.getItem('vendorToken')) navigate('/dashboard');
  }, [navigate]);

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

  useEffect(() => {
    if (step === 'FORM') {
      requestLocation();
    }
  }, [step]);

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

  const handleFormSubmit = async () => {
    if (form.phone.length !== 10 || !form.shop_name || !form.document_number || form.shop_address.trim().length < 10) {
      return setPopup({ 
        isOpen: true, 
        title: 'Missing Fields', 
        message: 'Please fill out all fields correctly. Ensure the shop address is complete.', 
        type: 'alert', 
        confirmText: 'OK' 
      });
    }

    if (!coords) {
      return setPopup({ 
        isOpen: true, 
        title: 'Location Missing', 
        message: 'Please allow GPS access and pin your exact location on the map before submitting.', 
        type: 'alert', 
        confirmText: 'OK' 
      });
    }
    
    setLoading(true);
    try {
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
    <HelmetProvider>
      <div style={{ minHeight: '100vh', background: '#F8F7F3', display: 'flex', flexDirection: 'column', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
        
        <Helmet>
          <title>Vendor Portal | Qzkip</title>
          {/* 🟢 Leaflet CSS is strictly required for the map to display correctly */}
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        </Helmet>

        <CustomPopup config={popup} setConfig={setPopup} /> 

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
              </div>
            )}

            {/* ================= STEP 2: KYC FORM ================= */}
            {step === 'FORM' && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <h2 style={{ margin: '0 0 5px 0', color: '#1A1A2E', fontSize: '24px', fontWeight: '900', letterSpacing: '-0.5px' }}>Complete Profile</h2>
                  <p style={{ margin: 0, color: '#8E8E93', fontSize: '13px', fontWeight: '500' }}>Setup your shop details to get started</p>
                </div>
                
                {locationStatus === 'locating' && (
                  <div style={{ marginBottom: '15px', padding: '12px', borderRadius: '12px', background: '#FFF4E5', border: '1px solid #FFD8A8', textAlign: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#B45309', fontWeight: '700' }}>⏳ Detecting your GPS location...</span>
                  </div>
                )}
                
                {locationStatus === 'denied' && (
                  <div onClick={requestLocation} style={{ marginBottom: '15px', padding: '12px', borderRadius: '12px', background: '#FEF2F2', border: '1px solid #FECACA', textAlign: 'center', cursor: 'pointer' }}>
                    <span style={{ fontSize: '12px', color: '#B91C1C', fontWeight: '700' }}>📍 GPS denied. <span style={{textDecoration: 'underline'}}>Tap to retry</span></span>
                  </div>
                )}

                {/* 🟢 NEW: Exact Pin Point Map (Zomato/Swiggy Style) */}
                {coords && (
                  <div style={{ marginBottom: '20px', borderRadius: '16px', overflow: 'hidden', border: '2px solid #A86423', boxShadow: '0 4px 12px rgba(168, 100, 35, 0.15)' }}>
                    <div style={{ padding: '10px 12px', background: '#FDF8F2', fontSize: '12px', fontWeight: '800', color: '#A86423', textAlign: 'center', borderBottom: '1px solid #F0D9C1' }}>
                      📍 Tap on the map to set EXACT shop pin
                    </div>
                    {/* The Map itself */}
                    <MapContainer 
                      center={[coords.lat, coords.lng]} 
                      zoom={17} 
                      style={{ height: '220px', width: '100%', zIndex: 0 }}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <LocationPicker coords={coords} setCoords={setCoords} />
                    </MapContainer>
                  </div>
                )}

                <input type="text" placeholder="Shop Name" style={inputStyle} value={form.shop_name} onChange={e => setForm({...form, shop_name: e.target.value})} />
                
                <textarea 
                  placeholder="Complete Shop Address (e.g., Shop No. 5, Main Market)" 
                  style={{ ...inputStyle, resize: 'none', height: '80px', fontFamily: 'inherit' }} 
                  value={form.shop_address} 
                  onChange={e => setForm({...form, shop_address: e.target.value})} 
                />
                
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

                <button onClick={handleFormSubmit} disabled={loading} style={{ background: 'linear-gradient(135deg, #A86423 0%, #754B1A 100%)', color: '#fff', border: 'none', padding: '18px', borderRadius: '16px', fontWeight: '800', marginTop: '5px', cursor: 'pointer', fontSize: '16px', boxShadow: '0 8px 24px rgba(168, 100, 35, 0.25)', transition: 'transform 0.2s' }}>
                  {loading ? 'Submitting...' : 'Submit Exact Location & Details'}
                </button>
                
                <span onClick={handleLogout} style={{ textAlign: 'center', color: '#A86423', fontSize: '13px', cursor: 'pointer', marginTop: '20px', fontWeight: '700' }}>
                  Cancel & Use a different account
                </span>
              </div>
            )}

            {step === 'PENDING' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0' }}>
                <div style={{ background: '#FFF4E5', padding: '16px 40px', borderRadius: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '20px' }}>
                  <span style={{ fontSize: '32px' }}>⏳</span>
                </div>
                <h2 style={{ color: '#1A1A2E', fontSize: '24px', margin: '0 0 10px 0', fontWeight: '900' }}>Under Review</h2>
                <button onClick={checkVerificationStatus} style={{ background: '#F2F2F7', color: '#1A1A2E', border: 'none', fontWeight: '800', cursor: 'pointer', padding: '16px 24px', borderRadius: '16px', fontSize: '15px', width: '100%', marginTop: '20px' }}>
                  ↻ Check Status
                </button>
              </div>
            )}

            {step === 'REJECTED' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0' }}>
                <div style={{ background: '#FEE2E2', padding: '16px 40px', borderRadius: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '20px' }}>
                  <span style={{ fontSize: '32px' }}>❌</span>
                </div>
                <h2 style={{ color: '#1A1A2E', fontSize: '24px', margin: '0 0 10px 0', fontWeight: '900' }}>Application Rejected</h2>
                <button onClick={() => setStep('FORM')} style={{ background: '#1A1A2E', color: '#FFF', border: 'none', fontWeight: '800', cursor: 'pointer', padding: '16px 24px', borderRadius: '16px', fontSize: '15px', width: '100%', marginTop: '20px' }}>
                  Update Details & Re-apply
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </HelmetProvider>
  );
};

export default AuthScreen;