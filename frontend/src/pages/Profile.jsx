import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

function Profile() {
  const [user, setUser] = useState({
    pharmacyName: '',
    city: '',
    email: '',
    pharmacistName: '', 
    address: '',        
    phoneNumber: ''     
  });
  
  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token');

  // SAYFA AÇILINCA BİLGİLERİ GETİR (DÜZELTİLDİ)
  useEffect(() => {
    const fetchProfile = async () => {
        try {
            // Backend'e "Benim bilgilerimi ver" diyoruz
            const res = await axios.get('/api/auth/me', {
                headers: { 'x-auth-token': token }
            });
            
            // Gelen verileri kutucuklara dolduruyoruz
            setUser({
                pharmacyName: res.data.pharmacyName || '',
                city: res.data.city || '',
                email: res.data.email || '',
                pharmacistName: res.data.pharmacistName || '',
                address: res.data.address || '',
                phoneNumber: res.data.phoneNumber || ''
            });

        } catch (error) {
            console.error("Profil bilgileri çekilemedi:", error);
            // Token süresi dolmuşsa login'e atabiliriz ama şimdilik sadece loglayalım
        }
    };

    if (token) {
        fetchProfile();
    }
  }, [token]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (passwords.newPassword && passwords.newPassword !== passwords.confirmPassword) {
        return toast.error("Şifreler uyuşmuyor!");
    }

    setLoading(true);
    try {
        const res = await axios.put('/api/auth/update', {
            pharmacyName: user.pharmacyName,
            city: user.city,
            pharmacistName: user.pharmacistName,
            address: user.address,              
            phoneNumber: user.phoneNumber,      
            password: passwords.newPassword
        }, {
            headers: { 'x-auth-token': token }
        });

        toast.success("Profil ve iletişim bilgileri güncellendi!");
        
        // Güncel veriyi state'e de yazalım ki ekranda hemen görünsün
        if(res.data.user) {
            setUser(prev => ({
                ...prev,
                ...res.data.user
            }));
            
            // Üst menüdeki isim güncellensin diye localStorage'ı yenile
            localStorage.setItem('username', res.data.user.pharmacyName);
            // Sayfayı yenilemeye gerek yok, React state güncelledi zaten.
            // Ama üst bar değişsin diye reload atabiliriz.
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
    <div style={{ maxWidth: '600px', margin: '30px auto', padding: '25px', background: 'white', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
      <h2 style={{ textAlign: 'center', color: '#333', marginBottom:'20px' }}>👤 Eczane Profil Ayarları</h2>
      
      <form onSubmit={handleUpdate}>
        
        {/* TEMEL BİLGİLER */}
        <h4 style={{borderBottom:'1px solid #eee', paddingBottom:'5px', color:'#007bff'}}>Kurumsal Bilgiler</h4>
        <div style={{ display:'flex', gap:'15px', flexWrap:'wrap' }}>
            <div style={{ flex:1, minWidth:'250px', marginBottom: '15px' }}>
                <label style={labelStyle}>Eczane Adı:</label>
                <input type="text" value={user.pharmacyName} onChange={(e) => setUser({...user, pharmacyName: e.target.value})} style={inputStyle} />
            </div>
            <div style={{ flex:1, minWidth:'250px', marginBottom: '15px' }}>
                <label style={labelStyle}>Eczacı Adı Soyadı:</label>
                <input type="text" placeholder="Örn: Ecz. Ahmet Yılmaz" value={user.pharmacistName} onChange={(e) => setUser({...user, pharmacistName: e.target.value})} style={inputStyle} />
            </div>
        </div>

        {/* İLETİŞİM BİLGİLERİ */}
        <h4 style={{borderBottom:'1px solid #eee', paddingBottom:'5px', color:'#28a745', marginTop:'10px'}}>İletişim Bilgileri</h4>
        <div style={{ marginBottom: '15px' }}>
            <label style={labelStyle}>Telefon Numarası:</label>
            <input type="text" placeholder="05XX XXX XX XX" value={user.phoneNumber} onChange={(e) => setUser({...user, phoneNumber: e.target.value})} style={inputStyle} />
        </div>
        <div style={{ marginBottom: '15px' }}>
            <label style={labelStyle}>Açık Adres:</label>
            <textarea rows="3" placeholder="Mahalle, Cadde, No..." value={user.address} onChange={(e) => setUser({...user, address: e.target.value})} style={{...inputStyle, resize:'vertical'}} />
        </div>
        <div style={{ marginBottom: '15px' }}>
            <label style={labelStyle}>Şehir:</label>
            <input type="text" value={user.city} onChange={(e) => setUser({...user, city: e.target.value})} style={inputStyle} />
        </div>

        {/* ŞİFRE DEĞİŞTİRME */}
        <h4 style={{borderBottom:'1px solid #eee', paddingBottom:'5px', color:'#dc3545', marginTop:'10px'}}>Güvenlik</h4>
        <div style={{ display:'flex', gap:'15px', flexWrap:'wrap' }}>
            <div style={{ flex:1, marginBottom: '15px' }}>
                <input type="password" placeholder="Yeni Şifre (İsteğe bağlı)" value={passwords.newPassword} onChange={(e) => setPasswords({...passwords, newPassword: e.target.value})} style={inputStyle} />
            </div>
            <div style={{ flex:1, marginBottom: '20px' }}>
                <input type="password" placeholder="Şifre Tekrar" value={passwords.confirmPassword} onChange={(e) => setPasswords({...passwords, confirmPassword: e.target.value})} style={inputStyle} />
            </div>
        </div>

        <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? 'Kaydediliyor...' : '💾 Bilgileri Güncelle'}
        </button>
      </form>
    </div>
  );
}

const labelStyle = { display:'block', marginBottom:'5px', fontWeight:'bold', fontSize:'0.9em', color:'#555' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' };
const buttonStyle = { width: '100%', padding: '15px', background: '#333', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize:'1.1em' };

export default Profile;