import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function MyInventory() {
  const [medicines, setMedicines] = useState([]);
  const [searchTerm, setSearchTerm] = useState(""); 
  const [filterType, setFilterType] = useState("all"); // 'all', 'expired', 'valid'
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
        const response = await axios.get('/api/orders'); // Original code used /api/medicines, but filter logic matched currentUserId.
        // Wait, the original code had: const response = await axios.get('/api/medicines');
        // Let's stick to the original endpoint but improve sorting.
        const res = await axios.get('/api/medicines');
        const myList = res.data.filter(med => med.user?._id === currentUserId);
        
        // Son kullanma tarihine göre sırala (Süresi geçenler üstte)
        const sortedList = [...myList].sort((a, b) => {
          const isAExpired = new Date(a.expiryDate) < new Date();
          const isBExpired = new Date(b.expiryDate) < new Date();
          if (isAExpired && !isBExpired) return -1;
          if (!isAExpired && isBExpired) return 1;
          return new Date(a.expiryDate) - new Date(b.expiryDate);
        });

        setMedicines(sortedList);
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

  const filteredMedicines = medicines.filter(med => {
    const matchesSearch = med.name.toLowerCase().includes(searchTerm.toLowerCase());
    const isExpired = new Date(med.expiryDate) < new Date();
    
    if (filterType === 'expired') return matchesSearch && isExpired;
    if (filterType === 'valid') return matchesSearch && !isExpired;
    return matchesSearch;
  });

  return (
    <div>
      <div style={{ marginBottom: '20px', borderBottom: '2px solid #007bff', paddingBottom: '10px' }}>
        <h1 style={{ color: '#007bff', margin: 0 }}>🏥 Eczane Yönetim Paneli</h1>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
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
          style={{ flex: 1, minWidth: '200px', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
        />
        <select 
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc', background: 'white' }}>
          <option value="all">Filtrele: Tümü</option>
          <option value="expired">Süresi Dolanlar</option>
          <option value="valid">Süresi Geçmeyenler</option>
        </select>
      </div>

      <h3 style={{ color: '#555' }}>📦 Envanterim ({filteredMedicines.length} İlaç)</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {filteredMedicines.map((med) => {
          const isExpired = new Date(med.expiryDate) < new Date();
          return (
            <div key={med._id} style={{ 
              background: isExpired ? '#fff5f5' : '#f8f9fa', 
              padding: '20px', 
              borderRadius: '10px', 
              borderLeft: `5px solid ${isExpired ? '#dc3545' : '#007bff'}`, 
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
              position: 'relative',
              opacity: isExpired ? 0.9 : 1
            }}>
              {isExpired && (
                <div style={{ 
                  position: 'absolute', 
                  top: '10px', 
                  right: '10px', 
                  background: '#dc3545', 
                  color: 'white', 
                  padding: '2px 8px', 
                  borderRadius: '4px', 
                  fontSize: '10px', 
                  fontWeight: 'bold' 
                }}>
                  SÜRESİ DOLMUŞ
                </div>
              )}
              <h3 style={{ margin: '0 0 10px 0', color: isExpired ? '#dc3545' : '#333' }}>{med.name}</h3>
              
              <p><strong>Adet:</strong> {med.quantity}</p>
              <p style={{ color: '#28a745', fontWeight: 'bold' }}>💰 Birim Fiyat: {med.price} ₺</p>
              <p style={{ color: isExpired ? '#dc3545' : 'inherit', fontWeight: isExpired ? 'bold' : 'normal' }}>
                <strong>Son Kullanma:</strong> {new Date(med.expiryDate).toLocaleDateString()}
              </p>
              
              <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  onClick={() => navigate(`/edit-medicine/${med._id}`)}
                  style={{ padding: '5px 12px', background: '#ffc107', color: 'black', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '14px' }}>
                  ✏️ Düzenle
                </button>
                <button 
                  onClick={() => handleDelete(med._id)}
                  style={{ padding: '5px 12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '14px' }}>
                  🗑️ Sil
                </button>
              </div>
            </div>
          );
        })}
        {filteredMedicines.length === 0 && <p>Listelenecek ilaç yok.</p>}
      </div>
    </div>
  );
}

export default MyInventory;
