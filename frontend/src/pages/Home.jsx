import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import io from 'socket.io-client';

const socket = io.connect();

function Home() {
  const [medicines, setMedicines] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const token = localStorage.getItem('token');
  const currentUserId = localStorage.getItem('userId');

  // MODAL İÇİN STATE'LER
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [orderQuantity, setOrderQuantity] = useState(1);

  useEffect(() => {
    const fetchMedicines = async () => {
      try {
        const res = await axios.get('/api/medicines');
        setMedicines(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchMedicines();
  }, []);

  // 1. ADIM: Butona basınca Modalı Aç
  const openOrderModal = (medicine) => {
    if (!token) return window.location.href = '/login';
    setSelectedMedicine(medicine);
    setOrderQuantity(1); // Her açılışta 1'den başla
    setShowOrderModal(true);
  };

  // 2. ADIM: Modaldaki "Onayla" butonuna basınca işlemi yap
  const handleConfirmOrder = async () => {
    if (!selectedMedicine) return;

    if (orderQuantity > selectedMedicine.quantity) {
        return toast.error(`Stokta sadece ${selectedMedicine.quantity} adet var!`);
    }
    if (orderQuantity < 1) {
        return toast.error("En az 1 adet istemelisiniz.");
    }

    try {
        await axios.post('/api/orders', {
            medicineId: selectedMedicine._id,
            quantity: parseInt(orderQuantity)
        }, { headers: { 'x-auth-token': token } });

        socket.emit('send_notification', {
            receiverId: selectedMedicine.user._id,
            type: 'new_order'
        });

        toast.success("Takas isteği başarıyla gönderildi!");
        setShowOrderModal(false); // Modalı kapat
        
        // Listeyi yenile (stok düştü görünsün)
        const res = await axios.get('/api/medicines');
        setMedicines(res.data);

    } catch (error) {
        toast.error(error.response?.data?.message || "Hata oluştu");
    }
  };

  const filteredMedicines = medicines.filter(med => 
    med.quantity > 0 && 
    new Date(med.expiryDate) > new Date() &&
    med.user._id !== currentUserId &&
    med.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: '#333' }}>Eczane Takas Platformu</h1>
        <input 
            type="text" 
            placeholder="İlaç ara..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '12px', width: '300px', borderRadius: '25px', border: '1px solid #ccc', outline:'none', paddingLeft:'20px' }}
        />
      </div>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
        {filteredMedicines.map((med) => (
          <div key={med._id} style={{ border: '1px solid #ddd', borderRadius: '15px', padding: '20px', width: '260px', background: 'white', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', transition:'transform 0.2s' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#007bff' }}>{med.name}</h3>
            <div style={{fontSize:'0.95em', color:'#555', lineHeight:'1.6'}}>
                <p>💰 <strong>Fiyat:</strong> {med.price} ₺</p>
                <p>📦 <strong>Stok:</strong> {med.quantity} Adet</p>
                <p>📅 <strong>SKT:</strong> {new Date(med.expiryDate).toLocaleDateString()}</p>
                <p>📍 <strong>Konum:</strong> {med.user.city}</p>
                <p style={{fontSize:'0.8em', color:'#888'}}>🏥 {med.user.pharmacyName}</p>
            </div>
            
            <button 
                onClick={() => openOrderModal(med)}
                style={{ width: '100%', padding: '12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginTop: '15px', fontWeight:'bold', fontSize:'1em' }}>
                🔄 Takas İste
            </button>
          </div>
        ))}
      </div>

      {/* --- SİPARİŞ ONAY MODALI --- */}
      {showOrderModal && selectedMedicine && (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <h3 style={{marginTop:0, color:'#333'}}>Takas İsteği Oluştur</h3>
                <p><strong>İlaç:</strong> {selectedMedicine.name}</p>
                <p><strong>Birim Fiyat:</strong> {selectedMedicine.price} ₺</p>
                <p><strong>Mevcut Stok:</strong> {selectedMedicine.quantity}</p>
                
                <div style={{margin:'20px 0', padding:'15px', background:'#f9f9f9', borderRadius:'10px'}}>
                    <label style={{display:'block', marginBottom:'5px', fontWeight:'bold'}}>Kaç adet istiyorsunuz?</label>
                    <input 
                        type="number" 
                        min="1" 
                        max={selectedMedicine.quantity}
                        value={orderQuantity} 
                        onChange={(e) => setOrderQuantity(e.target.value)}
                        style={{width:'100%', padding:'10px', fontSize:'1.2em', borderRadius:'5px', border:'1px solid #ccc', textAlign:'center'}} 
                    />
                    <div style={{textAlign:'right', marginTop:'5px', color:'#28a745', fontWeight:'bold'}}>
                        Toplam Tutar: {(orderQuantity * selectedMedicine.price).toFixed(2)} ₺
                    </div>
                </div>

                <div style={{display:'flex', gap:'10px'}}>
                    <button onClick={handleConfirmOrder} style={{flex:1, padding:'12px', background:'#007bff', color:'white', border:'none', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>✅ Onayla ve Gönder</button>
                    <button onClick={() => setShowOrderModal(false)} style={{flex:1, padding:'12px', background:'#dc3545', color:'white', border:'none', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>❌ İptal</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}

// Modal Stilleri
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContentStyle = { background: 'white', padding: '25px', borderRadius: '15px', width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' };

export default Home;