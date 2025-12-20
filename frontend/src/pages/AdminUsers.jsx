import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const token = localStorage.getItem('token');

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/admin/users', { headers: { 'x-auth-token': token } });
      setUsers(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // KULLANICI ONAYLA
  const handleApprove = async (id) => {
    if(window.confirm("Bu kullanıcıyı onaylamak istiyor musunuz?")) {
        try {
            await axios.put(`/api/admin/users/approve/${id}`, {}, { headers: { 'x-auth-token': token } });
            toast.success("Kullanıcı onaylandı.");
            fetchUsers();
        } catch (error) {
            toast.error("İşlem başarısız.");
        }
    }
  };

  // KULLANICI SİL
  const handleDelete = async (id) => {
    if(window.confirm("Kullanıcıyı silmek istediğinize emin misiniz?")) {
        try {
            await axios.delete(`/api/admin/users/${id}`, { headers: { 'x-auth-token': token } });
            toast.success("Kullanıcı silindi.");
            fetchUsers();
        } catch (error) {
            toast.error("Hata oluştu.");
        }
    }
  };

  // --- YENİ: ŞİFRE SIFIRLA ---
  const handleResetPassword = async (user) => {
    // Tarayıcının standart penceresiyle yeni şifreyi soralım
    const newPassword = window.prompt(`${user.pharmacyName} kullanıcısı için YENİ şifreyi girin:`);

    if (newPassword === null) return; // İptal ederse çık
    if (newPassword.length < 6) return toast.warning("Şifre en az 6 karakter olmalı.");

    try {
        await axios.put(`/api/admin/users/reset-password/${user._id}`, 
            { newPassword }, 
            { headers: { 'x-auth-token': token } }
        );
        toast.success(`Şifre başarıyla değiştirildi: ${newPassword}`);
    } catch (error) {
        toast.error("Şifre değiştirilemedi.");
    }
  };

  return (
    <div>
      <h2 style={{ textAlign: 'center', color: '#333' }}>👥 Kullanıcı Yönetimi</h2>
      <div style={{ overflowX: 'auto', marginTop: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
            <thead>
                <tr style={{ background: '#333', color: 'white' }}>
                    <th style={{ padding: '10px' }}>Eczane Adı</th>
                    <th style={{ padding: '10px' }}>Şehir</th>
                    <th style={{ padding: '10px' }}>E-posta</th>
                    <th style={{ padding: '10px' }}>Durum</th>
                    <th style={{ padding: '10px' }}>İşlemler</th>
                </tr>
            </thead>
            <tbody>
                {users.map(user => (
                    <tr key={user._id} style={{ borderBottom: '1px solid #ddd', textAlign: 'center' }}>
                        <td style={{ padding: '10px' }}>{user.pharmacyName}</td>
                        <td style={{ padding: '10px' }}>{user.city}</td>
                        <td style={{ padding: '10px' }}>{user.email}</td>
                        <td style={{ padding: '10px' }}>
                            {user.isApproved ? (
                                <span style={{ color: 'green', fontWeight: 'bold' }}>✅ Onaylı</span>
                            ) : (
                                <span style={{ color: '#ffc107', fontWeight: 'bold' }}>⏳ Bekliyor</span>
                            )}
                        </td>
                        <td style={{ padding: '10px', display:'flex', justifyContent:'center', gap:'5px' }}>
                            {/* ONAY BUTONU */}
                            {!user.isApproved && (
                                <button onClick={() => handleApprove(user._id)} style={btnStyle('#28a745')}>
                                    Onayla
                                </button>
                            )}
                            
                            {/* ŞİFRE SIFIRLA BUTONU (YENİ) */}
                            <button onClick={() => handleResetPassword(user)} style={btnStyle('#17a2b8')}>
                                🔑 Şifre
                            </button>

                            {/* SİL BUTONU */}
                            <button onClick={() => handleDelete(user._id)} style={btnStyle('#dc3545')}>
                                Sil
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
}

// Buton stili (Tekrarı önlemek için fonksiyon yaptım)
const btnStyle = (bgColor) => ({
    background: bgColor,
    color: 'white',
    border: 'none',
    padding: '5px 10px',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '0.9em'
});

export default AdminUsers;