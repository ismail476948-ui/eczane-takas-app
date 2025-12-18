import { useEffect, useState } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import io from 'socket.io-client';

// Sayfalar
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import AddMedicine from './pages/AddMedicine';
import MyInventory from './pages/MyInventory';
import Exchanges from './pages/Exchanges';
import EditMedicine from './pages/EditMedicine';
import CurrentAccount from './pages/CurrentAccount';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Admin Sayfaları
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminMedicines from './pages/AdminMedicines';

import './App.css';

// Socket bağlantısı (Otomatik algılaması için içi boş)
const socket = io.connect();

function App() {
  const token = localStorage.getItem('token');
  const currentUserId = localStorage.getItem('userId');
  const currentUsername = localStorage.getItem('username');
  
  const isAdmin = localStorage.getItem('isAdmin') === 'true';

  const [notificationCount, setNotificationCount] = useState(0);

  const handleLogout = () => {
    if(window.confirm("Çıkış yapmak istediğinize emin misiniz?")) {
        localStorage.clear();
        window.location.href = '/login';
    }
  };

  const resetNotification = () => {
    setNotificationCount(0);
  };

  useEffect(() => {
    if (token && currentUserId) {
        socket.emit('register', currentUserId);

        const fetchOrders = async () => {
            try {
                // Localhost silindi, sadece /api kaldı
                const response = await axios.get('/api/orders', {
                    headers: { 'x-auth-token': token }
                });
                const pendingOrders = response.data.filter(order => 
                    order.status === 'Beklemede' && order.seller._id === currentUserId
                );
                setNotificationCount(pendingOrders.length);
            } catch (error) {
                console.error("Bildirim hatası:", error);
            }
        };
        fetchOrders();

        socket.on('receive_notification', (data) => {
            setNotificationCount(prev => prev + 1);
            if (data.type === 'new_order') {
                toast.info(`🔔 Yeni bir ilaç talebi geldi!`);
            } else if (data.type === 'status_update') {
                toast.success(`🔄 Bir takasın durumu güncellendi: ${data.status}`);
            } else if (data.type === 'message') {
                toast.info(`💬 Yeni mesajınız var!`);
            }
        });
    }

    return () => {
        socket.off('receive_notification');
    };
  }, [token, currentUserId]);

  return (
    <Router>
      <ToastContainer position="top-right" autoClose={3000} />

      <nav style={{ padding: '15px 20px', background: '#333', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ fontSize: '1.2em', fontWeight: 'bold' }}>💊 EczaneTakas</span>
          
          {isAdmin && (
            <Link to="/admin" style={{ background: '#dc3545', color: 'white', textDecoration: 'none', padding: '5px 10px', borderRadius: '5px', fontSize: '0.9em', fontWeight: 'bold' }}>
                👑 Admin Paneli
            </Link>
          )}

          {currentUsername && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderLeft: '1px solid #555', paddingLeft: '15px' }}>
              <Link to="/profile" style={{ color: '#ddd', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
                 👤 <span style={{ textDecoration: 'underline' }}>Sn. {currentUsername}</span>
              </Link>
              <button onClick={handleLogout} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8em', marginLeft: '10px' }}>
                Çıkış
              </button>
            </div>
          )}
        </div>

        <div>
          <Link to="/" style={{ color: 'white', textDecoration: 'none', marginRight: '20px' }}>🏪 Pazar Yeri</Link>
          
          {token && (
            <>
              <Link to="/exchanges" style={{ color: '#ffc107', textDecoration: 'none', fontWeight: 'bold', marginRight: '20px', position: 'relative' }}>
                🔄 Takaslarım
                {notificationCount > 0 && (
                  <span style={{ position: 'absolute', top: '-10px', right: '-12px', background: 'red', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '0.7em', fontWeight: 'bold', animation: 'pulse 2s infinite' }}>
                    {notificationCount}
                  </span>
                )}
              </Link>

              <Link to="/my-inventory" style={{ color: '#4facfe', textDecoration: 'none', fontWeight: 'bold', marginRight: '20px' }}>
                📂 Envanterim
              </Link>

              <Link to="/current-account" style={{ color: '#28a745', textDecoration: 'none', fontWeight: 'bold', marginRight: '20px' }}>
                💰 Cari Hesap
              </Link>
            </>
          )}

          {!token && (
            <Link to="/login" style={{ color: '#28a745', textDecoration: 'none', fontWeight: 'bold' }}>Giriş Yap</Link>
          )}
        </div>
      </nav>

      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/add-medicine" element={<AddMedicine />} />
          <Route path="/my-inventory" element={<MyInventory />} />
          <Route path="/exchanges" element={<Exchanges onPageLoad={resetNotification} />} />
          <Route path="/edit-medicine/:id" element={<EditMedicine />} />
          <Route path="/current-account" element={<CurrentAccount />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/medicines" element={<AdminMedicines />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;