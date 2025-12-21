import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function AddMedicine() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [isDefiningNew, setIsDefiningNew] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    expiryDate: '',
    quantity: '',
    price: ''
  });

  const navigate = useNavigate();

  // Arama işlemi
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.length >= 2 && !selectedMedicine && !isDefiningNew) {
        searchMedicines();
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const searchMedicines = async () => {
    setIsSearching(true);
    try {
      const res = await axios.get(`/api/medicine-base/search?q=${searchTerm}`);
      setSearchResults(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = (med) => {
    setSelectedMedicine(med);
    setFormData({ ...formData, name: med.name, barcode: med.barcode || '' });
    setSearchResults([]);
    setSearchTerm(med.name);
  };

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
      let baseId = selectedMedicine?._id;

      // Eğer yeni ilaç tanımlanıyorsa önce master listeye ekle
      if (isDefiningNew) {
        const baseRes = await axios.post('/api/medicine-base', {
          name: formData.name,
          barcode: formData.barcode
        }, {
          headers: { 'x-auth-token': token }
        });
        baseId = baseRes.data._id;
      }

      // Şimdi kullanıcının envanterine ekle
      await axios.post('/api/medicines', {
        ...formData,
        baseMedicine: baseId
      }, {
        headers: { 'x-auth-token': token }
      });

      alert('İlaç başarıyla eklendi!');
      navigate('/my-inventory');
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Hata oluştu! Lütfen tekrar deneyin.');
    }
  };

  const resetSelection = () => {
    setSelectedMedicine(null);
    setIsDefiningNew(false);
    setSearchTerm('');
    setFormData({ ...formData, name: '', barcode: '', expiryDate: '', quantity: '', price: '' });
  };

  return (
    <div style={{ maxWidth: '600px', margin: '30px auto', background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 5px 20px rgba(0,0,0,0.1)' }}>
      <h2 style={{ textAlign: 'center', color: '#007bff' }}>➕ Envantere İlaç Ekle</h2>

      {!selectedMedicine && !isDefiningNew ? (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontWeight: 'bold' }}>İlaç Ara (İsim veya Barkod):</label>
          <input
            type="text"
            placeholder="En az 2 karakter girin..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', marginTop: '5px' }}
          />

          {isSearching && <p style={{ fontSize: '0.9em', color: '#888' }}>Aranıyor...</p>}

          {searchResults.length > 0 && (
            <div style={{ border: '1px solid #ddd', borderRadius: '8px', marginTop: '10px', maxHeight: '250px', overflowY: 'auto' }}>
              {searchResults.map(med => (
                <div
                  key={med._id}
                  onClick={() => handleSelect(med)}
                  style={{ padding: '10px 15px', cursor: 'pointer', borderBottom: '1px solid #eee', background: '#fff' }}
                  onMouseOver={(e) => e.target.style.background = '#f1f1f1'}
                  onMouseOut={(e) => e.target.style.background = '#fff'}
                >
                  <div style={{ fontWeight: 'bold' }}>{med.name}</div>
                  <div style={{ fontSize: '0.8em', color: '#666' }}>Barkod: {med.barcode || 'Yok'}</div>
                </div>
              ))}
            </div>
          )}

          {searchTerm.length >= 2 && !isSearching && searchResults.length === 0 && (
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <p style={{ color: '#666' }}>Aradığınız ilaç listede yok mu?</p>
              <button
                onClick={() => setIsDefiningNew(true)}
                style={{ padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                ✨ Yeni İlaç Tanımla
              </button>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '10px', marginBottom: '20px', border: '1px dashed #007bff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold' }}>{isDefiningNew ? '🆕 Yeni İlaç Tanımı' : '✅ Seçili İlaç:'}</span>
              <button type="button" onClick={resetSelection} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', textDecoration: 'underline' }}>Değiştir</button>
            </div>
            <div style={{ fontSize: '1.1em', marginTop: '5px' }}>{formData.name}</div>
            {formData.barcode && <div style={{ fontSize: '0.85em', color: '#666' }}>Barkod: {formData.barcode}</div>}
          </div>

          {isDefiningNew && (
            <>
              <div style={{ marginBottom: '15px' }}>
                <label>İlaç Tam Adı:</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }} />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label>Barkod (Opsiyonel):</label>
                <input type="text" name="barcode" value={formData.barcode} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }} />
              </div>
            </>
          )}

          <div style={{ marginBottom: '15px' }}>
            <label>Son Kullanma Tarihi:</label>
            <input type="date" name="expiryDate" onChange={handleChange} required style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }} />
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ marginBottom: '20px', flex: 1 }}>
              <label>Adet:</label>
              <input type="number" name="quantity" onChange={handleChange} required style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }} />
            </div>

            <div style={{ marginBottom: '20px', flex: 1 }}>
              <label>Birim Fiyat (TL):</label>
              <input type="number" name="price" placeholder="Örn: 50" onChange={handleChange} required style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }} />
            </div>
          </div>

          <button type="submit" style={{ width: '100%', padding: '12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1.1em', fontWeight: 'bold' }}>
            {isDefiningNew ? 'Tanımla ve Envantere Ekle' : 'Envantere Kaydet'}
          </button>
        </form>
      )}
    </div>
  );
}

export default AddMedicine;
