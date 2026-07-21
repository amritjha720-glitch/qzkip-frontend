import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import CustomPopup from '../components/CustomPopup';
import GlobalSidebar from '../components/GlobalSidebar';
import SmartLogo from '../components/SmartLogo';

const QUEUE_URL = 'http://localhost:5000/api/queue';



const QueueHistory = () => {
  const navigate = useNavigate();
  const [pastBookings, setPastBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState(localStorage.getItem('googleUID'));
  const [popup, setPopup] = useState({ isOpen: false });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const fetchHistory = () => {
    const identifier = uid || localStorage.getItem('customerPhone');
    if (!identifier) return;

    axios.get(`${QUEUE_URL}/customer-history/${identifier}`)
      .then(res => {
        if (res.data && res.data.history) {
          const today = new Date().toDateString();

          const past = res.data.history.filter(h => h.status !== 'waiting' && h.status !== 'processing');
          setPastBookings(past.reverse());
          setLoading(false);
        }
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
    fetchHistory();
  }, [uid, navigate]);

  const handleDeleteItem = (e, tokenId) => {
    e.stopPropagation();
    setPopup({
      isOpen: true,
      title: 'Delete History',
      message: 'Are you sure you want to remove this entry from your history?',
      type: 'confirm',
      isDestructive: true,
      confirmText: 'Delete',
      onConfirm: async () => {
        setPopup({ isOpen: false });
        try {
          await axios.patch(`${QUEUE_URL}/hide-history/${tokenId}`, {}, {
            headers: { Authorization: `Bearer ${localStorage.getItem('googleUID')}` }
          });
          setPastBookings(prev => prev.filter(item => item._id !== tokenId));
        } catch (err) {
          setPopup({ isOpen: true, title: 'Error', message: 'Deletion failed.', type: 'alert' });
        }
      }
    });
  };

  const getStatusUI = (status) => {
    if (status === 'completed') return { text: 'Completed', color: '#34C759', bg: '#E8F8F0' };
    if (status === 'skipped') return { text: 'Skipped', color: '#FF9500', bg: '#FFF4E5' };
    return { text: 'Cancelled', color: '#FF3B30', bg: '#FEE' };
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
        .history-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 768px) {
          .history-grid {
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
          </button>    
          </div>
      </div>

      {/* Wide Container for Laptop */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>

        {/* Page Title */}
        <div style={{ margin: '30px 0 20px 0' }}>
          <h2 style={{ margin: 0, fontSize: '28px', color: '#1A1A2E', fontWeight: '900', letterSpacing: '-0.5px' }}>Queue History</h2>
        </div>

        {loading ? <p style={{ textAlign: 'center', color: '#8E8E93', fontWeight: '600', marginTop: '20px' }}>Loading...</p> :
          pastBookings.length > 0 ? (
            <div className="history-grid">
              {pastBookings.map(shop => {
                const ui = getStatusUI(shop.status);
                return (
                  <div key={shop._id} style={{ background: '#fff', padding: '20px', borderRadius: '28px', boxShadow: '0 8px 24px rgba(0,0,0,0.03)', border: '1px solid #F0F0F5' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                      <div style={{ overflow: 'hidden', paddingRight: '10px' }}>
                        <h4 style={{ margin: '0 0 5px 0', fontSize: '17px', color: '#1A1A2E', fontWeight: '800', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{shop.shop_name}</h4>
                        <p style={{ margin: 0, fontSize: '12px', color: '#8E8E93', fontWeight: '600' }}>{new Date(shop.createdAt).toLocaleDateString()}</p>
                        <span style={{ display: 'inline-block', marginTop: '10px', fontSize: '11px', fontWeight: '800', padding: '6px 12px', borderRadius: '12px', background: ui.bg, color: ui.color }}>{ui.text}</span>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ margin: '0 0 2px 0', fontSize: '10px', color: '#8E8E93', fontWeight: '800', letterSpacing: '0.5px' }}>TOKEN</p>
                        <h3 style={{ margin: 0, fontSize: '28px', color: '#1A1A2E', fontWeight: '900', letterSpacing: '-1px' }}>#{shop.token_number}</h3>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #F0F0F5' }}>
                      <button onClick={() => navigate(`/book/${shop.qr_id}`)} style={{ padding: '10px 18px', background: '#fff', color: '#A86423', border: '1.5px solid #F0E6D8', borderRadius: '14px', fontWeight: '800', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s' }}>Re-book</button>
                      <button onClick={(e) => handleDeleteItem(e, shop._id)} style={{ padding: '10px 18px', background: '#fff', color: '#FF3B30', border: '1.5px solid #FEE', borderRadius: '14px', fontWeight: '800', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s' }}>Delete</button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '50px 20px', background: '#fff', borderRadius: '32px', boxShadow: '0 8px 24px rgba(0,0,0,0.02)', maxWidth: '450px', margin: '0 auto' }}>
              <p style={{ color: '#8E8E93', fontWeight: '600' }}>No history found.</p>
            </div>
          )}
      </div>
    </div>
  );
};

export default QueueHistory;