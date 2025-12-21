import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

function AdminMedicines() {
  const [medicines, setMedicines] = useState([]);
  const token = localStorage.getItem('token');

  const fetchMedicines = async () => {
    try {
      const res = await axios.get('/api/medicines', { headers: { 'x-auth-token': token } });
      setMedicines(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  const handleDelete = async (id) => {
    if(window.confirm("Bu ilacı kalıcı olarak silmek istediğinize emin misiniz?")) {
        try {
            await axios.delete(`/api/medicines/${id}`, { headers: { 'x-auth-token': token } });
            toast.success("İlaç silindi.");
            fetchMedicines();
        } catch (error) {
            toast.error("Hata oluştu.");
        }
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ textAlign: 'center', color: '#333' }}>💊 Tüm İlaçları Yönet</h2>
      <div style={{ overflowX: 'auto', marginTop: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
            <thead>
                <tr style={{ background: '#333', color: 'white' }}>
                    <th style={{ padding: '10px' }}>İlaç Adı</th>
                    <th style={{ padding: '10px' }}>Eczane</th>
                    <th style={{ padding: '10px' }}>Stok</th>
                    <th style={{ padding: '10px' }}>Fiyat</th>
                    <th style={{ padding: '10px' }}>İşlem</th>
                </tr>
            </thead>
            <tbody>
                {medicines.map(med => (
                    <tr key={med._id} style={{ borderBottom: '1px solid #ddd', textAlign: 'center' }}>
                        <td style={{ padding: '10px' }}>{med.name}</td>
                        
                        {/* KRİTİK DÜZELTME BURADA 👇 */}
                        <td style={{ padding: '10px', color: med.user ? 'black' : 'red' }}>
                            {med.user ? med.user.pharmacyName : '(Silinmiş Eczane)'}
                        </td>
                        
                        <td style={{ padding: '10px' }}>{med.quantity}</td>
                        <td style={{ padding: '10px' }}>{med.price} ₺</td>
                        <td style={{ padding: '10px' }}>
                            <button onClick={() => handleDelete(med._id)} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}>
                                Sil
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