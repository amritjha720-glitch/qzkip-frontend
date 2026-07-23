import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// Components
import BottomNav from './components/BottomNav';

// Pages
import ShopListing from './pages/ShopListing';
import AdminDashboard from './pages/AdminDashboard';
import AuthScreen from './pages/AuthScreen';
import Dashboard from './pages/Dashboard';
import CustomerBooking from './pages/CustomerBooking';
import CustomerTracking from './pages/CustomerTracking';
import MyBookings from './pages/MyBookings';
import QueueHistory from './pages/QueueHistory';

// THE MASTER FIX: Ab har request ke sath secure cookie apne aap jayegi!
axios.defaults.withCredentials = true;

function App() {
  return (
    <Router>
      <div style={{ width: '100%', minHeight: '100vh', position: 'relative', background: '#F8F7F3', display: 'flex', flexDirection: 'column' }}> 
        <div style={{ flex: 1, paddingBottom: '20px' }}> 
          <Routes>
            <Route path="/" element={<ShopListing />} /> 
            <Route path="/vendor-login" element={<AuthScreen />} /> 
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/book/:qrId" element={<CustomerBooking />} /> 
            <Route path="/track/:qrId" element={<CustomerTracking />} />
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route path="/queue-history" element={<QueueHistory />} />
            <Route path="/boss-admin" element={<AdminDashboard />} />
          </Routes>
        </div>
        <BottomNav />
      </div>
    </Router>
  );
}

export default App;