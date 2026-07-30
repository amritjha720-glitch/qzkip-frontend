/* eslint-disable */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { 
  Store, CheckCircle, XCircle, Trash2, MapPin, 
  Phone, FileText, Power, Users, Clock, LogOut, Search
} from 'lucide-react'; // 🟢 Added Search icon

const API_URL = 'https://qzkip-backend.onrender.com/api/admin'; 

const AdminDashboard = () => {
  const navigate = useNavigate();
  
  const [token, setToken] = useState(localStorage.getItem('adminToken') || '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [activeTab, setActiveTab] = useState('active'); 
  const [pendingVendors, setPendingVendors] = useState([]);
  const [activeVendors, setActiveVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // 🟢 NEW: State for Search Query
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (token) {
      if (activeTab === 'pending') fetchPendingVendors();
      if (activeTab === 'active') fetchActiveVendors();
    }
  }, [token, activeTab]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/login`, { username, password });
      if (res.data.success) {
        setToken(res.data.token);
        localStorage.setItem('adminToken', res.data.token);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Login Failed');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingVendors = async () => {
    try {
      const res = await axios.get(`${API_URL}/pending-vendors`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingVendors(res.data.data || []);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) handleLogout();
    }
  };

  const fetchActiveVendors = async () => {
    try {
      const res = await axios.get(`${API_URL}/active-vendors`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActiveVendors(res.data.data || []);
    } catch (error) {
      console.error('Error fetching active vendors', error);
    }
  };

  const handleApprove = async (vendorId, shopName) => {
    if (!window.confirm(`Approve ${shopName}?`)) return;
    try {
      await axios.patch(`${API_URL}/approve/${vendorId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPendingVendors(); 
      fetchActiveVendors(); // 🟢 Fixed: Ensures active list is updated in background
    } catch (error) {
      alert('Error occurred during approval');
    }
  };

  const handleReject = async (vendorId, shopName) => {
    if (!window.confirm(`Send ${shopName} back for corrections (Reject)?`)) return;
    try {
      await axios.patch(`${API_URL}/reject/${vendorId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPendingVendors();
    } catch (error) {
      alert('Error occurred during rejection');
    }
  };

  const handleDelete = async (vendorId, shopName) => {
    if (!window.confirm(`🚨 WARNING: Are you sure you want to PERMANENTLY DELETE ${shopName}? This deletes all their queues and data!`)) return;
    try {
      await axios.delete(`${API_URL}/${vendorId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (activeTab === 'pending') fetchPendingVendors();
      else fetchActiveVendors();
    } catch (error) {
      alert('Error occurred during deletion');
    }
  };

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('adminToken');
  };

  // 🟢 NEW: Logic to filter vendors based on search query (QR ID, Name, or Phone)
  const filteredActiveVendors = activeVendors.filter(vendor => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (vendor.shop_name && vendor.shop_name.toLowerCase().includes(query)) ||
      (vendor.qr_id && vendor.qr_id.toLowerCase().includes(query)) ||
      (vendor.phone && vendor.phone.includes(query))
    );
  });

  // ==============================
  // UI - 1: LOGIN SCREEN
  // ==============================
  if (!token) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#0F172A', fontFamily: 'sans-serif' }}>
        <div style={{ padding: '40px', width: '100%', maxWidth: '400px', backgroundColor: '#1E293B', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <div style={{ background: '#3B82F6', padding: '16px', borderRadius: '50%', boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)' }}>
              <Power color="#fff" size={32} />
            </div>
          </div>
          <h2 style={{ color: '#fff', textAlign: 'center', marginBottom: '8px', fontSize: '24px', fontWeight: '800' }}>Admin Portal</h2>
          <p style={{ color: '#94A3B8', textAlign: 'center', marginBottom: '30px', fontSize: '14px' }}>Enter God Mode</p>
          
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input type="text" placeholder="Admin Username" value={username} onChange={(e) => setUsername(e.target.value)} required 
              style={{ padding: '16px', borderRadius: '12px', border: '1px solid #475569', background: '#0F172A', color: '#fff', fontSize: '15px', outline: 'none' }} />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required 
              style={{ padding: '16px', borderRadius: '12px', border: '1px solid #475569', background: '#0F172A', color: '#fff', fontSize: '15px', outline: 'none' }} />
            <button type="submit" disabled={loading} 
              style={{ background: '#3B82F6', color: '#fff', border: 'none', padding: '16px', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', marginTop: '10px' }}>
              {loading ? 'Authenticating...' : 'Access Control Room'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==============================
  // UI - 2: DASHBOARD SCREEN
  // ==============================
  return (
    <HelmetProvider>
      <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', fontFamily: 'sans-serif' }}>
        <Helmet>
          <title>Admin Dashboard | Qzkip</title>
          <style>{`
            .tab-btn { padding: 12px 24px; font-weight: 700; font-size: 15px; border-radius: 12px; cursor: pointer; transition: all 0.2s; border: none; display: flex; align-items: center; gap: 8px; }
            .tab-active { background: '#1E293B'; color: #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
            .tab-inactive { background: transparent; color: #64748B; }
            .tab-inactive:hover { background: #E2E8F0; color: #334155; }
            
            .pulse-dot {
              width: 10px; height: 10px; border-radius: 50%;
              background-color: #22C55E; box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
              animation: pulse-green 1.5s infinite;
            }
            @keyframes pulse-green {
              0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
              70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
              100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
            }
          `}</style>
        </Helmet>

        {/* TOP NAVBAR */}
        <div style={{ background: '#ffffff', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: '#1E293B', padding: '8px', borderRadius: '10px' }}><Power color="#fff" size={20} /></div>
            <h1 style={{ margin: 0, color: '#0F172A', fontSize: '22px', fontWeight: '800' }}>Command Center</h1>
          </div>
          <button onClick={handleLogout} style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', padding: '10px 16px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>

        <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
          
          {/* TABS */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', background: '#fff', padding: '8px', borderRadius: '16px', border: '1px solid #E2E8F0', width: 'fit-content' }}>
            <button 
              className={`tab-btn ${activeTab === 'active' ? 'tab-active' : 'tab-inactive'}`} 
              onClick={() => setActiveTab('active')}
              style={{ background: activeTab === 'active' ? '#1E293B' : 'transparent', color: activeTab === 'active' ? '#fff' : '#64748B' }}
            >
              <Store size={18} /> Live Vendors
            </button>
            <button 
              className={`tab-btn ${activeTab === 'pending' ? 'tab-active' : 'tab-inactive'}`} 
              onClick={() => setActiveTab('pending')}
              style={{ background: activeTab === 'pending' ? '#1E293B' : 'transparent', color: activeTab === 'pending' ? '#fff' : '#64748B' }}
            >
              <Clock size={18} /> Pending Approvals
              {pendingVendors.length > 0 && (
                <span style={{ background: '#EF4444', color: '#fff', fontSize: '12px', padding: '2px 8px', borderRadius: '20px' }}>{pendingVendors.length}</span>
              )}
            </button>
          </div>

          <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            
            {/* ==================================
                TAB 1: LIVE VENDORS (GOD MODE)
               ================================== */}
            {activeTab === 'active' && (
              <div style={{ overflowX: 'auto' }}>
                
                {/* 🟢 SEARCH BAR UI */}
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', gap: '16px', alignItems: 'center', background: '#F8FAFC' }}>
                  <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                    <Search size={18} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                      type="text" 
                      placeholder="Search by QR ID, Shop Name, or Phone..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '12px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748B', fontWeight: '600' }}>
                    Showing {filteredActiveVendors.length} vendors
                  </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <tr style={{ textAlign: 'left', color: '#64748B', fontSize: '13px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '16px 24px', fontWeight: '700' }}>Shop Name & Status</th>
                      <th style={{ padding: '16px 24px', fontWeight: '700' }}>Contact</th>
                      <th style={{ padding: '16px 24px', fontWeight: '700' }}>Queue Stats (Today)</th>
                      <th style={{ padding: '16px 24px', fontWeight: '700', textAlign: 'right' }}>God Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredActiveVendors.length === 0 ? (
                      <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>No active vendors found matching your search.</td></tr>
                    ) : (
                      filteredActiveVendors.map((vendor) => (
                        <tr key={vendor._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '16px 24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {vendor.is_open ? <div className="pulse-dot"></div> : <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#CBD5E1' }}></div>}
                              <div>
                                <div style={{ fontWeight: '800', color: '#0F172A', fontSize: '15px' }}>{vendor.shop_name}</div>
                                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>QR ID: <span style={{fontWeight: '700'}}>{vendor.qr_id || 'Generating...'}</span></div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '16px 24px', color: '#475569', fontSize: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14} /> {vendor.phone}</div>
                          </td>
                          <td style={{ padding: '16px 24px' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#F0FDF4', color: '#16A34A', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '700' }}>
                              <Users size={14} /> {vendor.today_tokens || 0} Processed Today
                            </div>
                          </td>
                          <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                            <button onClick={() => handleDelete(vendor._id, vendor.shop_name)} style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}>
                              <Trash2 size={14} /> Ban / Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* ==================================
                TAB 2: PENDING APPROVALS
               ================================== */}
            {activeTab === 'pending' && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <tr style={{ textAlign: 'left', color: '#64748B', fontSize: '13px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '16px 24px', fontWeight: '700' }}>Shop Name</th>
                      <th style={{ padding: '16px 24px', fontWeight: '700' }}>Documents</th>
                      <th style={{ padding: '16px 24px', fontWeight: '700' }}>GPS Location</th>
                      <th style={{ padding: '16px 24px', fontWeight: '700', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingVendors.length === 0 ? (
                      <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>No pending applications.</td></tr>
                    ) : (
                      pendingVendors.map((vendor) => {
                        let mapLat = null, mapLng = null;
                        if (vendor.location?.coordinates?.length === 2) {
                          mapLng = vendor.location.coordinates[0];
                          mapLat = vendor.location.coordinates[1];
                        }
                        return (
                          <tr key={vendor._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '16px 24px' }}>
                              <div style={{ fontWeight: '800', color: '#0F172A', fontSize: '15px' }}>{vendor.shop_name}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748B', marginTop: '6px' }}><Phone size={12} /> {vendor.phone}</div>
                            </td>
                            <td style={{ padding: '16px 24px', color: '#475569', fontSize: '13px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}><FileText size={14} /> {vendor.kyc_details?.document_type}</div>
                              <div style={{ marginTop: '4px', textTransform: 'uppercase' }}>{vendor.kyc_details?.document_number}</div>
                            </td>
                            <td style={{ padding: '16px 24px' }}>
                              {mapLat && mapLng ? (
                                <a href={`https://www.google.com/maps/search/?api=1&query=${mapLat},${mapLng}`} target="_blank" rel="noopener noreferrer"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#EFF6FF', color: '#2563EB', padding: '6px 12px', borderRadius: '8px', textDecoration: 'none', fontSize: '12px', fontWeight: '700' }}>
                                  <MapPin size={14} /> Verify on Map
                                </a>
                              ) : (
                                <span style={{ color: '#DC2626', fontSize: '12px', fontWeight: '700', background: '#FEE2E2', padding: '4px 8px', borderRadius: '6px' }}>No GPS Data</span>
                              )}
                            </td>
                            <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button onClick={() => handleApprove(vendor._id, vendor.shop_name)} style={{ background: '#10B981', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <CheckCircle size={14} /> Approve
                                </button>
                                {vendor.status !== 'rejected' && (
                                  <button onClick={() => handleReject(vendor._id, vendor.shop_name)} style={{ background: '#F59E0B', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <XCircle size={14} /> Reject
                                  </button>
                                )}
                                <button onClick={() => handleDelete(vendor._id, vendor.shop_name)} style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        </div>
      </div>
    </HelmetProvider>
  );
};

export default AdminDashboard;