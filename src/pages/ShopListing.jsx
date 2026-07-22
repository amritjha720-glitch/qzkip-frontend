/* eslint-disable */
import React, { useState, useEffect } from 'react';

import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Search, Scissors, Stethoscope, Monitor, Store } from 'lucide-react';
import { Helmet, HelmetProvider } from 'react-helmet-async';

import CustomPopup from '../components/CustomPopup';
import GlobalSidebar from '../components/GlobalSidebar';
import SmartLogo from '../components/SmartLogo';

const QUEUE_URL = 'https://qzkip-backend.onrender.com/api/queue';

const ShopListing = () => {
  const navigate = useNavigate();
  const [popup, setPopup] = useState({ isOpen: false });
  const [shops, setShops] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchShops = () => {
      axios.get(`${QUEUE_URL}/all-shops`)
        .then(res => { setShops(res.data.shops); setLoading(false); })
        .catch(() => setLoading(false));
    };

    fetchShops();
    const socket = io('https://qzkip-backend.onrender.com');
    socket.onAny(() => fetchShops());
    return () => socket.disconnect();
  }, []);

  const handleShopClick = async (qr_id) => {
    try {
      const currentPhone = localStorage.getItem('customerPhone');
      const googleUID = localStorage.getItem('googleUID');

      if (currentPhone || googleUID) {
        const identifier = currentPhone || googleUID;
        const res = await axios.get(`${QUEUE_URL}/customer-history/${identifier}`);
        const freshHistory = res.data.history;
        const today = new Date().toDateString();

        const hasActiveToken = freshHistory.some(item => {
          const isStatusActive = ['waiting', 'processing', 'skipped'].includes(item.status);
          const isCreatedToday = new Date(item.createdAt).toDateString() === today;
          const isSameShop = item.qr_id === qr_id;
          return isStatusActive && isCreatedToday && isSameShop;
        });

        if (hasActiveToken) {
          setPopup({ isOpen: true, title: 'Already Queued', message: 'You already have an active token at this shop!', type: 'alert', confirmText: 'OK' });
          return;
        }
      }
      navigate(`/book/${qr_id}`);
    } catch (err) {
      navigate(`/book/${qr_id}`);
    }
  };

  const filteredShops = (shops || []).filter(s => {
    const searchLower = searchTerm.toLowerCase().trim();
    const matchesSearch = (s.shop_name?.toLowerCase() || '').includes(searchLower) || (s.qr_id?.toLowerCase() || '').includes(searchLower);
    const safeShopType = (s.shop_type || '').toLowerCase().trim();
    const safeActiveCat = activeCategory.toLowerCase().trim();
    const matchesCategory = activeCategory === 'All' || safeShopType === safeActiveCat;
    return matchesSearch && matchesCategory;
  });

  const getShopIcon = (type) => {
    const safeType = (type || '').toLowerCase().trim();
    switch (safeType) {
      case 'clinic': return { icon: <Stethoscope size={24} color="#8E5A35" />, bg: '#FDEAE0' };
      case 'barber': return { icon: <Scissors size={24} color="#8E5A35" />, bg: '#FDEAE0' };
      case 'cyber cafe': return { icon: <Monitor size={24} color="#8E5A35" />, bg: '#FDEAE0' };
      default: return { icon: <Store size={24} color="#8E5A35" />, bg: '#FDEAE0' };
    }
  };

  const categories = [
    { name: 'All', icon: null }, { name: 'Clinic', icon: <Stethoscope size={16} /> },
    { name: 'Barber', icon: <Scissors size={16} /> }, { name: 'Cyber Cafe', icon: <Monitor size={16} /> }
  ];

  return (
    <HelmetProvider>
      <Helmet>
        <title>Qzkip</title>
        <meta name="description" content="Search for top-rated clinics, hospitals, and barber shops. Check live queue status and book your digital token instantly." />
        <meta name="keywords" content="Qzkip, clinics near me, salon queue, live token tracking, digital queue" />
      </Helmet>

      <div style={{ minHeight: '100vh', background: '#F8F7F3', paddingBottom: '0' }}>

        <style>{`
          #root { max-width: 100% !important; padding: 0 !important; margin: 0 !important; width: 100% !important; }
          body { margin: 0; padding: 0; width: 100%;  }
          .smart-header {
            background: linear-gradient(135deg, #A86423 0%, #754B1A 100%);
            padding: 15px 5% 25px 5%; 
            margin-bottom: 25px;
            box-shadow: 0 10px 30px rgba(117, 75, 26, 0.2);
            width: 100%;
            box-sizing: border-box;
          }
          @media (max-width: 768px) {
            .smart-header {
              border-bottom-left-radius: 40px;
              border-bottom-right-radius: 40px;
              padding: 15px 20px 25px 20px;
            }
          }
        `}</style>

        <CustomPopup config={popup} setConfig={setPopup} />
        <GlobalSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        <div className="smart-header">
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
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
              </button>
            </div>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.9)', margin: '-5px 0 20px 40px', fontWeight: '500' }}>Find a shop & join the queue.</p>

            <div style={{ display: 'flex', alignItems: 'center', background: '#fff', borderRadius: '30px', padding: '14px 20px', marginBottom: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
              <Search size={20} color="#A0A0A0" style={{ marginRight: '12px' }} />
              <input type="text" placeholder="Search for clinics, salons, etc..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '15px', color: '#1a1a2e', fontWeight: '500' }} />
            </div>

            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '5px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
              {categories.map(cat => {
                const isActive = activeCategory === cat.name;
                return (
                  <button key={cat.name} onClick={() => setActiveCategory(cat.name)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '12px 20px', borderRadius: '25px', border: 'none', background: isActive ? '#C3913E' : '#FFFFFF', color: isActive ? '#FFFFFF' : '#1a1a2e', fontWeight: '700', fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, boxShadow: '0 4px 10px rgba(0,0,0,0.05)', transition: 'all 0.2s' }}>
                    {cat.icon && <span style={{ display: 'flex', alignItems: 'center', color: isActive ? '#fff' : '#C3913E' }}>{cat.icon}</span>}
                    {cat.name}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div style={{ padding: '0 20px', maxWidth: '1200px', margin: '0 auto' }}>
          {loading ? <p style={{ textAlign: 'center', color: '#8E8E93', fontWeight: '600' }}>Loading shops...</p> :
            filteredShops.length > 0 ? (
              <div className="shop-grid">
                {filteredShops.map(shop => {
                  const totalInLine = shop.activeCount || 0;
                  const isClosed = shop.is_open === false;
                  const shopStyle = getShopIcon(shop.shop_type);
                  const estimatedWait = totalInLine * (shop.avgTime || 5);

                  return (
                    <div 
  key={shop._id} 
  onClick={() => !isClosed && handleShopClick(shop.qr_id)} 
  style={{ 
    background: isClosed ? '#F8F9FA' : '#ffffff', 
    cursor: isClosed ? 'not-allowed' : 'pointer', 
    padding: '18px', 
    boxShadow: isClosed ? 'none' : '0 10px 30px rgba(0,0,0,0.06)', 
    borderRadius: '24px', 
    display: 'flex', 
    alignItems: 'center', 
    opacity: isClosed ? 0.65 : 1, 
    transition: 'all 0.25s ease', 
    border: isClosed ? '1px solid #E5E5EA' : '1px solid rgba(168, 100, 35, 0.12)',
    marginBottom: '16px',
    position: 'relative',
    overflow: 'hidden'
  }}
>
  {/* Left: Icon Box */}
  <div style={{ 
    width: '68px', 
    height: '68px', 
    borderRadius: '20px', 
    background: isClosed ? '#E5E5EA' : shopStyle.bg, 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    marginRight: '16px', 
    flexShrink: 0,
    boxShadow: isClosed ? 'none' : '0 6px 15px rgba(168, 100, 35, 0.1)'
  }}>
    {shopStyle.icon}
  </div>

  {/* Middle: Shop Name, ID & Type Tag at Bottom */}
  <div style={{ flex: 1, minWidth: 0, marginRight: '12px' }}>
    <h4 style={{ 
      margin: '0 0 4px 0', 
      color: '#1A1A2E', 
      fontSize: '17px', 
      fontWeight: '800', 
      display: '-webkit-box',
      WebkitLineClamp: '1',
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      letterSpacing: '-0.3px'
    }}>
      {shop.shop_name}
    </h4>
    
    <p style={{ fontSize: '12px', color: '#8E8E93', margin: '0 0 6px 0', fontWeight: '600' }}>
      ID: <span style={{ color: '#555' }}>{shop.qr_id}</span>
    </p>

    {/* Category Tag moved to the bottom */}
    <span style={{ 
      fontSize: '11px', 
      fontWeight: '800', 
      textTransform: 'uppercase', 
      letterSpacing: '0.5px',
      color: '#A86423',
      background: '#FDF8F2',
      padding: '2px 8px',
      borderRadius: '6px',
      display: 'inline-block',
      border: '1px solid rgba(168, 100, 35, 0.1)'
    }}>
      {shop.shop_type || 'Shop'}
    </span>
  </div>

  {/* Right: Live Queue Badge & Wait Time */}
  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
    {isClosed ? (
      <span style={{ 
        background: '#E5E5EA', 
        color: '#8E8E93', 
        padding: '6px 14px', 
        borderRadius: '12px', 
        fontSize: '11px', 
        fontWeight: '800',
        letterSpacing: '0.5px'
      }}>
        CLOSED
      </span>
    ) : (
      <>
        <div style={{ 
          background: '#E8F8F0', 
          color: '#10B981', 
          padding: '6px 12px', 
          borderRadius: '12px', 
          fontSize: '12px', 
          fontWeight: '800', 
          marginBottom: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.1)'
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
          {totalInLine} in line
        </div>
        <span style={{ fontSize: '11px', color: '#8E8E93', fontWeight: '700' }}>
          ~{estimatedWait} min wait
        </span>
      </>
    )}
  </div>
</div>
                  );
                })}
              </div>
            ) : <p style={{ textAlign: 'center', color: '#8E8E93', marginTop: '30px', fontWeight: '600' }}>No shops found.</p>}

          <div style={{ textAlign: 'center', marginTop: '40px', paddingBottom: '30px' }}>
            <button onClick={() => navigate('/vendor-login')} style={{ background: 'transparent', border: 'none', color: '#A86423', fontSize: '15px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', width: '100%' }}>
              Shop Owner? Signup Here
            </button>
          </div>

          {/* Emotional Footer */}
          <div className="bottom-footer">
            <p className="footer-quote">
              "Waqt bahut keemti hai.<br /> Ise line mein nahi, apno ke saath bitayein."
            </p>
            <p className="footer-made-with">
              Made with ❤️ in India
            </p>
          </div>

        </div>

        {/* 🚀 Clean Dark Blue Footer */}
        <div className="fat-footer-dark">
          <div className="footer-top-row">
            <div className="footer-brand">
              <SmartLogo size={36} />
              <h2>Qzkip</h2>
            </div>
          </div>

          <div className="footer-links-grid">
            <div className="footer-column">
              <h3>Services</h3>
              <p>Clinics & Hospitals</p>
              <p>Salons & Spas</p>
              <p>Cyber Cafes</p>
            </div>

            <div className="footer-column">
              <h3>For Vendors</h3>
              <p onClick={() => navigate('/vendor-login')}>Shop Owner Login</p>
              <p>List Your Business</p>
            </div>

            <div className="footer-column">
              <h3>Connect</h3>
              <p>Facebook</p>
              <p>Instagram</p>
              <p>LinkedIn</p>
            </div>

            <div className="footer-column">
              <h3>About</h3>
              <p>Contact Us</p>
            </div>
          </div>
        </div>

      </div>
    </HelmetProvider>
  );
};

export default ShopListing;