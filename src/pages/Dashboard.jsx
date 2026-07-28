import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import GlobalSidebar from '../components/GlobalSidebar';
import CustomPopup from '../components/CustomPopup';
import { Users, UserX, QrCode, Plus, LogOut, Power, CheckCircle, Clock } from 'lucide-react';
import SmartLogo from '../components/SmartLogo';

const BACKEND_BASE = 'https://qzkip-backend.onrender.com';
const QUEUE_URL = `${BACKEND_BASE}/api/queue`;

const Dashboard = () => {
  const navigate = useNavigate();
  const [popup, setPopup] = useState({ isOpen: false });
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState({ totalToday: 0 });
  const [vendorInfo, setVendorInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [btnLock, setBtnLock] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  const vendorEmail = vendorInfo?.email || localStorage.getItem('vendorEmail') || 'Active Session';

  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInName, setWalkInName] = useState('');

  const config = { 
    withCredentials: true,
    headers: { Authorization: `Bearer ${localStorage.getItem('vendorToken')}` } 
  };

  const triggerNotification = (title, message) => {
    const audio = new Audio('/alert.mp3'); 
    audio.play().catch(error => console.log("Sound blocked by browser", error));

    if (!("Notification" in window)) {
      return;
    }

    if (Notification.permission === "granted") {
      try {
        new Notification(title, { body: message, icon: '/favicon.ico' });
      } catch (e) {
        console.log("Mobile browser blocked Notification popup, playing audio only.");
      }
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          try {
            new Notification(title, { body: message });
          } catch (e) {
            console.log("Mobile browser blocked Notification popup, playing audio only.");
          }
        }
      });
    }
  };

  const fetchQueue = async () => {
    try {
      const res = await axios.get(`${QUEUE_URL}/live`, config);
      setQueue(res.data.data);
      setStats(res.data.stats);
      setVendorInfo(res.data.vendorDetails);
      const statusFromServer = res.data.vendorDetails?.is_open;
      setIsOpen(statusFromServer !== undefined ? statusFromServer : true);
    } catch (e) { 
      if (e.response?.status === 401) { 
        localStorage.clear(); 
        navigate('/vendor-login'); 
      }
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!localStorage.getItem('vendorToken')) return navigate('/vendor-login');
    
    if ("Notification" in window && Notification.permission !== "denied") {
      Notification.requestPermission();
    }

    fetchQueue();
    const socket = io('https://qzkip-backend.onrender.com', {
      withCredentials: true
    }); 
    
    socket.onAny((eventName, data) => {
      if (data && data.message === 'A new token has arrived!') {
        triggerNotification("Qzkip - New Customer!", "A new customer has been added to the queue.");
      }
      fetchQueue();
    });

    return () => socket.disconnect();
  }, [navigate]);

  const callNext = async () => {
    const serving = queue.find(q => q.status === 'processing');
    const next = queue.find(q => q.status === 'waiting');
    if (!next && !serving) return;
    setBtnLock(true);
    try {
      if (serving) await axios.patch(`${QUEUE_URL}/update-status`, { token_id: serving._id, new_status: 'completed' }, config);
      if (next) await axios.patch(`${QUEUE_URL}/update-status`, { token_id: next._id, new_status: 'processing' }, config);
      await fetchQueue();
    } catch (e) { alert("Update failed!"); } finally { setBtnLock(false); }
  };

  const handleSkipCurrent = async () => {
    const serving = queue.find(q => q.status === 'processing');
    const next = queue.find(q => q.status === 'waiting');
    if (!serving) return;

    setPopup({
      isOpen: true,
      title: 'No Show (Skip)',
      message: `Do you want to skip Token #${serving.token_number}? They will receive a 15-minute Grace Period.`,
      type: 'confirm',
      isDestructive: true,
      confirmText: 'Skip (15m Wait)',
      onConfirm: async () => {
        setPopup({ isOpen: false });
        setBtnLock(true);
        try {
          await axios.patch(`${QUEUE_URL}/update-status`, { token_id: serving._id, new_status: 'skipped' }, config);
          if (next) await axios.patch(`${QUEUE_URL}/update-status`, { token_id: next._id, new_status: 'processing' }, config);
          await fetchQueue();
        } catch (e) { alert("Skip failed!"); } finally { setBtnLock(false); }
      }
    });
  };

  const skipCustomer = async (token_id) => {
    const customer = queue.find(q => q._id === token_id);
    setPopup({
      isOpen: true,
      title: 'Skip Customer',
      message: `Do you want to skip ${customer?.customer_name} (#${customer?.token_number})?`,
      type: 'confirm',
      isDestructive: true,
      confirmText: 'Skip Now',
      onConfirm: async () => {
        setPopup({ isOpen: false });
        setBtnLock(true);
        try {
          await axios.patch(`${QUEUE_URL}/update-status`, { token_id, new_status: 'skipped' }, config);
          await fetchQueue();
        } catch (e) { alert("Error skipping!"); } finally { setBtnLock(false); }
      }
    });
  };

  const handleRecall = async (token_id) => {
    setBtnLock(true);
    try {
      await axios.patch(`${QUEUE_URL}/update-status`, { 
        token_id, 
        new_status: 'waiting', 
        isPriority: true 
      }, config);
      await fetchQueue();
    } catch (e) { alert("Recall failed!"); } finally { setBtnLock(false); }
  };

  const toggleShop = async () => {
    try {
      const newStatus = !isOpen;
      setIsOpen(newStatus); 
      await axios.post(`${QUEUE_URL}/toggle-status`, { status: newStatus }, config);
    } catch (e) { setIsOpen(!isOpen); alert("Server error!"); }
  };

  const handleVendorLogout = async () => {
    const hasPendingCustomers = queue.some(q => q.status === 'waiting' || q.status === 'processing');

    setPopup({
      isOpen: true,
      title: hasPendingCustomers ? 'Close Shop & Cancel Queue?' : 'Logout',
      message: hasPendingCustomers 
        ? "There are still people in your line! Logging out will close the shop and all remaining tokens will be CANCELLED." 
        : "Logging out will set the shop to 'Closed'. Are you sure?",
      type: 'confirm',
      isDestructive: true,
      confirmText: hasPendingCustomers ? 'Yes, Cancel All' : 'Logout',
      onConfirm: async () => {
        setPopup({ isOpen: false });
        try { 
          await axios.post(`${QUEUE_URL}/toggle-status`, { status: false, forceCancel: true }, config); 
          await axios.post(`${BACKEND_BASE}/api/auth/logout`, {}, config);
        } catch (e) { console.log("Logout process failed:", e); }
        
        localStorage.removeItem('vendorToken');
        localStorage.removeItem('vendorEmail');
        navigate('/');
      }
    });
  };

  const handleWalkInSubmit = async () => {
    const cleanName = walkInName.trim();
    if (!cleanName) return alert("Customer name is required!");
    
    setBtnLock(true);
    try {
      await axios.post(`${QUEUE_URL}/walk-in`, {
        qr_id: vendorInfo.qr_id,
        customer_name: cleanName
      }, config);
      
      await fetchQueue();
      setShowWalkInModal(false);
      setWalkInName('');
    } catch (e) {
      alert(e.response?.data?.message || "Walk-in error.");
    } finally {
      setBtnLock(false);
    }
  };

  const serving = queue.find(q => q.status === 'processing');
  const waiting = queue.filter(q => q.status === 'waiting');
  const skipped = queue.filter(q => q.status === 'skipped');

  const bookingUrl = vendorInfo?.qr_id ? `${window.location.origin}/book/${vendorInfo.qr_id}` : '';
  const qrImageSrc = bookingUrl ? `https://quickchart.io/qr?text=${encodeURIComponent(bookingUrl)}&size=250` : '';

  const downloadQRPoster = () => {
    if (!qrImageSrc) return;
    const canvas = document.createElement("canvas");
    
    const scale = 3; 
    const baseWidth = 400;
    const baseHeight = 580; 

    canvas.width = baseWidth * scale;
    canvas.height = baseHeight * scale;
    const ctx = canvas.getContext("2d");

    ctx.scale(scale, scale); 

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, baseWidth, baseHeight);

    ctx.fillStyle = "#0F172A";
    ctx.font = "900 36px 'Arial', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Qzkip", 200, 60);

    ctx.fillStyle = "#64748B";
    ctx.font = "bold 18px 'Arial', sans-serif";
    ctx.fillText(vendorInfo?.shop_name || "Scan to join", 200, 95);

    ctx.fillStyle = "#16A34A"; 
    ctx.font = "900 20px 'Arial', sans-serif";
    ctx.fillText("Skip the queue, save the time", 200, 440);

    ctx.fillStyle = "#0F172A";
    ctx.font = "bold 18px 'Arial', sans-serif"; 
    const displayId = vendorInfo?.qr_id ? `ID: ${vendorInfo.qr_id}` : ''; 
    ctx.fillText(displayId, 200, 480);

    ctx.fillStyle = "#475569";
    ctx.font = "600 14px 'Arial', sans-serif";
    ctx.fillText("Skip the wait! Book from home at Qzkip.com", 200, 530);

    const img = new Image();
    img.crossOrigin = "Anonymous";
    
    img.src = qrImageSrc.replace('size=250', 'size=1000'); 
    
    img.onload = () => {
      ctx.drawImage(img, 75, 120, 250, 250);
      const link = document.createElement("a");
      link.download = `${vendorInfo?.shop_name.replace(/\s+/g, '_')}_QR_Poster.png`;
      link.href = canvas.toDataURL("image/png", 1.0); 
      link.click();
    };
  };

  if (loading) return <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#F8FAFC'}}><h2>Loading Workspace...</h2></div>;

  return (
    <div className="vendor-dashboard-root" style={{ width: '100vw', marginLeft: 'calc(-50vw + 50%)', minHeight: '100vh', background: '#F8FAFC', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", overflowX: 'hidden' }}>
      
      <style>{`
        .dashboard-container { display: grid; gap: 24px; padding: 24px; max-width: 1500px; margin: 0 auto; grid-template-columns: 1fr; align-items: start; }
        .lists-wrapper { display: grid; grid-template-columns: 1fr; gap: 24px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 16px; margin-top: 24px; }
        .list-panel { background: #ffffff; border-radius: 24px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #E2E8F0; display: flex; flex-direction: column; max-height: 600px; }
        .list-scroll { overflow-y: auto; flex-grow: 1; padding-right: 8px; }
        .list-scroll::-webkit-scrollbar { width: 6px; }
        .list-scroll::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
        
        .top-nav { display: flex; justify-content: space-between; align-items: center; padding: 15px 24px; background: linear-gradient(135deg, #A86423 0%, #754B1A 100%); flex-wrap: wrap; gap: 15px; box-shadow: 0 4px 20px rgba(168, 100, 35, 0.15); border: none; }
        .nav-actions { display: flex; gap: 12px; flex-wrap: wrap; }
        
        @media (min-width: 1024px) {
          .dashboard-container { grid-template-columns: 380px 1fr; padding: 32px 40px; }
          .lists-wrapper { grid-template-columns: 1fr 1fr; }
          .top-nav { padding: 15px 40px; }
        }
        @media (min-width: 1400px) {
          .dashboard-container { grid-template-columns: 420px 1fr; }
        }
      `}</style>

      <CustomPopup config={popup} setConfig={setPopup} />
      
      <nav className="top-nav">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          
          <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', paddingRight: '20px' }}>
            <SmartLogo size={30} />
            <h1 style={{margin: 0, fontSize: '22px', color: '#ffffff', fontWeight: '900', letterSpacing: '-0.5px'}}>Qzkip</h1>
          </div>

          <div style={{ width: '1px', height: '35px', background: 'rgba(255,255,255,0.2)' }}></div>
          
          <div style={{ marginLeft: '20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '15px', color: '#ffffff', fontWeight: '800', letterSpacing: '-0.2px' }}>
                {vendorInfo?.shop_name}
              </span>
              <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.15)', color: '#F9F3EA', padding: '3px 8px', borderRadius: '6px', fontWeight: '800', letterSpacing: '0.5px' }}>
                ID: {vendorInfo?.qr_id}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
              <div style={{ width: '6px', height: '6px', background: '#10B981', borderRadius: '50%', boxShadow: '0 0 6px rgba(16, 185, 129, 0.6)' }}></div>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                {vendorEmail}
              </span>
            </div>
          </div>
          
        </div>
        
        <div className="nav-actions">
          <button onClick={() => setShowWalkInModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', color: '#A86423', border: 'none', padding: '10px 18px', borderRadius: '12px', cursor: 'pointer', fontWeight: '800', fontSize: '14px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)', transition: '0.2s' }}>
            <Plus size={16} strokeWidth={3}/> Walk-in
          </button>
          <button onClick={() => setShowQR(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)', padding: '10px 18px', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', transition: '0.2s' }}>
            <QrCode size={16}/> Show QR
          </button>
          <button onClick={handleVendorLogout} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 59, 48, 0.8)', color: '#ffffff', border: 'none', padding: '10px 18px', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', transition: '0.2s' }}>
            <LogOut size={16}/> Logout
          </button>
        </div>
      </nav>

      <div className="dashboard-container">
        
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ background: '#0F172A', color: '#fff', borderRadius: '32px', padding: '40px 30px', textAlign: 'center', boxShadow: '0 20px 40px rgba(15, 23, 42, 0.15)' }}>
            <p style={{ color: '#94A3B8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 15px 0', fontWeight: '700' }}>Current Active Token</p>
            <h1 style={{ fontSize: '85px', margin: '0 0 5px 0', fontWeight: '900', letterSpacing: '-2px', lineHeight: '1' }}>
              {serving ? `#${serving.token_number}` : (waiting.length > 0 ? "Call Next" : "Done")}
            </h1>
            
            {/* 🟢 MAGICAL FIX 1: Active Token Badge */}
            <p style={{ fontSize: '18px', margin: '0 0 35px 0', color: '#CBD5E1', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              {serving ? (
                <>
                  Customer: {serving.customer_name}
                  {serving.googleUID === 'walk_in' ? (
                    <span style={{ fontSize: '11px', background: '#334155', color: '#CBD5E1', padding: '4px 10px', borderRadius: '8px', fontWeight: '700' }}>Walk-in</span>
                  ) : (
                    <span style={{ fontSize: '11px', background: 'rgba(34, 197, 94, 0.2)', color: '#4ADE80', padding: '4px 10px', borderRadius: '8px', fontWeight: '700', border: '1px solid rgba(34, 197, 94, 0.3)' }}>Online App</span>
                  )}
                </>
              ) : (waiting.length > 0 ? "Line is waiting..." : "All caught up!")}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={callNext} disabled={btnLock || (!serving && waiting.length === 0)} style={{ padding: '18px', borderRadius: '16px', border: 'none', background: '#ffffff', color: '#0F172A', fontWeight: '800', fontSize: '16px', cursor: 'pointer', width: '100%', boxShadow: '0 4px 10px rgba(255,255,255,0.1)' }}>
                {btnLock ? 'Updating...' : (serving ? 'Finish & Next' : 'Call Next')}
              </button>
              {serving && (
                <button onClick={handleSkipCurrent} disabled={btnLock} style={{ padding: '16px', borderRadius: '16px', background: 'transparent', color: '#F87171', border: '1.5px solid #F87171', fontWeight: '700', fontSize: '15px', cursor: 'pointer', width: '100%' }}>
                  No Show? Skip
                </button>
              )}
            </div>
          </div>

          <div className="stats-grid">
            <div style={{ background: '#ffffff', padding: '20px', borderRadius: '24px', border: '1px solid #E2E8F0', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div style={{ background: isOpen ? '#F0FDF4' : '#F1F5F9', padding: '8px', borderRadius: '10px', color: isOpen ? '#16A34A' : '#64748B' }}><Power size={18}/></div>
                <div onClick={toggleShop} style={{ width: '44px', height: '24px', background: isOpen ? '#16A34A' : '#CBD5E1', borderRadius: '20px', cursor: 'pointer', position: 'relative', transition: '0.3s' }}>
                  <div style={{ width: '18px', height: '18px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '3px', left: isOpen ? '23px' : '3px', transition: '0.3s', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}></div>
                </div>
              </div>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: '900', color: '#0F172A' }}>{isOpen ? 'Open' : 'Closed'}</h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748B', fontWeight: '600' }}>Shop Status</p>
              </div>
            </div>

            <div style={{ background: '#ffffff', padding: '20px', borderRadius: '24px', border: '1px solid #E2E8F0', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ background: '#F1F5F9', padding: '8px', borderRadius: '10px', color: '#475569', width: 'fit-content', marginBottom: '15px' }}><CheckCircle size={18}/></div>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: '900', color: '#0F172A' }}>{stats.totalToday}</h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748B', fontWeight: '600' }}>Total Served</p>
              </div>
            </div>

            <div style={{ background: '#ffffff', padding: '20px', borderRadius: '24px', border: '1px solid #E2E8F0', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ background: '#EFF6FF', padding: '8px', borderRadius: '10px', color: '#3B82F6', width: 'fit-content', marginBottom: '15px' }}><Users size={18}/></div>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: '900', color: '#3B82F6' }}>{waiting.length}</h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748B', fontWeight: '600' }}>In Waiting</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lists-wrapper">
          
          <div className="list-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #F1F5F9' }}>
              <h3 style={{ margin: 0, color: '#0F172A', fontSize: '18px', fontWeight: '800' }}>Upcoming Queue</h3>
              <span style={{ fontSize: '12px', background: '#F1F5F9', color: '#475569', padding: '6px 12px', borderRadius: '20px', fontWeight: '700' }}>{waiting.length} Waiting</span>
            </div>
            <div className="list-scroll">
              {waiting.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {waiting.map((q) => (
                    <div key={q._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ width: '44px', height: '44px', background: '#EFF6FF', color: '#3B82F6', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '16px' }}>
                          #{q.token_number}
                        </div>
                        <div>
                          
                          {/* 🟢 MAGICAL FIX 2: Waiting List Badge */}
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#0F172A', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {q.customer_name}
                            {q.googleUID === 'walk_in' ? (
                              <span style={{ fontSize: '10px', background: '#E2E8F0', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontWeight: '800' }}>Walk-in</span>
                            ) : (
                              <span style={{ fontSize: '10px', background: '#DCFCE7', color: '#16A34A', padding: '2px 6px', borderRadius: '4px', fontWeight: '800' }}>Online</span>
                            )}
                          </h4>
                          <p style={{ margin: 0, fontSize: '12px', color: '#64748B', fontWeight: '600' }}>Status: Waiting</p>
                        </div>
                      </div>
                      <button onClick={() => skipCustomer(q._id)} style={{ background: 'transparent', border: 'none', color: '#EF4444', padding: '8px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <UserX size={16}/> <span style={{fontSize: '13px'}}>Skip</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', background: '#F8FAFC', borderRadius: '16px', border: '1px dashed #CBD5E1' }}>
                  <Users size={32} color="#CBD5E1" style={{ marginBottom: '10px' }}/>
                  <p style={{ color: '#64748B', fontWeight: '600', margin: 0 }}>No customers waiting right now.</p>
                </div>
              )}
            </div>
          </div>

          <div className="list-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #F1F5F9' }}>
              <h3 style={{ margin: 0, color: '#F59E0B', fontSize: '18px', fontWeight: '800' }}>Skipped Customers</h3>
              <span style={{ fontSize: '12px', background: '#FFFBEB', color: '#F59E0B', padding: '6px 12px', borderRadius: '20px', fontWeight: '700' }}>{skipped.length} Total</span>
            </div>
            <div className="list-scroll">
              {skipped.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {skipped.map((q) => (
                    <div key={q._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#FFFBEB', borderRadius: '16px', border: '1px solid #FEF3C7' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ width: '44px', height: '44px', background: '#F59E0B', color: '#fff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '16px' }}>
                          #{q.token_number}
                        </div>
                        <div>
                          
                          {/* 🟢 MAGICAL FIX 3: Skipped List Badge */}
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#0F172A', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {q.customer_name}
                            {q.googleUID === 'walk_in' ? (
                              <span style={{ fontSize: '10px', background: '#FDE68A', color: '#B45309', padding: '2px 6px', borderRadius: '4px', fontWeight: '800' }}>Walk-in</span>
                            ) : (
                              <span style={{ fontSize: '10px', background: '#D1FAE5', color: '#065F46', padding: '2px 6px', borderRadius: '4px', fontWeight: '800' }}>Online</span>
                            )}
                          </h4>
                          <p style={{ margin: 0, fontSize: '11px', color: '#D97706', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12}/> Expires {new Date(q.graceEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <button onClick={() => handleRecall(q._id)} disabled={btnLock} style={{ background: '#3B82F6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '13px', boxShadow: '0 4px 10px rgba(59,130,246,0.2)' }}>
                        Recall
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', background: '#F8FAFC', borderRadius: '16px', border: '1px dashed #CBD5E1' }}>
                  <Clock size={32} color="#CBD5E1" style={{ marginBottom: '10px' }}/>
                  <p style={{ color: '#64748B', fontWeight: '600', margin: 0 }}>No skipped customers yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {showQR && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '32px', overflow: 'hidden', maxWidth: '380px', width: '100%', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '40px 20px 30px', textAlign: 'center', background: '#fff' }}>
              <h1 style={{ margin: '0 0 5px 0', color: '#0F172A', fontSize: '32px', fontWeight: '900', letterSpacing: '-1px' }}>Qzkip</h1>
              <p style={{ margin: '0 0 30px 0', color: '#64748B', fontSize: '16px', fontWeight: '700' }}>{vendorInfo?.shop_name}</p>
              <div style={{ background: '#fff', padding: '15px', display: 'inline-block', borderRadius: '24px', border: '1px solid #E2E8F0', marginBottom: '25px' }}>
                {qrImageSrc && <img src={qrImageSrc} alt="QR" style={{ width: '220px', height: '220px', display: 'block' }} crossOrigin="anonymous" />}            
              </div>
              <h3 style={{ margin: '0 0 8px 0', color: '#16A34A', fontSize: '18px', fontWeight: '800' }}>Skip the queue, save the time</h3>
              <p style={{ fontSize: '15px', color: '#0F172A', margin: 0, fontWeight: '800', letterSpacing: '1px', background: '#F1F5F9', padding: '8px 16px', borderRadius: '12px', display: 'inline-block' }}>ID: {vendorInfo?.qr_id}</p>
            </div>
            <p style={{ marginTop: '5px', marginBottom: '25px', fontSize: '13px', color: '#475569', fontWeight: '600', textAlign: 'center', lineHeight: '1.4' }}>
              Skip the wait! Book from home at <b style={{color: '#0F172A'}}>Qzkip.com</b> <br />
            </p>
            <div style={{ padding: '20px', background: '#F8FAFC', display: 'flex', gap: '10px', borderTop: '1px solid #E2E8F0' }}>
              <button onClick={downloadQRPoster} style={{ flex: 1, padding: '16px', background: '#16A34A', color: '#fff', borderRadius: '16px', border: 'none', fontWeight: '800', cursor: 'pointer', fontSize: '15px', boxShadow: '0 4px 12px rgba(22, 163, 74, 0.2)' }}>Download</button>
              <button onClick={() => setShowQR(false)} style={{ flex: 1, padding: '16px', background: '#FEF2F2', color: '#DC2626', borderRadius: '16px', border: 'none', fontWeight: '800', cursor: 'pointer', fontSize: '15px' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showWalkInModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '32px', padding: '35px 25px', width: '100%', maxWidth: '380px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#0F172A', fontSize: '22px', fontWeight: '900', letterSpacing: '-0.5px' }}>Add Walk-in Customer</h3>
            <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '25px', lineHeight: '1.4', fontWeight: '500' }}>Generate a token directly from the counter without scanning a QR code.</p>
            
            <input type="text" placeholder="Customer Name (Required)" value={walkInName} onChange={(e) => setWalkInName(e.target.value)} style={{ width: '100%', padding: '16px', marginBottom: '25px', borderRadius: '16px', border: '1px solid #E2E8F0', background: '#F8FAFC', boxSizing: 'border-box', fontSize: '15px', outline: 'none', fontWeight: '600' }} />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setShowWalkInModal(false); setWalkInName(''); }} style={{ flex: 1, padding: '16px', background: '#F1F5F9', color: '#0F172A', borderRadius: '16px', border: 'none', fontWeight: '800', cursor: 'pointer', fontSize: '15px' }}>Cancel</button>
              <button onClick={handleWalkInSubmit} disabled={btnLock} style={{ flex: 1, padding: '16px', background: '#3B82F6', color: '#fff', borderRadius: '16px', border: 'none', fontWeight: '800', cursor: 'pointer', fontSize: '15px', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}>{btnLock ? 'Adding...' : 'Generate'}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;