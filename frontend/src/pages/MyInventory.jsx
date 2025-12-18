import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function MyInventory() {
  const [medicines, setMedicines] = useState([]);
  const [searchTerm, setSearchTerm] = useState(""); 
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const currentUserId = localStorage.getItem('userId');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    const fetchMyMedicines = async () => {
      try {
        const response = await axios.get('/api/medicines');
        const myList = response.data.filter(med => med.user?._id === currentUserId);
        setMedicines(myList);
      } catch (error) {
        console.error("Veri çekme hatası:", error);
      }
    };
    fetchMyMedicines();
  }, [navigate, token, currentUserId]);

  const handleDelete = async (id) => {
    if (!window.confirm("Bu ilacı silmek istediğinize emin misiniz?")) return;
    try {
      await axios.delete(`/api/medicines/${id}`, {
        headers: { 'x-auth-token': token }
      });
      setMedicines(medicines.filter(med => med._id !== id));
      alert("İlaç silindi.");
    } catch (error) {
      alert("Silme işlemi başarısız.");
    }
  };

  const filteredMedicines = medicines.filter(med => 
    med.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {/* BAŞLIK KISMI SADELEŞTİ (Çıkış butonu kaldırıldı) */}
      <div style={{ marginBottom: '20px', borderBottom: '2px solid #007bff', paddingBottom: '10px' }}>
        <h1 style={{ color: '#007bff', margin: 0 }}>🏥 Eczane Yönetim Paneli</h1>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={() => navigate('/add-medicine')}
          style={{ padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px' }}>
          + Yeni İlaç Ekle
        </button>
        <input 
          type="text" 
          placeholder="Kendi ilaçlarımda ara..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
        />
      </div>

      <h3 style={{ color: '#555' }}>📦 Envanterim ({filteredMedicines.length} İlaç)</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {filteredMedicines.map((med) => (
          <div key={med._id} style={{ background: '#f8f9fa', padding: '20px', borderRadius: '10px', borderLeft: '5px solid #007bff', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 10px 0' }}>{med.name}</h3>
            
            <p><strong>Adet:</strong> {med.quantity}</p>
            <p style={{ color: '#28a745', fontWeight: 'bold' }}>💰 Birim Fiyat: {med.price} ₺</p>
            <p><strong>Son Kullanma:</strong> {new Date(med.expiryDate).toLocaleDateString()}</p>
            
            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                onClick={() => navigate(`/edit-medicine/${med._id}`)}
                style={{ padding: '5px 10px', background: '#ffc107', color: 'black', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
                ✏️ Düzenle
              </button>
              <button 
                onClick={() => handleDelete(med._id)}
                style={{ padding: '5px 10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
                🗑️ Sil
              </button>
            </div>
          </div>
        ))}
        {filteredMedicines.length === 0 && <p>Listelenecek ilaç yok.</p>}
      </div>
    </div>
  );
}

export default MyInventory;