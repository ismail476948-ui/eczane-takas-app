import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const isAdmin = localStorage.getItem('isAdmin') === 'true';

  // Verileri Çek
  useEffect(() => {
    if (!token || !isAdmin) {
        navigate('/');
        return;
    }

    const fetchUsers = async () => {
      try {
        const res = await axios.get('/api/admin/users', {
            headers: { 'x-auth-token': token }
        });
        setUsers(res.data);
        setLoading(false);
      } catch (error) {
        toast.error("Kullanıcılar yüklenemedi.");
        setLoading(false);
      }
    };
    fetchUsers();
  }, [token, isAdmin, navigate]);

  // Kullanıcı Silme Fonksiyonu
  const handleDeleteUser = async (id, username) => {
    if (window.confirm(`${username} adlı eczaneyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz!`)) {
        try {
            await axios.delete(`/api/admin/users/${id}`, {
                headers: { 'x-auth-token': token }
            });
            toast.success("Kullanıcı silindi.");
            // Listeden de çıkar
            setUsers(users.filter(user => user._id !== id));
        } catch (error) {
            toast.error(error.response?.data?.message || "Silme işlemi başarısız.");
        }
    }
  };

  if (loading) return <div style={{textAlign:'center', marginTop:'50px'}}>Yükleniyor...</div>;

  return (
    <div>
      <h2 style={{ textAlign: 'center', color: '#333', marginBottom: '20px' }}>👥 Kullanıcı Yönetimi</h2>
      
      <div style={{ overflowX: 'auto', background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
                <tr style={{ background: '#f8f9fa', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                    <th style={thStyle}>Eczane Adı</th>
                    <th style={thStyle}>Kullanıcı Adı</th>
                    <th style={thStyle}>Şehir</th>
                    <th style={thStyle}>E-posta</th>
                    <th style={thStyle}>Yetki</th>
                    <th style={thStyle}>İşlem</th>
                </tr>
            </thead>
            <tbody>
                {users.map(user => (
                    <tr key={user._id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={tdStyle}>{user.pharmacyName}</td>
                        <td style={tdStyle}>{user.username}</td>
                        <td style={tdStyle}>{user.city}</td>
                        <td style={tdStyle}>{user.email}</td>
                        <td style={tdStyle}>
                            {user.isAdmin ? 
                                <span style={{background:'#28a745', color:'white', padding:'3px 8px', borderRadius:'5px', fontSize:'0.8em'}}>Admin</span> : 
                                <span style={{background:'#6c757d', color:'white', padding:'3px 8px', borderRadius:'5px', fontSize:'0.8em'}}>Üye</span>
                            }
                        </td>
                        <td style={tdStyle}>
                            {!user.isAdmin && (
                                <button 
                                    onClick={() => handleDeleteUser(user._id, user.pharmacyName)}
                                    style={{ background: '#dc3545', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer' }}>
                                    🗑 Sil
                                </button>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
      
      <div style={{marginTop:'20px', textAlign:'center'}}>
        <button onClick={() => navigate('/admin')} style={{background:'#333', color:'white', border:'none', padding:'10px 20px', borderRadius:'5px', cursor:'pointer'}}>🔙 Panele Dön</button>
      </div>
    </div>
  );
}

const thStyle = { padding: '12px', color: '#555' };
const tdStyle = { padding: '12px', color: '#333' };

export default AdminUsers;