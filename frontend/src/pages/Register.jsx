import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

function Register() {
  const [formData, setFormData] = useState({ pharmacyName: '', city: '', email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Localhost silindi
      await axios.post('/api/auth/register', formData);
      toast.success("Kayıt Başarılı! Giriş yapabilirsiniz.");
      setTimeout(() => window.location.href = '/login', 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || "Kayıt Hatası");
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ddd', borderRadius: '10px', background: 'white' }}>
      <h2 style={{ textAlign: 'center' }}>Kayıt Ol</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Eczane Adı" required onChange={(e) => setFormData({...formData, pharmacyName: e.target.value})} style={{ width: '100%', padding: '10px', margin: '10px 0' }} />
        <input type="text" placeholder="Şehir" required onChange={(e) => setFormData({...formData, city: e.target.value})} style={{ width: '100%', padding: '10px', margin: '10px 0' }} />
        <input type="email" placeholder="E-posta" required onChange={(e) => setFormData({...formData, email: e.target.value})} style={{ width: '100%', padding: '10px', margin: '10px 0' }} />
        <input type="password" placeholder="Şifre" required onChange={(e) => setFormData({...formData, password: e.target.value})} style={{ width: '100%', padding: '10px', margin: '10px 0' }} />
        <button type="submit" style={{ width: '100%', padding: '10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Kayıt Ol</button>
      </form>
    </div>
  );
}

export default Register;