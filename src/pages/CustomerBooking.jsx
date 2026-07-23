import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import SmartLogo from '../components/SmartLogo';
import { Store, Clock, Monitor, Stethoscope, Scissors } from 'lucide-react';

import GlobalSidebar from '../components/GlobalSidebar';

const API_BASE = 'https://qzkip-backend.onrender.com/api';
const QUEUE_URL = `${API_BASE}/queue`;

const CustomerBooking = () => {
  const { qrId } = useParams();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [googleUID, setGoogleUID] = useState('');

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [shopStats, setShopStats] = useState({ name: 'Loading Shop...', count: 0, type: '', avgTime: 5 });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const savedUID = localStorage.getItem('googleUID');
    const savedName = localStorage.getItem('customerName');

    if (savedUID) {
      setGoogleUID(savedUID);
      setName(savedName || 'Walk-in');
      setStep(3);
    } else {
      setStep(1);
    }
  }, []);

  useEffect(() => {
    axios.get(`${QUEUE_URL}/public-status/${qrId}`)
      .then(res => {
        setShopStats({
          name: res.data.shop_name || 'Shop Name Missing',
          count: res.data.full_queue ? res.data.full_queue.filter(q => q.status === 'waiting').length : 0,
          type: res.data.shop_type || '',
          avgTime: res.data.avgWaitTime || 5
        });
      })
      .catch(e => {
        console.error("Stats load error:", e);
        setShopStats({ name: 'Shop Not Found', count: 0, type: '', avgTime: 5 });
      });
  }, [qrId]);

  // ==========================================
  // 1. Google Login Handler (UPDATED WITH EMAIL)
  // ==========================================
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      googleProvider.setCustomParameters({
        prompt: 'select_account'
      });
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      setGoogleUID(user.uid);
      setName(user.displayName || 'Customer');
      
      // 🟢 FIX: Yahan email save ho raha hai taaki Sidebar read kar sake!
      localStorage.setItem('customerEmail', user.email);

      setStep(3);
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setError(null);
      } else {
        setError("Google Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 2. Execute Booking Handler
  const executeBooking = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        qr_id: qrId,
        customer_name: name || 'Walk-in',
        googleUID: googleUID
      };

      const res = await axios.post(`${QUEUE_URL}/generate-token`, payload);

      if (res.data.success) {
        localStorage.setItem('googleUID', googleUID);
        localStorage.setItem('customerName', name);
        localStorage.setItem(`myToken_${qrId}`, res.data.token_number);

        navigate(`/track/${qrId}`, { replace: true });
      }
    } catch (e) {
      setError(e.response?.data?.message || "Booking failed.");
      setLoading(false);
    }
  };

  const getShopStyle = (type) => {
    const safeType = (type || '').toLowerCase().trim();
    switch (safeType) {
      case 'clinic': return { icon: <Stethoscope size={32} color="#007AFF" />, bg: '#E5F1FF', shadow: 'rgba(0, 122, 255, 0.15)' };
      case 'barber': return { icon: <Scissors size={32} color="#FF9500" />, bg: '#FFF4E5', shadow: 'rgba(255, 149, 0, 0.15)' };
      case 'cyber cafe': return { icon: <Monitor size={32} color="#AF52DE" />, bg: '#F4E5FF', shadow: 'rgba(175, 82, 222, 0.15)' };
      default: return { icon: <Store size={32} color="#1A1A2E" />, bg: '#F8D548', shadow: 'rgba(248, 213, 72, 0.2)' };
    }
  };

  const shopStyle = getShopStyle(shopStats.type);

  return (
    <div style={{ background: '#F8F7F3', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}>

      <style>{`
        .smart-header {
          background: linear-gradient(135deg, #A86423 0%, #754B1A 100%);
          padding: 20px 5% 20px 5%;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          width: 100%;
          box-sizing: border-box;
        }
        @media (max-width: 768px) {
          .smart-header {
            padding: 20px 20px 20px 20px;
          }
        }
      `}</style>

      <GlobalSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Responsive Full-Width Header */}
      <div className="smart-header">
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div
            onClick={() => navigate('/')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          >
            <SmartLogo size={30} />
            <h1 style={{ margin: 0, fontSize: '22px', color: '#ffffff', fontWeight: '800', letterSpacing: '-0.5px' }}>Qzkip</h1>
          </div>
          <button
            className="menu-icon-btn"
            onClick={() => setIsSidebarOpen(true)}
          >
            ☰
          </button>        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', paddingBottom: '100px', boxSizing: 'border-box' }}>

        {/* Page Title */}
        <div style={{ width: '100%', maxWidth: '420px', marginBottom: '20px', textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '28px', color: '#1A1A2E', fontWeight: '900', letterSpacing: '-0.5px' }}>Token Booking</h2>
        </div>

        {step === 3 ? (
          /* UI - Step 3: Confirmation Screen */
          <div style={{ width: '100%', maxWidth: '420px' }}>
            <div style={{ background: '#fff', textAlign: 'center', padding: '40px 25px', borderRadius: '32px', boxShadow: '0 12px 40px rgba(0,0,0,0.06)', position: 'relative', overflow: 'hidden' }}>

              <div style={{ position: 'absolute', top: '0px', left: '50%', transform: 'translateX(-50%)', width: '150px', height: '150px', background: shopStyle.bg, filter: 'blur(100px)', opacity: 0.6, zIndex: 0 }}></div>

              <div style={{ position: 'relative', zIndex: 1 }}>
                {/* Dynamic Icon Bubble */}
                <div style={{ width: '75px', height: '75px', background: shopStyle.bg, borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', boxShadow: `0 8px 24px ${shopStyle.shadow}` }}>
                  {shopStyle.icon}
                </div>

                <div>
                  <h2 style={{ color: '#1a1a2e', margin: '0 0 12px 0', fontSize: '26px', fontWeight: '900', letterSpacing: '-0.5px' }}>{shopStats.name}</h2>

                  {/* Count and Time Box */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#F2F2F7', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', color: '#555', fontWeight: '600' }}>
                    <Clock size={14} color="#8E8E93" />
                    <span><b>{shopStats.count}</b> in line</span>
                    <span style={{ color: '#C7C7CC' }}>•</span>
                    <span>~{shopStats.count * (shopStats.avgTime || 5)} min wait</span>
                  </div>
                </div>

                <div style={{ marginTop: '40px', paddingBottom: '20px' }}>
                  <p style={{ fontSize: '17px', color: '#1a1a2e', fontWeight: '800', margin: 0, letterSpacing: '-0.3px' }}>Ready to join the queue?</p>
                </div>

                {error && <p style={{ color: '#ff3b30', fontSize: '13px', marginBottom: '15px', fontWeight: '600', padding: '10px', background: '#FEE', borderRadius: '10px' }}>{error}</p>}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button onClick={executeBooking} disabled={loading} style={{ width: '100%', background: 'linear-gradient(135deg, #10E671 0%, #00C853 100%)', color: '#fff', border: 'none', padding: '18px', borderRadius: '20px', fontSize: '16px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 10px 25px rgba(16, 230, 113, 0.35)', transition: 'transform 0.1s' }}>
                    {loading ? 'Joining...' : 'Yes, Join Queue'}
                  </button>

                  <button onClick={() => navigate(-1)} disabled={loading} style={{ width: '100%', background: 'transparent', color: '#FF3B30', border: 'none', padding: '16px', borderRadius: '20px', fontSize: '15px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}>
                    No, Cancel
                  </button>
                </div>

                {/* Minimal Account Switcher */}
                <div style={{ marginTop: '25px', borderTop: '1px solid #F0F0F5', paddingTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <p style={{ fontSize: '12px', color: '#8E8E93', margin: 0, fontWeight: '500' }}>Logged in as <span style={{ color: '#1A1A2E', fontWeight: '700' }}>{name}</span></p>
                  <span style={{ fontSize: '12px', color: '#007aff', cursor: 'pointer', fontWeight: '700' }}
                    onClick={() => {
                      localStorage.removeItem('googleUID');
                      localStorage.removeItem('customerName');
                      localStorage.removeItem('customerEmail'); // 🟢 Clean Email on switch
                      setName(''); setGoogleUID('');
                      setStep(1);
                    }}
                  >
                    Switch Account
                  </span>
                </div>
              </div>
            </div>
          </div>

        ) : (
          /* UI - Step 1: Google Authentication */
          <div style={{ width: '100%', maxWidth: '380px' }}>
            <div style={{ padding: '40px 25px', borderRadius: '32px', background: '#ffffff', boxShadow: '0 12px 40px rgba(0,0,0,0.06)' }}>
              <p style={{ textAlign: 'center', marginBottom: '25px', color: '#A86423', fontSize: '12px', fontWeight: '800', letterSpacing: '1px', margin: '0 0 20px 0' }}>BOOKING AUTHENTICATION</p>

              {error && <p style={{ color: '#ff3b30', fontSize: '13px', textAlign: 'center', marginBottom: '15px', background: '#FEE', padding: '10px', borderRadius: '10px', fontWeight: '600' }}>{error}</p>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <h2 style={{ textAlign: 'center', color: '#1A1A2E', margin: '0 0 15px 0', fontSize: '26px', fontWeight: '900', letterSpacing: '-0.5px' }}>Secure Login</h2>

                <button onClick={handleGoogleLogin} disabled={loading} style={{ background: '#1A1A2E', color: '#fff', padding: '16px', borderRadius: '20px', fontWeight: '700', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '15px', boxShadow: '0 8px 24px rgba(26,26,46,0.2)' }}>
                  {loading ? 'Please wait...' : (
                    <>
                      <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                      </svg>
                      Continue with Google
                    </>
                  )}
                </button>
                <p style={{ textAlign: 'center', fontSize: '12px', color: '#8E8E93', margin: '15px 0 0 0', fontWeight: '500' }}>
                  We use Google to keep your queue safe and spam-free.
                </p>
              </div>
            </div>
          </div>
        )}

        <p style={{ textAlign: 'center', marginTop: '30px' }}>
          <span style={{ color: '#8E8E93', cursor: 'pointer', fontSize: '14px', fontWeight: '700', padding: '10px' }} onClick={() => navigate('/')}>
            ← Back to Customer App
          </span>
        </p>

      </div>
    </div>
  );
};

export default CustomerBooking;