import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:5000/api/admin'; 

const AdminDashboard = () => {
  const navigate = useNavigate();
  
  const [token, setToken] = useState(localStorage.getItem('adminToken') || '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) fetchPendingVendors();
  }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/login`, { username, password });
      if (res.data.success) {
        setToken(res.data.token);
        localStorage.setItem('adminToken', res.data.token);
        alert(res.data.message);
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
      setVendors(res.data.data);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        handleLogout();
      }
      console.error('Error fetching vendors', error);
    }
  };

  const handleApprove = async (vendorId, shopName) => {
    if (!window.confirm(`Are you sure you want to approve ${shopName}?`)) return;
    try {
      await axios.patch(`${API_URL}/approve/${vendorId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPendingVendors(); 
    } catch (error) {
      alert('Error occurred during approval');
    }
  };

  // 🟢 NAYA: Soft Reject (Send to Red Page)
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

  // 🟢 NAYA: Hard Delete (Permanently Remove Spammer)
  const handleDelete = async (vendorId, shopName) => {
    if (!window.confirm(`🚨 BRAHMASTRA: Are you sure you want to PERMANENTLY DELETE ${shopName}? This cannot be undone!`)) return;
    try {
      await axios.delete(`${API_URL}/delete/${vendorId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPendingVendors();
    } catch (error) {
      alert('Error occurred during deletion');
    }
  };

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('adminToken');
  };

  // ==============================
  // UI - 1: LOGIN SCREEN
  // ==============================
  if (!token) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#121212' }}>
        <div className="card-dark" style={{ padding: '40px', width: '100%', maxWidth: '400px', borderRadius: '15px' }}>
          <h2 style={{ color: '#fff', textAlign: 'center', marginBottom: '20px' }}>ADMIN LOGIN</h2>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input type="text" placeholder="Admin Username" className="input-field" value={username} onChange={(e) => setUsername(e.target.value)} required />
            <input type="password" placeholder="Password" className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="submit" className="btn-light" disabled={loading}>
              {loading ? 'Verifying...' : 'Access Control Room'}
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
    <div style={{ padding: '20px', backgroundColor: '#f4f6f8', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', backgroundColor: '#fff', padding: '15px 20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
        <h1 style={{ margin: 0, color: '#333' }}>Qzkip Admin</h1>
        <button onClick={handleLogout} style={{ backgroundColor: '#ff4d4d', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
          Logout
        </button>
      </div>

      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
        <h2 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px', color: '#444' }}>Pending & Rejected Applications ({vendors.length})</h2>
        
        {vendors.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#888', marginTop: '20px' }}>No new vendor applications are pending.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f0f0f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Shop Name</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Phone</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Doc Info</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Status</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((vendor) => (
                  <tr key={vendor._id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold', color: '#333' }}>{vendor.shop_name}</td>
                    <td style={{ padding: '12px', color: '#555' }}>{vendor.phone}</td>
                    <td style={{ padding: '12px', color: '#555' }}>
                      <span style={{fontWeight: 'bold'}}>{vendor.kyc_details?.document_type}:</span> <br/>
                      <span style={{textTransform: 'uppercase'}}>{vendor.kyc_details?.document_number}</span>
                    </td>
                    
                    {/* 🟢 NAYA: Admin ko status dikhega */}
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                        backgroundColor: vendor.status === 'rejected' ? '#FEE2E2' : '#FEF3C7',
                        color: vendor.status === 'rejected' ? '#DC2626' : '#D97706'
                      }}>
                        {vendor.status.toUpperCase()}
                      </span>
                    </td>
                    
                    <td style={{ padding: '12px', display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleApprove(vendor._id, vendor.shop_name)} style={{ backgroundColor: '#4CAF50', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer' }}>
                        Approve
                      </button>
                      
                      {/* Reject button (Send for correction) */}
                      {vendor.status !== 'rejected' && (
                        <button onClick={() => handleReject(vendor._id, vendor.shop_name)} style={{ backgroundColor: '#FF9800', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer' }}>
                          Reject
                        </button>
                      )}

                      {/* 🗑️ Delete Spammer Button */}
                      <button onClick={() => handleDelete(vendor._id, vendor.shop_name)} style={{ backgroundColor: '#DC2626', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer' }} title="Delete Permanently">
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;