import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useParams, useNavigate } from 'react-router-dom';

function ResetPassword() {
  const [password, setPassword] = useState('');
  const { token } = useParams(); // URL'deki token'ı al
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/api/auth/reset-password/${token}`, { password });
      toast.success('🎉 Şifreniz başarıyla değişti! Giriş yapabilirsiniz.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Bağlantı geçersiz.');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '30px', background: 'white', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
      <h2 style={{ textAlign: 'center' }}>🔑 Yeni Şifre Belirle</h2>
      
      <form onSubmit={handleSubmit}>
        <input 
          type="password" 
          placeholder="Yeni Şifreniz" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: '100%', padding: '10px', margin: '15px 0', borderRadius: '5px', border: '1px solid #ccc' }} 
        />
        <button type="submit" style={{ width: '100%', padding: '10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
          Şifreyi Değiştir
        </button>
      </form>
    </div>
  );
}

export default ResetPassword;