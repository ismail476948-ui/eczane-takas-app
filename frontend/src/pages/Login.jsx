import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Localhost silindi
      const res = await axios.post('/api/auth/login', formData);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('userId', res.data.user.id);
      localStorage.setItem('username', res.data.user.pharmacyName);
      localStorage.setItem('isAdmin', res.data.user.isAdmin);
      
      toast.success("Giriş Başarılı!");
      setTimeout(() => window.location.href = '/', 1000);
    } catch (err) {
      toast.error(err.response?.data?.message || "Giriş Hatası");
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ddd', borderRadius: '10px', background: 'white' }}>
      <h2 style={{ textAlign: 'center' }}>Giriş Yap</h2>
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="E-posta" required onChange={(e) => setFormData({...formData, email: e.target.value})} style={{ width: '100%', padding: '10px', margin: '10px 0' }} />
        <input type="password" placeholder="Şifre" required onChange={(e) => setFormData({...formData, password: e.target.value})} style={{ width: '100%', padding: '10px', margin: '10px 0' }} />
        <button type="submit" style={{ width: '100%', padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Giriş Yap</button>
      </form>
    </div>
  );
}

export default Login;