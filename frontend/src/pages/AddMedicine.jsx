import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function AddMedicine() {
  const [formData, setFormData] = useState({
    name: '',
    expiryDate: '',
    quantity: '',
    price: ''
    // condition ve exchangeWith state'den çıkarıldı
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    if (!token) {
      alert("Önce giriş yapmalısınız!");
      navigate('/login');
      return;
    }

    try {
      await axios.post('/api/medicines', formData, {
        headers: { 'x-auth-token': token }
      });
      alert('İlaç başarıyla eklendi!');
      navigate('/');
    } catch (error) {
      console.error(error);
      alert('Hata oluştu! Lütfen tekrar deneyin.');
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '30px auto', background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}>
      <h2 style={{ textAlign: 'center' }}>➕ Yeni İlaç Ekle</h2>
      <form onSubmit={handleSubmit}>
        
        <div style={{ marginBottom: '15px' }}>
          <label>İlaç Adı:</label>
          <input type="text" name="name" onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Son Kullanma Tarihi:</label>
          <input type="date" name="expiryDate" onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ marginBottom: '15px', flex: 1 }}>
            <label>Adet:</label>
            <input type="number" name="quantity" onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
          </div>

          <div style={{ marginBottom: '15px', flex: 1 }}>
            <label>Birim Fiyat (TL):</label>
            <input type="number" name="price" placeholder="Örn: 50" onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
          </div>
        </div>

        {/* Durum ve Takas İsteği alanları buradan silindi */}

        <button type="submit" style={{ width: '100%', padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Kaydet ve Yayınla
        </button>
      </form>
    </div>
  );
}

export default AddMedicine;