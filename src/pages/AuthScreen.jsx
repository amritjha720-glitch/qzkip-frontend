/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomPopup from "../components/CustomPopup";
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signOut } from 'firebase/auth'; 
import SmartLogo from '../components/SmartLogo';
import axios from 'axios';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { MapPin, Store, FileText, Phone, CheckCircle2, AlertCircle, Loader2, RefreshCcw, LogOut, ChevronRight, Clock } from 'lucide-react';

const API_URL = 'https://qzkip-backend.onrender.com/api/auth'; 

// ==========================================
// AUTH SCREEN COMPONENT (PREMIUM UI + GOLDEN HEADER)
// ==========================================
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
    shop_address: '',
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
    setCoords(null);

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
              title: 'Location Required', 
              message: 'Shop registration requires your exact location. Please allow GPS access in your browser settings and try again.', 
              type: 'alert', 
              confirmText: 'Got It' 
            });
          }
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
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
        setPopup({ isOpen: true, title: 'Login Failed', message: 'Google login failed. Please try again.', type: 'alert', confirmText: 'OK' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async () => {
    if (form.phone.length !== 10 || !form.shop_name || !form.document_number || form.shop_address.trim().length < 10) {
      return setPopup({ isOpen: true, title: 'Missing Fields', message: 'Please fill out all fields correctly. Ensure the shop address is complete.', type: 'alert', confirmText: 'OK' });
    }

    if (!coords) {
      return setPopup({ isOpen: true, title: 'Location Missing', message: 'We could not fetch your exact location. Please click "Retry" on the location box and allow GPS access.', type: 'alert', confirmText: 'OK' });
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
      const res = await axios.post(`${API_URL}/google`, { googleUID: googleData.googleUID, email: googleData.email }, config);
      
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
    try { await axios.post(`${API_URL}/logout`, {}, config); } catch (e) {}
    setStep('LOGIN'); 
    setGoogleData({googleUID: '', email: '', name: ''});
    localStorage.removeItem('vendorGoogleData');
    localStorage.removeItem('vendorToken');
    localStorage.removeItem('vendorEmail'); 
    localStorage.removeItem('vendorAuthStep'); 
    handleGoogleLogin(true); 
  };

  return (
    <HelmetProvider>
      <div style={{ minHeight: '100vh', background: '#F4F5F7', display: 'flex', flexDirection: 'column', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
        <Helmet>
          <title>Partner Portal | Qzkip</title>
          <style>{`
            .premium-input {
              width: 100%; padding: 16px 16px 16px 44px; border-radius: 12px;
              border: 1.5px solid #E5E7EB; background: #F9FAFB; font-size: 15px;
              outline: none; font-weight: 500; color: #111827; box-sizing: border-box;
              transition: all 0.2s ease;
            }
            .premium-input:focus {
              border-color: #A86423; background: #ffffff;
              box-shadow: 0 0 0 4px rgba(168, 100, 35, 0.1);
            }
            .input-group { position: relative; margin-bottom: 16px; }
            .input-icon {
              position: absolute; left: 14px; top: 16px; color: #9CA3AF;
              pointer-events: none; transition: color 0.2s ease;
            }
            .input-group:focus-within .input-icon { color: #A86423; }
            
            /* General Spin */
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            .animate-spin { animation: spin 1s linear infinite; }
            
            /* Button hover */
            .btn-hover { transition: transform 0.2s ease, box-shadow 0.2s ease; }
            .btn-hover:active { transform: scale(0.98); }

            /* Premium Pulse Animation */
            @keyframes pulse-ring {
              0% { transform: scale(0.85); opacity: 0.5; }
              100% { transform: scale(1.4); opacity: 0; }
            }
            .pulse-bg {
              position: absolute; top: 0; left: 0; right: 0; bottom: 0;
              border-radius: 50%; background: #F59E0B;
              animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
              z-index: 0;
            }
          `}</style>
        </Helmet>

        <CustomPopup config={popup} setConfig={setPopup} /> 

        {/* TOP NAVBAR */}
        <div style={{ 
          width: '100%', background: 'linear-gradient(135deg, #A86423 0%, #754B1A 100%)', 
          padding: '20px 24px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', boxSizing: 'border-box',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, zIndex: 50
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
        
        {/* MAIN CONTENT CONTAINER */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
          
          <div style={{ background: '#ffffff', width: '100%', maxWidth: '440px', borderRadius: '24px', padding: '40px 32px', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.08)', border: '1px solid #F3F4F6', boxSizing: 'border-box' }}>
            
            {/* ================= STEP 1: GOOGLE LOGIN ================= */}
            {step === 'LOGIN' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'center' }}>
                <div>
                  <div style={{ width: '64px', height: '64px', background: '#FFF7ED', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                    <Store size={32} color="#A86423" />
                  </div>
                  <h2 style={{ margin: '0 0 8px 0', color: '#111827', fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px' }}>Welcome back</h2>
                  <p style={{ margin: 0, color: '#6B7280', fontSize: '15px', fontWeight: '500' }}>Log in to manage your queue seamlessly.</p>
                </div>
                
                <button 
                  onClick={() => handleGoogleLogin(false)} 
                  disabled={loading} 
                  className="btn-hover"
                  style={{ background: '#111827', color: '#fff', padding: '16px', borderRadius: '16px', fontWeight: '600', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '15px', width: '100%' }}
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : (
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
                <div style={{ marginBottom: '24px' }}>
                  <h2 style={{ margin: '0 0 6px 0', color: '#111827', fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' }}>Complete Profile</h2>
                  <p style={{ margin: 0, color: '#6B7280', fontSize: '14px', fontWeight: '500' }}>Setup your business details to get started.</p>
                </div>
                
                <div style={{ marginBottom: '24px', borderRadius: '16px', border: '1.5px solid #E5E7EB', overflow: 'hidden', background: '#F9FAFB' }}>
                  
                  {locationStatus === 'locating' && (
                    <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ background: '#FFF7ED', padding: '12px', borderRadius: '50%' }}>
                        <Loader2 className="animate-spin" color="#A86423" size={24} />
                      </div>
                      <div>
                        <div style={{ color: '#111827', fontWeight: '700', fontSize: '15px' }}>Detecting Location...</div>
                        <div style={{ color: '#6B7280', fontSize: '13px', marginTop: '2px' }}>Please stay at your shop.</div>
                      </div>
                    </div>
                  )}

                  {locationStatus === 'found' && (
                    <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', background: '#F0FDF4', borderLeft: '4px solid #16A34A' }}>
                      <div style={{ background: '#DCFCE7', padding: '10px', borderRadius: '50%' }}>
                        <CheckCircle2 color="#16A34A" size={24} />
                      </div>
                      <div>
                        <div style={{ color: '#166534', fontWeight: '700', fontSize: '15px' }}>Location Secured</div>
                        <div style={{ color: '#15803D', fontSize: '13px', marginTop: '2px' }}>We've successfully verified your shop's position.</div>
                      </div>
                    </div>
                  )}

                  {locationStatus === 'denied' && (
                    <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', background: '#FEF2F2', borderLeft: '4px solid #DC2626' }}>
                      <div style={{ background: '#FEE2E2', padding: '10px', borderRadius: '50%' }}>
                        <AlertCircle color="#DC2626" size={24} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#991B1B', fontWeight: '700', fontSize: '15px' }}>GPS Disabled</div>
                        <div style={{ color: '#B91C1C', fontSize: '13px', marginTop: '2px' }}>Please allow access to continue.</div>
                      </div>
                      <button onClick={requestLocation} className="btn-hover" style={{ background: '#DC2626', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '12px' }}>
                        Retry
                      </button>
                    </div>
                  )}
                </div>

                <div className="input-group">
                  <Store className="input-icon" size={20} />
                  <input type="text" placeholder="Business Name" className="premium-input" value={form.shop_name} onChange={e => setForm({...form, shop_name: e.target.value})} />
                </div>
                
                <div className="input-group">
                  <MapPin className="input-icon" size={20} />
                  <textarea placeholder="Complete Address (e.g., Shop 5, Market)" className="premium-input" style={{ resize: 'none', height: '90px', padding: '16px 16px 16px 44px' }} value={form.shop_address} onChange={e => setForm({...form, shop_address: e.target.value})} />
                </div>
                
                <div className="input-group">
                  <select className="premium-input" style={{ paddingLeft: '16px', cursor: 'pointer' }} value={form.shop_type} onChange={e => setForm({...form, shop_type: e.target.value})}>
                    <option value="clinic">Health Clinic</option>
                    <option value="barber">Salon & Barber</option>
                    <option value="cyber cafe">Cyber Cafe</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div className="input-group" style={{ flex: '0.4' }}>
                    <select className="premium-input" style={{ paddingLeft: '16px' }} value={form.document_type} onChange={e => setForm({...form, document_type: e.target.value})}>
                      <option value="PAN">PAN</option>
                      <option value="GSTIN">GSTIN</option>
                      <option value="Shop License">License</option>
                    </select>
                  </div>
                  <div className="input-group" style={{ flex: '0.6' }}>
                    <FileText className="input-icon" size={20} />
                    <input type="text" placeholder="Document No." className="premium-input" style={{ textTransform: 'uppercase' }} value={form.document_number} onChange={e => setForm({...form, document_number: e.target.value})} />
                  </div>
                </div>
                
                <div className="input-group">
                  <Phone className="input-icon" size={20} />
                  <input type="tel" placeholder="WhatsApp Number" className="premium-input" value={form.phone} onChange={e => {
                      const onlyNums = e.target.value.replace(/\D/g, ''); 
                      if (onlyNums.length <= 10) setForm({...form, phone: onlyNums});
                  }}/>
                </div>

                <button 
                  onClick={handleFormSubmit} disabled={loading} className="btn-hover"
                  style={{ background: '#A86423', color: '#fff', border: 'none', padding: '18px', borderRadius: '16px', fontWeight: '700', marginTop: '10px', cursor: 'pointer', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <>Complete Registration <ChevronRight size={18}/></>}
                </button>
                
                <div onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#6B7280', fontSize: '13px', cursor: 'pointer', marginTop: '24px', fontWeight: '600' }}>
                  <LogOut size={14} /> Use a different account
                </div>
              </div>
            )}

            {/* ================= STEP 3: PENDING (WITH SPINNING REFRESH) ================= */}
            {step === 'PENDING' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0', textAlign: 'center' }}>
                
                <div style={{ position: 'relative', marginBottom: '32px', width: '96px', height: '96px' }}>
                  <div className="pulse-bg"></div>
                  <div style={{ background: '#FFF7ED', width: '100%', height: '100%', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 10 }}>
                    <Clock color="#F59E0B" size={44} />
                  </div>
                </div>

                <h2 style={{ color: '#111827', fontSize: '24px', margin: '0 0 12px 0', fontWeight: '800' }}>Under Review</h2>
                
                {googleData.email && (
                  <div style={{ background: '#F3F4F6', padding: '6px 16px', borderRadius: '20px', marginBottom: '24px', border: '1px solid #E5E7EB' }}>
                    <span style={{ color: '#4B5563', fontSize: '13px', fontWeight: '700' }}>{googleData.email}</span>
                  </div>
                )}

                <p style={{ color: '#6B7280', fontSize: '14px', margin: '0 0 32px 0', lineHeight: '1.5' }}>Your application has been submitted successfully and is currently being reviewed by our team.</p>
                
                {/* 🟢 NEW: Refresh button with spinning animation when loading = true */}
                <button 
                  onClick={checkVerificationStatus} 
                  disabled={loading}
                  className="btn-hover" 
                  style={{ background: '#111827', color: '#fff', border: 'none', fontWeight: '700', cursor: 'pointer', padding: '16px 24px', borderRadius: '16px', fontSize: '14px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <RefreshCcw size={18} className={loading ? "animate-spin" : ""} /> 
                  {loading ? 'Refreshing...' : 'Refresh Status'}
                </button>

                <div onClick={handleLogout} style={{ color: '#A86423', fontSize: '13px', cursor: 'pointer', marginTop: '24px', fontWeight: '700' }}>
                  Log out of this account
                </div>
              </div>
            )}

            {/* ================= STEP 4: REJECTED ================= */}
            {step === 'REJECTED' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0', textAlign: 'center' }}>
                <div style={{ background: '#FEE2E2', width: '96px', height: '96px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', marginBottom: '24px' }}>
                  <AlertCircle color="#DC2626" size={48} />
                </div>
                
                <h2 style={{ color: '#111827', fontSize: '24px', margin: '0 0 12px 0', fontWeight: '800' }}>Application Rejected</h2>
                
                {googleData.email && (
                  <div style={{ background: '#FEF2F2', padding: '6px 16px', borderRadius: '20px', marginBottom: '24px', border: '1px solid #FECACA' }}>
                    <span style={{ color: '#991B1B', fontSize: '13px', fontWeight: '700' }}>{googleData.email}</span>
                  </div>
                )}

                <p style={{ color: '#6B7280', fontSize: '14px', margin: '0 0 32px 0', lineHeight: '1.5' }}>There was an issue with the details provided. Please review and update your information.</p>
                
                <button onClick={() => setStep('FORM')} className="btn-hover" style={{ background: '#111827', color: '#FFF', border: 'none', fontWeight: '700', cursor: 'pointer', padding: '16px 24px', borderRadius: '16px', fontSize: '14px', width: '100%' }}>
                  Update Details & Re-apply
                </button>

                <div onClick={handleLogout} style={{ color: '#A86423', fontSize: '13px', cursor: 'pointer', marginTop: '24px', fontWeight: '700' }}>
                  Log out of this account
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </HelmetProvider>
  );
};

export default AuthScreen;