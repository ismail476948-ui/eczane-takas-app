import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, medicines: 0, orders: 0, activeOrders: 0 });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const isAdmin = localStorage.getItem('isAdmin') === 'true';

  useEffect(() => {
    if (!token || !isAdmin) { navigate('/'); return; }

    const fetchStats = async () => {
      try {
        // GÜNCELLEME
        const res = await axios.get('/api/admin/stats', { headers: { 'x-auth-token': token } });
        setStats(res.data);
        setLoading(false);
      } catch (error) { setLoading(false); }
    };
    fetchStats();
  }, [token, isAdmin, navigate]);

  if (loading) return <div style={{textAlign:'center', marginTop:'50px'}}>Yönetici paneli yükleniyor...</div>;

  return (
    <div>
      <h1 style={{ textAlign: 'center', color: '#333', marginBottom:'30px' }}>👑 Yönetici Paneli</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
        <div style={cardStyle('#4facfe')}><h3>👥 Toplam Eczane</h3><p style={{ fontSize: '2.5em', fontWeight: 'bold' }}>{stats.users}</p></div>
        <div style={cardStyle('#00f260')}><h3>💊 Sistemdeki İlaç</h3><p style={{ fontSize: '2.5em', fontWeight: 'bold' }}>{stats.medicines}</p></div>
        <div style={cardStyle('#ff9a9e')}><h3>🔄 Toplam Takas</h3><p style={{ fontSize: '2.5em', fontWeight: 'bold' }}>{stats.orders}</p></div>
        <div style={cardStyle('#f6d365')}><h3>⏳ Aktif İşlemler</h3><p style={{ fontSize: '2.5em', fontWeight: 'bold' }}>{stats.activeOrders}</p></div>
      </div>
      <div style={{ marginTop: '50px', textAlign: 'center' }}>
        <h3 style={{ borderBottom: '1px solid #ddd', paddingBottom: '10px', display:'inline-block' }}>Hızlı İşlemler</h3>
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '20px' }}>
            <button style={actionBtnStyle} onClick={() => navigate('/admin/users')}>👤 Kullanıcıları Yönet</button>
            <button style={actionBtnStyle} onClick={() => navigate('/admin/medicines')}>💊 İlaçları Yönet</button>
        </div>
      </div>
    </div>
  );
}

const cardStyle = (color) => ({ width: '250px', padding: '20px', borderRadius: '15px', background: `linear-gradient(135deg, ${color} 0%, rgba(255,255,255,0.5) 100%)`, boxShadow: '0 4px 15px rgba(0,0,0,0.1)', textAlign: 'center', color: '#333' });
const actionBtnStyle = { padding: '15px 30px', fontSize: '1em', background: '#333', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', transition: 'background 0.3s' };

export default AdminDashboard;