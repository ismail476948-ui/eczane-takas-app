import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

function AdminMedicines() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const isAdmin = localStorage.getItem('isAdmin') === 'true';

  // İlaçları Çek
  useEffect(() => {
    if (!token || !isAdmin) {
        navigate('/');
        return;
    }

    const fetchMedicines = async () => {
      try {
        const res = await axios.get('/api/admin/medicines', {
            headers: { 'x-auth-token': token }
        });
        setMedicines(res.data);
        setLoading(false);
      } catch (error) {
        toast.error("İlaçlar yüklenemedi.");
        setLoading(false);
      }
    };
    fetchMedicines();
  }, [token, isAdmin, navigate]);

  // İlaç Silme Fonksiyonu
  const handleDeleteMedicine = async (id, name) => {
    if (window.confirm(`'${name}' ilanı sistemden silinecek. Emin misiniz?`)) {
        try {
            await axios.delete(`/api/admin/medicines/${id}`, {
                headers: { 'x-auth-token': token }
            });
            toast.success("İlaç silindi.");
            // Listeden çıkar
            setMedicines(medicines.filter(med => med._id !== id));
        } catch (error) {
            toast.error("Silme işlemi başarısız.");
        }
    }
  };

  if (loading) return <div style={{textAlign:'center', marginTop:'50px'}}>Yükleniyor...</div>;

  return (
    <div>
      <h2 style={{ textAlign: 'center', color: '#333', marginBottom: '20px' }}>💊 İlaç Yönetimi</h2>
      
      <div style={{ overflowX: 'auto', background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
                <tr style={{ background: '#f8f9fa', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                    <th style={thStyle}>İlaç Adı</th>
                    <th style={thStyle}>Eczane</th>
                    <th style={thStyle}>Adet</th>
                    <th style={thStyle}>Fiyat</th>
                    <th style={thStyle}>SKT</th>
                    <th style={thStyle}>İşlem</th>
                </tr>
            </thead>
            <tbody>
                {medicines.map(med => (
                    <tr key={med._id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={tdStyle}><strong>{med.name}</strong></td>
                        <td style={tdStyle}>{med.user?.pharmacyName || <span style={{color:'red'}}>Silinmiş Eczane</span>}</td>
                        <td style={tdStyle}>{med.quantity}</td>
                        <td style={tdStyle}>{med.price} ₺</td>
                        <td style={tdStyle}>{new Date(med.expiryDate).toLocaleDateString()}</td>
                        <td style={tdStyle}>
                            <button 
                                onClick={() => handleDeleteMedicine(med._id, med.name)}
                                style={{ background: '#dc3545', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer' }}>
                                🗑 Kaldır
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
      
      <div style={{marginTop:'20px', textAlign:'center'}}>
        <button onClick={() => navigate('/admin')} style={{background:'#333', color:'white', border:'none', padding:'10px 20px', borderRadius:'5px', cursor:'pointer'}}>🔙 Panele Dön</button>
      </div>
    </div>
  );
}

const thStyle = { padding: '12px', color: '#555' };
const tdStyle = { padding: '12px', color: '#333' };

export default AdminMedicines;