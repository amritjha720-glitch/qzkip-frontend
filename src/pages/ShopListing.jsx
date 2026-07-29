/* eslint-disable */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Search, Scissors, Stethoscope, Monitor, Store, Navigation, MapPin } from 'lucide-react';
import { Helmet, HelmetProvider } from 'react-helmet-async';

import CustomPopup from '../components/CustomPopup';
import GlobalSidebar from '../components/GlobalSidebar';
import SmartLogo from '../components/SmartLogo';

const QUEUE_URL = 'https://qzkip-backend.onrender.com/api/queue';

// 🟢 CACHING LOGIC: 1 Ghante (1 Hour) ke liye location save karenge
const CACHE_KEY = 'qzkip_user_location';
const CACHE_TIME_KEY = 'qzkip_loc_timestamp';
const EXPIRY_MS = 60 * 60 * 1000; // 1 Hour

const getCachedLocation = () => {
  const loc = localStorage.getItem(CACHE_KEY);
  const time = localStorage.getItem(CACHE_TIME_KEY);
  if (loc && time && (Date.now() - parseInt(time) < EXPIRY_MS)) {
    return JSON.parse(loc);
  }
  return null;
};

const setCachedLocation = (coords) => {
  localStorage.setItem(CACHE_KEY, JSON.stringify(coords));
  localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
};

const ShopListing = () => {
  const navigate = useNavigate();
  const [popup, setPopup] = useState({ isOpen: false });
  const [shops, setShops] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 'locating', 'found', 'denied', 'cached'
  const [locationStatus, setLocationStatus] = useState('locating'); 
  const locationCoordsRef = useRef(null); 

  const fetchShops = () => {
    let url = `${QUEUE_URL}/all-shops`;
    
    if (locationCoordsRef.current) {
      const { lat, lng } = locationCoordsRef.current;
      url += `?lat=${lat}&lng=${lng}`;
    }

    axios.get(url)
      .then(res => { setShops(res.data.shops); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const requestLocation = (forceNew = false) => {
    if (!forceNew) {
      const cached = getCachedLocation();
      if (cached) {
        locationCoordsRef.current = cached;
        setLocationStatus('cached');
        fetchShops();
        return;
      }
    }

    setLocationStatus('locating');
    
    if (!navigator.geolocation) {
      setLocationStatus('denied');
      fetchShops(); 
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        locationCoordsRef.current = coords;
        setCachedLocation(coords); 
        setLocationStatus('found');
        fetchShops(); 
      },
      (error) => {
        console.error("Location error:", error);
        setLocationStatus('denied');
        fetchShops(); 
        
        if (error.code === error.PERMISSION_DENIED && forceNew) {
          setPopup({ 
            isOpen: true, 
            title: 'Location Disabled', 
            message: 'Please allow location access in your browser settings to find shops near you.', 
            type: 'alert', 
            confirmText: 'Got It' 
          });
        }
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  useEffect(() => {
    requestLocation(false);

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
          .google-maps-btn {
            display: flex;
            align-items: center;
            gap: 4px;
            background: #EAF4FF;
            color: #0066FF;
            border: 1px solid rgba(0, 102, 255, 0.2);
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 700;
            text-decoration: none;
            transition: all 0.2s ease;
          }
          .google-maps-btn:hover {
            background: #D6EAFF;
          }
          
          /* 🟢 PREMIUM PILL STYLES FOR LOCATION BADGE */
          .loc-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.3px;
            backdrop-filter: blur(5px);
            transition: all 0.3s ease;
          }
          .loc-badge.success {
            background: rgba(255, 214, 10, 0.15);
            border: 1px solid rgba(255, 214, 10, 0.3);
            color: #FFD60A; /* Premium Vibrant Yellow */
          }
          .loc-badge.loading {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: rgba(255, 255, 255, 0.9);
          }
          .loc-badge.error {
            background: rgba(255, 69, 58, 0.15);
            border: 1px solid rgba(255, 69, 58, 0.3);
            color: #FF453A;
            cursor: pointer;
          }
          
          /* Blinking Dot for Locating */
          .pulse-dot {
            width: 6px;
            height: 6px;
            background-color: currentColor;
            border-radius: 50%;
            animation: pulse 1.5s infinite ease-in-out;
          }
          @keyframes pulse {
            0% { transform: scale(0.8); opacity: 0.5; }
            50% { transform: scale(1.2); opacity: 1; }
            100% { transform: scale(0.8); opacity: 0.5; }
          }
        `}</style>

        <CustomPopup config={popup} setConfig={setPopup} />
        <GlobalSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        <div className="smart-header">
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
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
            
            {/* 🟢 NEW PREMIUM LOCATION BADGE UI */}
            <div style={{ margin: '0 0 20px 38px', display: 'flex', alignItems: 'center' }}>
              {locationStatus === 'locating' && (
                <div className="loc-badge loading">
                  <div className="pulse-dot"></div> Locating you...
                </div>
              )}
              {(locationStatus === 'found' || locationStatus === 'cached') && (
                <div className="loc-badge success">
                  <MapPin size={12} strokeWidth={2.5} /> Showing nearby shops
                </div>
              )}
              {locationStatus === 'denied' && (
                <div className="loc-badge error" onClick={() => requestLocation(true)}>
                  <MapPin size={12} strokeWidth={2.5} /> Location disabled. Tap to retry.
                </div>
              )}
            </div>

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

                  // 🟢 Extract Coordinates for Google Maps
                  let mapLat = null, mapLng = null;
                  if (shop.location && shop.location.coordinates) {
                    mapLng = shop.location.coordinates[0];
                    mapLat = shop.location.coordinates[1];
                  }

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

                      {/* Middle: Shop Details */}
                      <div style={{ flex: 1, minWidth: 0, marginRight: '8px' }}>
                        <h4 style={{ 
                          margin: '0 0 4px 0', color: '#1A1A2E', fontSize: '17px', fontWeight: '800', 
                          display: '-webkit-box', WebkitLineClamp: '1', WebkitBoxOrient: 'vertical', 
                          overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.3px'
                        }}>
                          {shop.shop_name}
                        </h4>
                        
                        <p style={{ fontSize: '12px', color: '#8E8E93', margin: '0 0 8px 0', fontWeight: '600' }}>
                          ID: <span style={{ color: '#555' }}>{shop.qr_id}</span>
                        </p>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ 
                            fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: '#A86423',
                            background: '#FDF8F2', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(168, 100, 35, 0.1)'
                          }}>
                            {shop.shop_type || 'Shop'}
                          </span>

                          {/* 🟢 DISTANCE UI WITH GOOGLE MAPS LINK */}
                          {shop.distance && mapLat && mapLng && (
                            <a 
                              href={`https://www.google.com/maps/dir/?api=1&destination=${mapLat},${mapLng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()} 
                              className="google-maps-btn"
                            >
                              <Navigation size={12} /> {shop.distance}
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Right: Live Queue Badge */}
                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                        {isClosed ? (
                          <span style={{ background: '#E5E5EA', color: '#8E8E93', padding: '6px 14px', borderRadius: '12px', fontSize: '11px', fontWeight: '800' }}>
                            CLOSED
                          </span>
                        ) : (
                          <>
                            <div style={{ 
                              background: '#E8F8F0', color: '#10B981', padding: '6px 12px', borderRadius: '12px', 
                              fontSize: '12px', fontWeight: '800', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px',
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

          <div className="bottom-footer">
            <p className="footer-quote">"Waqt bahut keemti hai.<br /> Ise line mein nahi, apno ke saath bitayein."</p>
            <p className="footer-made-with">Made with ❤️ in India</p>
          </div>
        </div>
      </div>
    </HelmetProvider>
  );
};

export default ShopListing;