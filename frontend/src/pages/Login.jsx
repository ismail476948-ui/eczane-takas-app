import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';

function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post('/api/auth/login', formData);

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('userId', res.data.user.id);
      localStorage.setItem('username', res.data.user.pharmacyName);
      localStorage.setItem('isAdmin', res.data.user.isAdmin);
      
      toast.success("Giriş Başarılı!");
      setTimeout(() => window.location.href = '/', 1000);

    } catch (err) {
      // Hata mesajını backend'den alıp gösteriyoruz
      toast.error(err.response?.data?.message || "Giriş yapılamadı.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '30px', border: '1px solid #ddd', borderRadius: '15px', background: 'white', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
      <h2 style={{ textAlign: 'center', color: '#333', marginBottom: '20px' }}>🔐 Giriş Yap</h2>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
            <label style={{ display:'block', marginBottom:'5px', color:'#666' }}>E-posta:</label>
            <input type="email" placeholder="ornek@eczane.com" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '5px', border: '1px solid #ccc' }} />
        </div>
        <div style={{ marginBottom: '20px' }}>
            <label style={{ display:'block', marginBottom:'5px', color:'#666' }}>Şifre:</label>
            <input type="password" placeholder="******" required value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '5px', border: '1px solid #ccc' }} />
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>{loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}</button>
      </form>

      <div style={{ marginTop: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>Hesabınız yok mu? <Link to="/register" style={{ color: '#28a745', fontWeight: 'bold', textDecoration:'none' }}>Hemen Kayıt Olun</Link></div>
          <div><Link to="/forgot-password" style={{ color: '#dc3545', textDecoration:'underline' }}>Şifremi Unuttum</Link></div>
      </div>
    </div>
  );
}

export default Login;