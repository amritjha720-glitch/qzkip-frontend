import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import CustomPopup from '../components/CustomPopup';
import GlobalSidebar from '../components/GlobalSidebar';
import SmartLogo from '../components/SmartLogo';

const QUEUE_URL = 'https://qzkip-backend.onrender.com/api/queue';



const MyBookings = () => {
  const navigate = useNavigate();
  const [activeBookings, setActiveBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState({ isOpen: false });
  const [timerTrigger, setTimerTrigger] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [uid, setUid] = useState(localStorage.getItem('googleUID'));
  const previousStatusRef = useRef({});

  const playNotificationSound = () => {
    const audio = new Audio('/alert.mp3');
    audio.play().catch(error => console.log("Sound blocked by browser policy", error));
  };

  const fetchBookings = () => {
    const identifier = uid || localStorage.getItem('customerPhone');
    if (!identifier) return;

    axios.get(`${QUEUE_URL}/customer-history/${identifier}`)
      .then(res => {
        if (res.data && res.data.history) {
          const today = new Date().toDateString();

          const active = res.data.history.filter(h => {
            const isToday = new Date(h.createdAt).toDateString() === today;
            const isActiveStatus = ['waiting', 'processing', 'skipped', 'cancelled_by_vendor'].includes(h.status);
            return isToday && isActiveStatus;
          });

          active.forEach(booking => {
            const oldStatus = previousStatusRef.current[booking._id];
            const newStatus = booking.status;

            if (oldStatus && oldStatus !== newStatus) {
              if (newStatus === 'processing' || newStatus === 'cancelled_by_vendor') {
                playNotificationSound();
              }
            }
            previousStatusRef.current[booking._id] = newStatus;
          });

          setActiveBookings(active);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (!uid) {
      setPopup({
        isOpen: true,
        type: 'auth',
        onSuccess: () => setUid(localStorage.getItem('googleUID'))
      });
      setLoading(false);
      return;
    }

    fetchBookings();
    const socket = io('https://qzkip-backend.onrender.com');
    socket.onAny(() => fetchBookings());
    const interval = setInterval(() => setTimerTrigger(prev => prev + 1), 1000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, [uid]);

  const getRemainingTime = (endTime) => {
    if (!endTime) return null;
    const diff = new Date(endTime) - new Date();
    if (diff <= 0) return 'Expired';
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleCancelClick = (e, shop) => {
    e.stopPropagation();
    setPopup({
      isOpen: true,
      title: 'Cancel Token',
      message: `Do you want to leave the queue for ${shop.shop_name}?`,
      type: 'confirm',
      isDestructive: true,
      confirmText: 'Yes, Cancel',
      onConfirm: async () => {
        setPopup({ isOpen: false });
        try {
          await axios.post(`${QUEUE_URL}/cancel-token`, {
            qr_id: shop.qr_id,
            token_number: shop.token_number,
            customer_phone: localStorage.getItem('customerPhone') || uid
          });
          localStorage.removeItem(`myToken_${shop.qr_id}`);
          fetchBookings();
        } catch (err) { alert("Cancellation failed"); }
      }
    });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8F7F3', paddingBottom: '100px', fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}>

      {/* CSS Override: Responsive Header and Grid System */}
      <style>{`
        .smart-header {
          background: linear-gradient(135deg, #A86423 0%, #754B1A 100%);
          padding: 20px 5% 20px 5%;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          width: 100%;
          box-sizing: border-box;
        }
        .booking-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 768px) {
          .booking-grid {
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 24px;
          }
        }
        @media (max-width: 768px) {
          .smart-header {
            padding: 20px 20px 20px 20px;
          }
        }
      `}</style>

      <CustomPopup config={popup} setConfig={setPopup} />
      <GlobalSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

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

      {/* Wide Container for Laptop */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>

        {/* Page Title */}
        <div style={{ margin: '30px 0 20px 0' }}>
          <h2 style={{ margin: 0, fontSize: '28px', color: '#1A1A2E', fontWeight: '900', letterSpacing: '-0.5px' }}>My Bookings</h2>
        </div>

        {loading ? <p style={{ textAlign: 'center', color: '#8E8E93', fontWeight: '600', marginTop: '20px' }}>Loading...</p> :
          activeBookings.length > 0 ? (
            <div className="booking-grid">
              {activeBookings.map(shop => {

                const bookDate = new Date(shop.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                const bookTime = new Date(shop.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

                const isSkipped = shop.status === 'skipped';
                const isCancelled = shop.status === 'cancelled_by_vendor';
                const timeRemaining = isSkipped ? getRemainingTime(shop.graceEndTime) : null;

                let tagBg = '#E5F1FF'; let tagColor = '#007AFF'; let tagText = 'Waiting...';
                if (shop.status === 'processing') { tagBg = '#E8F8F0'; tagColor = '#34C759'; tagText = 'YOUR TURN'; }
                else if (isSkipped) { tagBg = '#FFF4E5'; tagColor = '#FF9500'; tagText = `Skipped! Reach in ${timeRemaining || '0:00'}`; }
                else if (isCancelled) { tagBg = '#FEE'; tagColor = '#FF3B30'; tagText = 'Shop Closed'; }

                return (
                  <div
                    key={shop._id}
                    onClick={() => !isCancelled && navigate(`/track/${shop.qr_id}`)}
                    style={{
                      background: '#fff', padding: '20px', borderRadius: '28px',
                      cursor: isCancelled ? 'default' : 'pointer', boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
                      opacity: isCancelled ? 0.6 : 1, position: 'relative', overflow: 'hidden',
                      border: '1px solid #F0F0F5'
                    }}
                  >
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px', background: tagColor }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingLeft: '8px' }}>
                      <div style={{ overflow: 'hidden', paddingRight: '10px' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#1A1A2E', fontWeight: '800', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{shop.shop_name}</h4>
                        <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#8E8E93', fontWeight: '600' }}>{bookDate} • {bookTime}</p>
                        <span style={{ display: 'inline-block', fontSize: '11px', fontWeight: '800', padding: '6px 12px', borderRadius: '12px', background: tagBg, color: tagColor }}>
                          {tagText}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ margin: '0', fontSize: '10px', color: '#8E8E93', fontWeight: '800', letterSpacing: '0.5px' }}>TOKEN</p>
                        <h2 style={{ margin: 0, fontSize: '36px', color: isCancelled ? '#8E8E93' : '#1A1A2E', textDecoration: isCancelled ? 'line-through' : 'none', fontWeight: '900', letterSpacing: '-1px' }}>#{shop.token_number}</h2>
                      </div>
                    </div>

                    <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #F0F0F5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#A0A0B0', fontWeight: '500' }}>ID: {shop.qr_id}</span>
                      {!isCancelled && (
                        <button onClick={(e) => handleCancelClick(e, shop)} style={{ background: '#fff', color: '#FF3B30', border: '1.5px solid #FEE', padding: '8px 16px', borderRadius: '14px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}>Cancel</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '50px 20px', background: '#fff', borderRadius: '32px', boxShadow: '0 8px 24px rgba(0,0,0,0.02)' }}>
              <p style={{ color: '#8E8E93', fontWeight: '600', marginBottom: '20px' }}>No active bookings.</p>
              <button onClick={() => navigate('/')} style={{ padding: '14px 28px', background: '#1A1A2E', color: '#fff', border: 'none', borderRadius: '16px', fontWeight: '700', cursor: 'pointer' }}>Find Shops</button>
            </div>
          )
        }
      </div>
    </div>
  );
};

export default MyBookings;