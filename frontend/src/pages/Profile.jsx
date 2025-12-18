import { useState, useEffect } from 'react';
import axios from 'axios';

function Profile() {
  const [formData, setFormData] = useState({
    username: '',
    pharmacyName: '',
    city: '',
    currentPassword: '',
    newPassword: ''
  });

  const token = localStorage.getItem('token');

  // Mevcut bilgileri çek (Aslında localStorage'dan alabiliriz ama güncel olsun diye istek atabiliriz veya direkt formda gösterebiliriz. Basitlik için localStorage kullanıyoruz)
  useEffect(() => {
    // Gerçek uygulamada buraya /api/auth/me gibi bir istek atılır.
    // Şimdilik inputları boş bırakıyorum, kullanıcı değiştirmek istediğini yazar.
    // Veya localStorage'daki isimi koyalım:
    setFormData(prev => ({ ...prev, username: localStorage.getItem('username') || '' }));
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.put('/api/auth/update', formData, {
        headers: { 'x-auth-token': token }
      });
      
      // Başarılı olursa localStorage'ı güncelle
      localStorage.setItem('username', res.data.username);
      
      alert("✅ Profil bilgileriniz başarıyla güncellendi!");
      window.location.reload(); // Sayfayı yenile ki isim her yerde güncellensin
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Güncelleme başarısız.");
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
      <h2 style={{ textAlign: 'center', color: '#333', marginBottom: '20px' }}>👤 Profil Ayarları</h2>

      <form onSubmit={handleSubmit}>
        
        {/* BÖLÜM 1: GENEL BİLGİLER */}
        <h4 style={{ borderBottom: '2px solid #007bff', paddingBottom: '10px', color: '#007bff' }}>Kimlik Bilgileri</h4>
        
        <div style={{ marginBottom: '15px' }}>
            <label>Kullanıcı Adı:</label>
            <input type="text" name="username" value={formData.username} onChange={handleChange} placeholder="Yeni kullanıcı adı" style={{ width: '100%', padding: '10px', marginTop: '5px', border: '1px solid #ccc', borderRadius: '5px' }} />
        </div>

        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
            <div style={{ flex: 1 }}>
                <label>Eczane Adı:</label>
                <input type="text" name="pharmacyName" onChange={handleChange} placeholder="Yeni eczane adı" style={{ width: '100%', padding: '10px', marginTop: '5px', border: '1px solid #ccc', borderRadius: '5px' }} />
            </div>
            <div style={{ flex: 1 }}>
                <label>Şehir:</label>
                <input type="text" name="city" onChange={handleChange} placeholder="Şehir değiştir" style={{ width: '100%', padding: '10px', marginTop: '5px', border: '1px solid #ccc', borderRadius: '5px' }} />
            </div>
        </div>

        {/* BÖLÜM 2: ŞİFRE DEĞİŞTİRME */}
        <h4 style={{ borderBottom: '2px solid #dc3545', paddingBottom: '10px', color: '#dc3545', marginTop: '30px' }}>Güvenlik (Şifre Değiştir)</h4>
        <p style={{ fontSize: '0.8em', color: '#666' }}>Şifrenizi değiştirmek istemiyorsanız bu alanları boş bırakın.</p>

        <div style={{ marginBottom: '15px' }}>
            <label>Mevcut Şifre (Zorunlu):</label>
            <input type="password" name="currentPassword" onChange={handleChange} placeholder="******" style={{ width: '100%', padding: '10px', marginTop: '5px', border: '1px solid #ccc', borderRadius: '5px' }} />
        </div>

        <div style={{ marginBottom: '20px' }}>
            <label>Yeni Şifre:</label>
            <input type="password" name="newPassword" onChange={handleChange} placeholder="******" style={{ width: '100%', padding: '10px', marginTop: '5px', border: '1px solid #ccc', borderRadius: '5px' }} />
        </div>

        <button type="submit" style={{ width: '100%', padding: '12px', background: 'linear-gradient(to right, #007bff, #0056b3)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.1em', cursor: 'pointer', fontWeight: 'bold' }}>
            💾 Değişiklikleri Kaydet
        </button>
      </form>
    </div>
  );
}

export default Profile;