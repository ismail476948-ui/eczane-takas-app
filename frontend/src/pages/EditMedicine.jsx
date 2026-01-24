import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

function EditMedicine() {
  const [formData, setFormData] = useState({
    name: '',
    expiryDate: '',
    quantity: '',
    price: '' // Fiyat eklendi, diğerleri çıkarıldı
  });

  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchMedicine = async () => {
      const res = await axios.get('/api/medicines');
      const med = res.data.find(m => m._id === id);
      if (med) {
        setFormData({
          name: med.name,
          expiryDate: med.expiryDate.split('T')[0],
          quantity: med.quantity,
          price: med.price // Fiyatı çek
        });
      }
    };
    fetchMedicine();
  }, [id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/medicines/${id}`, formData, {
        headers: { 'x-auth-token': token }
      });
      alert('İlaç güncellendi!');
      navigate('/my-inventory');
    } catch (error) {
      alert('Güncelleme başarısız.');
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '30px auto', background: 'white', padding: '20px', borderRadius: '10px' }}>
      <h2>✏️ İlacı Düzenle</h2>
      <form onSubmit={handleSubmit}>

        <div style={{ marginBottom: '10px' }}>
          <label>İlaç Adı:</label>
          <input type="text" name="name" value={formData.name} onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>Son Kullanma:</label>
          <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ marginBottom: '10px', flex: 1 }}>
            <label>Adet:</label>
            <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
          </div>

          <div style={{ marginBottom: '10px', flex: 1 }}>
            <label>Birim Fiyat (TL):</label>
            <input type="number" name="price" value={formData.price} onChange={handleChange} required min="0" step="0.01" style={{ width: '100%', padding: '8px' }} />
          </div>
        </div>

        <button type="submit" style={{ width: '100%', padding: '10px', background: '#ffc107', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Güncelle</button>
      </form>
    </div>
  );
}

export default EditMedicine;