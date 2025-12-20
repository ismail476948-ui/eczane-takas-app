import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) return toast.error("Şifreler uyuşmuyor.");

    try {
      await axios.post(`/api/auth/reset-password/${token}`, { password });
      toast.success("Şifreniz başarıyla değiştirildi! Giriş yapabilirsiniz.");
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      toast.error(error.response?.data?.message || "Link geçersiz veya süresi dolmuş.");
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', background:'white', borderRadius:'10px', boxShadow:'0 2px 10px rgba(0,0,0,0.1)' }}>
      <h2 style={{textAlign:'center'}}>🔒 Yeni Şifre Belirle</h2>
      <form onSubmit={handleSubmit}>
        <input type="password" placeholder="Yeni Şifre" required value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius:'5px', border:'1px solid #ccc' }} />
        <input type="password" placeholder="Şifre Tekrar" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius:'5px', border:'1px solid #ccc' }} />
        <button type="submit" style={{ width: '100%', padding: '10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Şifreyi Güncelle</button>
      </form>
    </div>
  );
}

export default ResetPassword;