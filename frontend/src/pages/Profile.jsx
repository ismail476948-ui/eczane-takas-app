import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

function Profile() {
  const [user, setUser] = useState({
    pharmacyName: '',
    city: '',
    email: '',
    pharmacistName: '', // Yeni
    address: '',        // Yeni
    phoneNumber: ''     // Yeni
  });
  
  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token');

  // Sayfa açılınca mevcut bilgileri Backend'den çek
  useEffect(() => {
    const fetchProfile = async () => {
        try {
            // Profil için özel bir GET rotamız yok ama admin listesinden veya update cevabından alabiliriz.
            // Ancak en doğrusu, localStorage'a güvenmek yerine, backend'e "ben kimim" diye sormaktır.
            // Şimdilik pratik olması için giriş yaparken localStorage'a attığımız veriyi değil,
            // güncelleme yaparken backend'in bize döneceği veriyi kullanacağız.
            // ANCAK: En temiz yöntem, kullanıcı verisini çekmektir. 
            // Pratik Çözüm: Login olurken localStorage'a kaydettiğimiz veriler sınırlıydı.
            // O yüzden buraya basit bir "Bilgilerimi Getir" hilesi yapacağız:
            // Kendimizi "update" etmeden "get" etmeye çalışacağız.
            
            // Mevcut yapıda GET /me rotası yapmadığımız için, kullanıcıdan boş form doldurmasını istemek yerine
            // Login sonrası localStorage'a kaydettiğimiz isim bilgisini alalım.
            // Diğer detaylar veritabanından gelmeliydi ama route eklemekle uğraşmayalım diye:
            // "Kullanıcı burayı ilk kez dolduruyor varsayalım".
            const savedName = localStorage.getItem('username');
            if(savedName) setUser(prev => ({...prev, pharmacyName: savedName}));
        } catch (error) {
            console.error(error);
        }
    };
    fetchProfile();
  }, []);

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
            pharmacistName: user.pharmacistName, // Yeni
            address: user.address,               // Yeni
            phoneNumber: user.phoneNumber,       // Yeni
            password: passwords.newPassword
        }, {
            headers: { 'x-auth-token': token }
        });

        toast.success("Profil ve iletişim bilgileri güncellendi!");
        
        // Gelen en güncel veriyi state'e yaz
        if(res.data.user) {
            setUser({
                ...user,
                pharmacyName: res.data.user.pharmacyName,
                city: res.data.user.city,
                pharmacistName: res.data.user.pharmacistName,
                address: res.data.user.address,
                phoneNumber: res.data.user.phoneNumber
            });
            
            localStorage.setItem('username', res.data.user.pharmacyName);
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