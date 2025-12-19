import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

function Profile() {
  const [user, setUser] = useState({ pharmacyName: '', city: '', email: '' });
  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');

  // Mevcut bilgileri çek (Admin panelindeki user listesinden veya token'dan alabiliriz ama en temiz user verisi için endpoint yapmadık, o yüzden localStorage'ı kullanacağız veya login'de gelen veriyi)
  // En sağlıklısı backend'e "beni getir" (`/me`) rotası eklemektir ama işi uzatmamak için
  // Admin rotasını kullanarak kendi verimizi çekeceğiz veya direkt login bilgilerini kullanacağız.
  // Burada basitlik adına localStorage'daki ismi gösterip, inputları boş başlatabiliriz.
  // YA DA: Backend'den çekelim.

  useEffect(() => {
    // Profil bilgilerini çekmek için basit bir istek (auth check gibi)
    // Şimdilik inputları boş bırakıyorum, kullanıcı değiştirmek istediğini yazar.
    // Mevcut ismi localStorage'dan alalım.
    const savedName = localStorage.getItem('username');
    if(savedName) setUser(prev => ({...prev, pharmacyName: savedName}));
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (passwords.newPassword && passwords.newPassword !== passwords.confirmPassword) {
        return toast.error("Şifreler uyuşmuyor!");
    }

    setLoading(true);
    try {
        // GÜNCELLEME: Doğru endpoint
        const res = await axios.put('/api/auth/update', {
            pharmacyName: user.pharmacyName,
            city: user.city,
            password: passwords.newPassword
        }, {
            headers: { 'x-auth-token': token }
        });

        toast.success("Profil güncellendi!");
        
        // Eğer isim değiştiyse localStorage'ı da güncelle
        if (user.pharmacyName) {
            localStorage.setItem('username', user.pharmacyName);
            // Sayfayı yenile ki üst menüdeki isim de değişsin
            setTimeout(() => window.location.reload(), 1000);
        }

    } catch (error) {
        console.error(error);
        toast.error("Güncelleme başarısız.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '30px auto', padding: '20px', background: 'white', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
      <h2 style={{ textAlign: 'center', color: '#333' }}>👤 Profil Ayarları</h2>
      
      <form onSubmit={handleUpdate}>
        <div style={{ marginBottom: '15px' }}>
            <label>Eczane Adı:</label>
            <input 
                type="text" 
                placeholder="Yeni isim (değişmeyecekse boş bırakın)" 
                value={user.pharmacyName} 
                onChange={(e) => setUser({...user, pharmacyName: e.target.value})}
                style={inputStyle} 
            />
        </div>

        <div style={{ marginBottom: '15px' }}>
            <label>Şehir:</label>
            <input 
                type="text" 
                placeholder="Şehir değiştir..." 
                value={user.city} 
                onChange={(e) => setUser({...user, city: e.target.value})}
                style={inputStyle} 
            />
        </div>

        <hr style={{ margin: '20px 0', border: '0', borderTop: '1px solid #eee' }} />
        <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '10px' }}>🔐 Şifre Değiştir (İsteğe Bağlı)</p>

        <div style={{ marginBottom: '15px' }}>
            <input 
                type="password" 
                placeholder="Yeni Şifre" 
                value={passwords.newPassword} 
                onChange={(e) => setPasswords({...passwords, newPassword: e.target.value})}
                style={inputStyle} 
            />
        </div>

        <div style={{ marginBottom: '20px' }}>
            <input 
                type="password" 
                placeholder="Yeni Şifre (Tekrar)" 
                value={passwords.confirmPassword} 
                onChange={(e) => setPasswords({...passwords, confirmPassword: e.target.value})}
                style={inputStyle} 
            />
        </div>

        <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </form>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', marginTop: '5px' };
const buttonStyle = { width: '100%', padding: '12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' };

export default Profile;