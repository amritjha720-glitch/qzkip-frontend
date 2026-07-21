import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import GlobalSidebar from '../components/GlobalSidebar';
import CustomPopup from '../components/CustomPopup';
import { Clock, Users, Ticket, XCircle } from 'lucide-react';
import SmartLogo from '../components/SmartLogo';

const BACKEND_BASE = 'http://localhost:5000';
const QUEUE_URL = `${BACKEND_BASE}/api/queue`;



const CustomerTracking = () => {
  const { qrId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const [showCancelPopup, setShowCancelPopup] = useState(false);
  const [myTokenNum, setMyTokenNum] = useState(localStorage.getItem(`myToken_${qrId}`));
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const [lastFetchTime, setLastFetchTime] = useState(Date.now());
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  const fetchStatus = async () => {
    try {
      const res = await axios.get(`${QUEUE_URL}/public-status/${qrId}`);
      setData(res.data);

      setLastFetchTime(Date.now());
      setElapsedMinutes(0);

      const identifier = localStorage.getItem('googleUID') || localStorage.getItem('customerPhone');
      if (identifier) {
        const histRes = await axios.get(`${QUEUE_URL}/customer-history/${identifier}`);

        // Fix: Tracking all active queue statuses (waiting, processing, skipped)
        const active = histRes.data.history.find(h =>
          String(h.qr_id) === String(qrId) && ['waiting', 'processing', 'skipped'].includes(h.status)
        );

        if (active) {
          setMyTokenNum(active.token_number);
          localStorage.setItem(`myToken_${qrId}`, active.token_number);
        }
      }
      setError(null);
    } catch (e) {
      setError(e.response?.data?.message || "Server error");
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const passed = Math.floor((Date.now() - lastFetchTime) / 60000);
      setElapsedMinutes(passed);
    }, 10000);

    return () => clearInterval(timer);
  }, [lastFetchTime]);

  useEffect(() => {
    const restoreToken = async () => {
      const phone = localStorage.getItem('customerPhone');
      const storedToken = localStorage.getItem(`myToken_${qrId}`);

      if (!storedToken && phone) {
        try {
          const res = await axios.get(`${QUEUE_URL}/customer-history/${phone}`);
          const active = res.data.history.find(h =>
            h.qr_id === qrId && ['waiting', 'processing', 'skipped'].includes(h.status)
          );

          if (active) {
            localStorage.setItem(`myToken_${qrId}`, active.token_number);
            window.location.reload();
          }
        } catch (e) {
          console.log("Recovery failed");
        }
      }
    };

    fetchStatus();
    restoreToken();

    const socket = io(BACKEND_BASE);
    socket.on(`vendor_${qrId}`, () => fetchStatus());
    socket.on('queueUpdate', () => fetchStatus());
    return () => socket.disconnect();
  }, [qrId]);

  const confirmCancelToken = async () => {
    const phone = localStorage.getItem('customerPhone');
    try {
      await axios.post(`${QUEUE_URL}/cancel-token`, {
        qr_id: qrId, token_number: myTokenNum, customer_phone: phone
      });
      localStorage.removeItem(`myToken_${qrId}`);
      setShowCancelPopup(false);
      navigate('/', { replace: true });
    } catch (error) {
      alert(error.response?.data?.message || "Error occurred during cancellation");
      setShowCancelPopup(false);
    }
  };

  if (error) return <div style={{ textAlign: 'center', padding: '50px', color: '#FF3B30', fontWeight: '700', fontFamily: 'sans-serif' }}><h3>Warning: {error}</h3></div>;
  if (!data) return <div style={{ textAlign: 'center', padding: '50px', color: '#8E8E93', fontFamily: 'sans-serif' }}><h3>Loading Live Data...</h3></div>;

  let peopleAhead = 0;
  let myStatus = 'waiting';
  const isSomeoneProcessing = data.full_queue.some(q => q.status === 'processing');

  if (myTokenNum) {
    const myItem = data.full_queue.find(q => q.token_number === Number(myTokenNum));
    if (myItem) {
      myStatus = myItem.status;
      peopleAhead = data.full_queue.filter(q => q.status === 'waiting' && q.token_number < Number(myTokenNum)).length;
    } else {
      myStatus = 'completed';
    }
  }

  // Fixed countdown logic: Time is displayed only for 'waiting' status
  let displayWaitTime = 0;
  if (myStatus === 'waiting') {
    let estimatedWait = (peopleAhead + (isSomeoneProcessing ? 1 : 0)) * (data.avgWaitTime || 5);
    displayWaitTime = estimatedWait - elapsedMinutes;
    if (displayWaitTime < 0) displayWaitTime = 0;
  }

  const brandDark = '#A86423';
  const brandLight = '#F9F3EA';
  const glowShadow = '0 16px 40px rgba(168, 100, 35, 0.08)';

  // Status badge configuration (Colors and Text)
  let badgeConfig = { bg: brandLight, border: 'rgba(168, 100, 35, 0.15)', color: brandDark, text: 'Waiting in queue...' };

  if (myStatus === 'processing') {
    badgeConfig = { bg: '#E8F8F0', border: '#B7E4C7', color: '#34C759', text: "IT'S YOUR TURN!" };
  } else if (myStatus === 'completed') {
    badgeConfig = { bg: '#1A1A2E', border: '#1A1A2E', color: '#ffffff', text: 'Completed' };
  } else if (myStatus === 'skipped') {
    badgeConfig = { bg: '#FEE', border: '#FFD1D1', color: '#FF3B30', text: 'Skipped' };
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#F8F7F3', display: 'flex', flexDirection: 'column',
      alignItems: 'center', margin: '0 auto', width: '100%', boxSizing: 'border-box',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>

      {/* CSS Override: Responsive Header */}
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

      {showCancelPopup && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px'
        }}>
          <div style={{
            background: '#ffffff', padding: '30px 25px', borderRadius: '32px',
            width: '100%', maxWidth: '320px', textAlign: 'center',
            boxShadow: '0 24px 48px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ background: 'rgba(255, 59, 48, 0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px auto' }}>
              <XCircle size={32} color="#FF3B30" />
            </div>
            <h3 style={{ margin: '0 0 10px 0', color: '#1C1C1E', fontSize: '20px', fontWeight: '800' }}>Leave Queue?</h3>
            <p style={{ margin: '0 0 25px 0', fontSize: '15px', color: '#8E8E93', lineHeight: '1.4' }}>You will lose your spot and have to generate a new token.</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowCancelPopup(false)} style={{ flex: 1, padding: '16px', background: '#F2F2F7', border: 'none', borderRadius: '20px', color: '#1C1C1E', fontWeight: '700', cursor: 'pointer', fontSize: '15px', transition: 'all 0.2s' }}>Stay</button>
              <button onClick={confirmCancelToken} style={{ flex: 1, padding: '16px', background: '#FF3B30', border: 'none', borderRadius: '20px', color: '#fff', fontWeight: '700', cursor: 'pointer', fontSize: '15px', boxShadow: '0 8px 20px rgba(255,59,48,0.3)', transition: 'all 0.2s' }}>Leave</button>
            </div>
          </div>
        </div>
      )}

      {/* Responsive Full-Width Header */}
      <div className="smart-header">
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
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

      <div style={{ width: '100%', maxWidth: '420px', margin: '0 auto', padding: '0 20px', boxSizing: 'border-box', flex: 1, display: 'flex', flexDirection: 'column' }}>

        <div style={{ margin: '30px 0 20px 0', textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '28px', color: '#1A1A2E', fontWeight: '900', letterSpacing: '-0.5px' }}>Token Tracking</h2>
          <p style={{ margin: '6px 0 0 0', fontSize: '15px', color: '#8E8E93', fontWeight: '600' }}>{data.shop_name}</p>
        </div>

        <div style={{
          background: '#ffffff',
          width: '100%', borderRadius: '32px', padding: '35px 20px', textAlign: 'center',
          boxShadow: glowShadow,
          border: '1px solid rgba(168, 100, 35, 0.1)',
          marginBottom: '20px', position: 'relative', boxSizing: 'border-box'
        }}>
          {myTokenNum ? (
            <>
              <div style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginBottom: '15px', background: brandLight, padding: '8px 16px', borderRadius: '14px' }}>
                <Ticket size={16} color={brandDark} />
                <p style={{ margin: 0, fontSize: '11px', fontWeight: '800', color: brandDark, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Your Token</p>
              </div>

              <h1 style={{
                fontSize: '90px', fontWeight: '900', margin: '0 0 5px 0',
                background: `linear-gradient(135deg, ${brandDark} 0%, #D4904C 100%)`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                lineHeight: '1.1', letterSpacing: '-3px'
              }}>
                #{myTokenNum}
              </h1>

              {myStatus === 'waiting' && (
                <p style={{ color: '#1A1A2E', fontSize: '15px', fontWeight: '700', margin: '0 0 25px 0' }}>You are {peopleAhead + 1}st in line</p>
              )}
              {myStatus !== 'waiting' && <div style={{ height: '20px', marginBottom: '25px' }}></div>}

              {/* Dynamic Status Badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 28px', borderRadius: '100px',
                background: badgeConfig.bg,
                border: `1px solid ${badgeConfig.border}`,
                color: badgeConfig.color, fontSize: '14px', fontWeight: '800', letterSpacing: '0.5px'
              }}>
                {myStatus === 'processing' && <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#34C759', borderRadius: '50%', boxShadow: '0 0 10px #34C759' }}></span>}
                {badgeConfig.text}
              </div>
            </>
          ) : (
            <div style={{ padding: '20px 0' }}>
              <div style={{ background: brandLight, width: '80px', height: '80px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                <Ticket size={36} color={brandDark} />
              </div>
              <h3 style={{ margin: '0 0 10px 0', color: '#1A1A2E', fontSize: '22px', fontWeight: '900', letterSpacing: '-0.5px' }}>No Active Token</h3>
              <p style={{ margin: '0 0 35px 0', fontSize: '15px', color: '#8E8E93', lineHeight: '1.5' }}>You haven't joined the queue<br />for this shop yet.</p>
              <button onClick={() => navigate(`/book/${qrId}`)} style={{ width: '100%', padding: '18px', background: `linear-gradient(135deg, ${brandDark} 0%, #D4904C 100%)`, color: '#fff', border: 'none', borderRadius: '20px', fontWeight: '800', fontSize: '15px', cursor: 'pointer', boxShadow: '0 12px 30px rgba(168, 100, 35, 0.25)', transition: 'transform 0.2s' }}>
                Join Queue Now
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', width: '100%', marginTop: '5px', background: '#FFFFFF', borderRadius: '28px', boxShadow: '0 8px 24px rgba(0,0,0,0.03)', border: '1px solid #F0F0F5', padding: '25px 0' }}>

          <div style={{ flex: 1, textAlign: 'center', borderRight: '1.5px solid #F0F0F5', padding: '0 15px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <Users size={14} color="#8E8E93" />
              <p style={{ margin: 0, fontSize: '11px', color: '#8E8E93', fontWeight: '800', letterSpacing: '1px' }}>NOW SERVING</p>
            </div>
            <span style={{ fontSize: '38px', fontWeight: '900', color: '#1A1A2E', letterSpacing: '-1.5px' }}>
              {data.currently_serving ? `#${data.currently_serving}` : '--'}
            </span>
          </div>

          <div style={{ flex: 1, textAlign: 'center', padding: '0 15px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <Clock size={14} color="#8E8E93" />
              <p style={{ margin: 0, fontSize: '11px', color: '#8E8E93', fontWeight: '800', letterSpacing: '1px' }}>EST. WAIT</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
              <span style={{ fontSize: '38px', fontWeight: '900', color: '#1A1A2E', letterSpacing: '-1.5px' }}>
                {displayWaitTime}
              </span>
              <span style={{ fontSize: '15px', color: '#8E8E93', fontWeight: '800', marginLeft: '4px' }}>min</span>
            </div>
          </div>

        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', width: '100%', marginTop: 'auto', paddingTop: '30px', paddingBottom: '120px' }}>
          {myStatus === 'waiting' && myTokenNum && (
            <button onClick={() => setShowCancelPopup(true)} style={{ background: 'transparent', color: '#FF3B30', border: '1.5px solid #FEE', padding: '16px 24px', borderRadius: '20px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', transition: 'all 0.2s' }}>
              <XCircle size={18} /> Cancel My Token
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerTracking;