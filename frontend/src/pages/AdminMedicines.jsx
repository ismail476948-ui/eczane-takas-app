import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

function AdminMedicines() {
  const [medicines, setMedicines] = useState([]);
  const token = localStorage.getItem('token');

  const fetchMedicines = async () => {
    try {
      // Admin için özel rota yoksa genel rotayı kullanabiliriz
      // Veya admin rotası yazabiliriz. Şimdilik genel rotadan çekip hepsini gösterelim.
      const res = await axios.get('/api/medicines'); 
      setMedicines(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  const handleDelete = async (id) => {
    if(window.confirm("Bu ilacı sistemden tamamen silmek istediğinize emin misiniz?")) {
        try {
            // Admin yetkisiyle silme (Admin rotasına istek atıyoruz)
            await axios.delete(`/api/medicines/${id}`, { 
                headers: { 'x-auth-token': token } 
            });
            toast.success("İlaç silindi.");
            fetchMedicines();
        } catch (error) {
            toast.error("Silme işlemi başarısız (Yetkiniz olmayabilir).");
        }
    }
  };

  return (
    <div>
      <h2 style={{ textAlign: 'center', color: '#333' }}>💊 İlaç Yönetimi</h2>
      <div style={{ overflowX: 'auto', marginTop: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
            <thead>
                <tr style={{ background: '#333', color: 'white' }}>
                    <th style={{ padding: '10px' }}>İlaç Adı</th>
                    <th style={{ padding: '10px' }}>Eczane</th>
                    <th style={{ padding: '10px' }}>Stok</th>
                    <th style={{ padding: '10px' }}>Fiyat</th>
                    <th style={{ padding: '10px' }}>SKT</th>
                    <th style={{ padding: '10px' }}>İşlem</th>
                </tr>
            </thead>
            <tbody>
                {medicines.map(med => (
                    <tr key={med._id} style={{ borderBottom: '1px solid #ddd', textAlign: 'center' }}>
                        <td style={{ padding: '10px', color: '#007bff', fontWeight: 'bold' }}>{med.name}</td>
                        <td style={{ padding: '10px' }}>{med.user?.pharmacyName || 'Bilinmiyor'}</td>
                        <td style={{ padding: '10px' }}>{med.quantity}</td>
                        <td style={{ padding: '10px' }}>{med.price} ₺</td>
                        <td style={{ padding: '10px' }}>{new Date(med.expiryDate).toLocaleDateString()}</td>
                        <td style={{ padding: '10px' }}>
                            <button onClick={() => handleDelete(med._id)} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}>
                                🗑 Sil
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminMedicines;