import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/api/auth/forgot-password', { email });
      toast.success("Sıfırlama linki e-postanıza gönderildi (Spam kutusunu kontrol edin).");
    } catch (error) {
      toast.error(error.response?.data?.message || "Hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', background:'white', borderRadius:'10px', boxShadow:'0 2px 10px rgba(0,0,0,0.1)' }}>
      <h2 style={{textAlign:'center'}}>🔑 Şifremi Unuttum</h2>
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Kayıtlı E-posta Adresiniz" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '10px', margin: '15px 0', borderRadius:'5px', border:'1px solid #ccc' }} />
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            {loading ? 'Gönderiliyor...' : 'Sıfırlama Linki Gönder'}
        </button>
      </form>
    </div>
  );
}

export default ForgotPassword;