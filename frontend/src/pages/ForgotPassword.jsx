import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

function ForgotPassword() {
  const [email, setEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/auth/forgot-password', { email });
      toast.success('📨 E-posta gönderildi! Lütfen kontrol edin.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Bir hata oluştu.');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '30px', background: 'white', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
      <h2 style={{ textAlign: 'center' }}>🔒 Şifremi Unuttum</h2>
      <p style={{ textAlign: 'center', color: '#666' }}>Sisteme kayıtlı e-posta adresinizi girin.</p>
      
      <form onSubmit={handleSubmit}>
        <input 
          type="email" 
          placeholder="E-posta adresiniz" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: '100%', padding: '10px', margin: '15px 0', borderRadius: '5px', border: '1px solid #ccc' }} 
        />
        <button type="submit" style={{ width: '100%', padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
          Sıfırlama Linki Gönder
        </button>
      </form>
    </div>
  );
}

export default ForgotPassword;