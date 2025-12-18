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

  const handleOrder = async (medicine) => {
    if (!token) return window.location.href = '/login';
    if (window.confirm(`${medicine.name} için takas isteği gönderilsin mi?`)) {
        try {
            const res = await axios.post('/api/orders', {
                medicineId: medicine._id,
                quantity: 1
            }, { headers: { 'x-auth-token': token } });

            socket.emit('send_notification', {
                receiverId: medicine.user._id,
                type: 'new_order'
            });

            toast.success("Takas isteği gönderildi!");
        } catch (error) {
            toast.error(error.response?.data?.message || "Hata oluştu");
        }
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
            style={{ padding: '10px', width: '300px', borderRadius: '5px', border: '1px solid #ccc' }}
        />
      </div>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
        {filteredMedicines.map((med) => (
          <div key={med._id} style={{ border: '1px solid #ddd', borderRadius: '10px', padding: '15px', width: '250px', background: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#007bff' }}>{med.name}</h3>
            <p><strong>Fiyat:</strong> {med.price} ₺</p>
            <p><strong>Adet:</strong> {med.quantity}</p>
            <p><strong>SKT:</strong> {new Date(med.expiryDate).toLocaleDateString()}</p>
            <p style={{ fontSize: '0.9em', color: '#555' }}>📍 {med.user.pharmacyName} ({med.user.city})</p>
            
            <button 
                onClick={() => handleOrder(med)}
                style={{ width: '100%', padding: '10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '10px' }}>
                Takas İste
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Home;