import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

function CurrentAccount() {
  const [loading, setLoading] = useState(true);
  
  // Veriler
  const [allTransactions, setAllTransactions] = useState([]); 
  const [pharmacyBalances, setPharmacyBalances] = useState({}); 
  const [summary, setSummary] = useState({ totalReceivable: 0, totalDebt: 0, netBalance: 0 });

  // Filtreleme
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all"); 

  // Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPharmacy, setSelectedPharmacy] = useState(null); 
  const [paymentForm, setPaymentForm] = useState({ amount: '', type: 'sent', description: '' });

  const token = localStorage.getItem('token');
  const currentUserId = localStorage.getItem('userId');

  // --- VERİLERİ ÇEK ---
  const fetchData = async () => {
    try {
      setLoading(true);
      const [resOrders, resPayments] = await Promise.all([
        axios.get('/api/orders', { headers: { 'x-auth-token': token } }),
        axios.get('/api/payments', { headers: { 'x-auth-token': token } })
      ]);

      const ordersData = Array.isArray(resOrders.data) ? resOrders.data : [];
      const paymentsData = Array.isArray(resPayments.data) ? resPayments.data : [];

      processTransactions(ordersData, paymentsData);
      setLoading(false);
    } catch (error) {
        console.error("Veri hatası:", error);
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- HESAPLAMA MANTIĞI (GÜNCELLEME: SİLİNMİŞ KULLANICI KORUMASI EKLENDİ) ---
  const processTransactions = (orders, payments) => {
    let combined = [];
    let balances = {}; 
    
    // 1. SİPARİŞLERİ İŞLE
    orders.forEach(order => {
        if (order.status === 'Tamamlandı') {
            const isSeller = order.seller?._id === currentUserId;
            const partner = isSeller ? order.buyer : order.seller;
            
            const partnerId = partner?._id || "deleted_user";
            const partnerName = partner?.pharmacyName || '⚠️ Silinmiş Eczane';

            let price = order.medicine?.price || 0;
            let qty = order.quantity || 0;
            const amount = price * qty;

            combined.push({
                _id: order._id,
                date: new Date(order.createdAt),
                type: isSeller ? 'sale' : 'purchase',
                amount: amount,
                partnerName: partnerName,
                partnerId: partnerId,
                detail: `${order.medicine?.name || 'Silinmiş İlaç'} (x${qty})`
            });

            if (!balances[partnerId]) {
                balances[partnerId] = { name: partnerName, balance: 0, income: 0, expense: 0 };
            }
            
            if (isSeller) {
                balances[partnerId].income += amount;
                balances[partnerId].balance += amount;
            } else {
                balances[partnerId].expense += amount;
                balances[partnerId].balance -= amount;
            }
        }
    });

    // 2. NAKİT ÖDEMELERİ İŞLE
    payments.forEach(payment => {
        const isPayer = payment.fromUser?._id === currentUserId; 
        const partner = isPayer ? payment.toUser : payment.fromUser;

        const partnerId = partner?._id || "deleted_user";
        const partnerName = partner?.pharmacyName || '⚠️ Silinmiş Eczane';

        combined.push({
            _id: payment._id,
            date: new Date(payment.date),
            type: isPayer ? 'payment_sent' : 'payment_received',
            amount: payment.amount,
            partnerName: partnerName,
            partnerId: partnerId,
            detail: payment.description || 'Nakit İşlem'
        });

        if (!balances[partnerId]) {
            balances[partnerId] = { name: partnerName, balance: 0, income: 0, expense: 0 };
        }

        if (isPayer) balances[partnerId].balance += payment.amount; 
        else balances[partnerId].balance -= payment.amount;
    });

    // 3. GENEL ÖZETİ HESAPLA
    let currentReceivable = 0;
    let currentDebt = 0;

    Object.values(balances).forEach(p => {
        if (p.balance > 0) currentReceivable += p.balance;
        else if (p.balance < 0) currentDebt += Math.abs(p.balance);
    });

    combined.sort((a, b) => b.date - a.date);

    setAllTransactions(combined);
    setPharmacyBalances(balances);
    setSummary({
        totalReceivable: currentReceivable,
        totalDebt: currentDebt,
        netBalance: currentReceivable - currentDebt
    });
  };

  // --- FONKSİYONLAR ---
  const openPaymentModal = (pharmacyId, pharmacyName) => {
    if (pharmacyId === "deleted_user") return toast.warning("Silinmiş eczane için işlem yapılamaz.");
    
    setSelectedPharmacy({ id: pharmacyId, name: pharmacyName });
    setPaymentForm({ amount: '', type: 'sent', description: '' });
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async () => {
    if (!paymentForm.amount || isNaN(paymentForm.amount)) return toast.error("Geçerli bir tutar girin.");

    try {
        await axios.post('/api/payments', {
            targetUserId: selectedPharmacy.id,
            amount: parseFloat(paymentForm.amount),
            type: paymentForm.type,
            description: paymentForm.description
        }, { headers: { 'x-auth-token': token } });

        toast.success("İşlem kaydedildi.");
        setShowPaymentModal(false);
        fetchData(); 
    } catch (error) {
        toast.error("Hata oluştu.");
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if(window.confirm("Bu nakit işlem kaydını silmek istediğinize emin misiniz? Bakiye yeniden hesaplanacak.")) {
        try {
            await axios.delete(`/api/payments/${paymentId}`, {
                headers: { 'x-auth-token': token }
            });
            toast.success("Kayıt silindi.");
            fetchData(); 
        } catch (error) {
            console.error(error);
            toast.error("Silme işlemi başarısız.");
        }
    }
  };

  const filteredTransactions = allTransactions.filter(t => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = t.partnerName.toLowerCase().includes(searchLower) || t.detail.toLowerCase().includes(searchLower);
    
    if (filterType === 'all') return matchesSearch;
    if (filterType === 'sale' && t.type === 'sale') return matchesSearch;
    if (filterType === 'purchase' && t.type === 'purchase') return matchesSearch;
    if (filterType === 'payment' && (t.type === 'payment_sent' || t.type === 'payment_received')) return matchesSearch;
    
    return false;
  });

  if (loading) return <div style={{textAlign:'center', marginTop:'50px'}}>Hesaplar yükleniyor...</div>;

  return (
    <div>
      <h1 style={{ textAlign: 'center', color: '#333', marginBottom: '30px' }}>💰 Cari Hesap & Kasa</h1>

      {/* 1. GENEL ÖZET KARTLARI */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '40px' }}>
        <div style={cardStyle('#d4edda', '#155724')}>
          <h3>📥 Güncel Alacak</h3>
          <p style={{ fontSize: '1.8em', fontWeight: 'bold', margin: '10px 0' }}>{summary.totalReceivable.toLocaleString()} ₺</p>
          <p style={{fontSize:'0.8em'}}>Piyasadan alacağınız net tutar</p>
        </div>
        <div style={cardStyle('#f8d7da', '#721c24')}>
          <h3>📤 Güncel Borç</h3>
          <p style={{ fontSize: '1.8em', fontWeight: 'bold', margin: '10px 0' }}>{summary.totalDebt.toLocaleString()} ₺</p>
          <p style={{fontSize:'0.8em'}}>Piyasaya olan net borcunuz</p>
        </div>
        <div style={cardStyle(summary.netBalance >= 0 ? '#cce5ff' : '#fff3cd', summary.netBalance >= 0 ? '#004085' : '#856404')}>
          <h3>📊 Net Bakiye</h3>
          <p style={{ fontSize: '1.8em', fontWeight: 'bold', margin: '10px 0' }}>
              {summary.netBalance > 0 ? '+' : ''}{summary.netBalance.toLocaleString()} ₺
          </p>
          <p style={{fontSize:'0.8em'}}>{summary.netBalance >= 0 ? 'Genel olarak Alacaklısınız' : 'Genel olarak Borçlusunuz'}</p>
        </div>
      </div>

      {/* 2. ECZANE BAZLI CARİ DURUM */}
      <h3 style={{ borderBottom: '2px solid #007bff', paddingBottom: '10px', color: '#007bff' }}>🏥 Eczane Bazlı Cari Durum</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginTop: '20px', marginBottom: '40px' }}>
        {Object.keys(pharmacyBalances).length === 0 && <p style={{color:'#999'}}>Henüz işlem kaydı yok.</p>}
        {Object.entries(pharmacyBalances).map(([id, data]) => (
            <div key={id} style={{ border: '1px solid #ddd', borderRadius: '10px', padding: '15px', background: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                <h4 style={{ margin: '0 0 15px 0', color: id === "deleted_user" ? 'red' : '#333', borderBottom:'1px solid #eee', paddingBottom:'5px' }}>{data.name}</h4>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize:'0.9em', color:'#28a745' }}>
                    <span>İlaç Satışım:</span> <span>+{data.income.toLocaleString()} ₺</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize:'0.9em', color:'#dc3545' }}>
                    <span>İlaç Alışım:</span> <span>-{data.expense.toLocaleString()} ₺</span>
                </div>

                <div style={{ borderTop: '1px solid #eee', paddingTop: '10px', marginBottom: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong>NET BAKİYE:</strong>
                        <span style={{ fontSize: '1.2em', fontWeight: 'bold', color: data.balance > 0 ? '#28a745' : (data.balance < 0 ? '#dc3545' : '#666') }}>
                            {data.balance > 0 ? '+' : ''}{data.balance.toLocaleString()} ₺
                        </span>
                    </div>
                    <small style={{ color: data.balance > 0 ? '#28a745' : (data.balance < 0 ? '#dc3545' : '#666') }}>
                        {data.balance > 0 ? '(Alacaklısınız)' : (data.balance < 0 ? '(Borçlusunuz)' : '(Hesap Kapalı)')}
                    </small>
                </div>
                <button 
                  onClick={() => openPaymentModal(id, data.name)} 
                  disabled={id === "deleted_user"}
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    background: id === "deleted_user" ? '#ccc' : '#007bff', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '5px', 
                    cursor: id === "deleted_user" ? 'not-allowed' : 'pointer', 
                    fontWeight:'bold' 
                  }}>
                    {id === "deleted_user" ? '⚠️ Silinmiş Eczane' : '🤝 Hesaplaş / Düzenle'}
                </button>
            </div>
        ))}
      </div>

      {/* 3. İŞLEM TABLOSU */}
      <h3 style={{ borderBottom: '2px solid #ddd', paddingBottom: '10px', color: '#555' }}>📜 Tüm İşlem Hareketleri</h3>
      
      <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '10px', marginBottom: '15px', display:'flex', gap:'10px', flexWrap:'wrap' }}>
        <input type="text" placeholder="Eczane adı veya ürün..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '5px' }} />
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ padding: '8px', borderRadius: '5px' }}>
            <option value="all">Tüm İşlemler</option>
            <option value="sale">Sadece Satışlar</option>
            <option value="purchase">Sadece Alışlar</option>
            <option value="payment">Sadece Ödemeler</option>
        </select>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', background: 'white' }}>
            <thead>
                <tr style={{ background: '#f1f1f1', textAlign: 'left' }}>
                    <th style={thStyle}>Tarih</th>
                    <th style={thStyle}>Eczane</th>
                    <th style={thStyle}>İşlem Türü</th>
                    <th style={thStyle}>Detay</th>
                    <th style={thStyle}>Tutar</th>
                    <th style={thStyle}>İşlem</th>
                </tr>
            </thead>
            <tbody>
                {filteredTransactions.map(t => (
                    <tr key={t._id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={tdStyle}>{t.date.toLocaleDateString()}</td>
                        <td style={{...tdStyle, color: t.partnerId === "deleted_user" ? 'red' : 'inherit'}}>{t.partnerName}</td>
                        <td style={tdStyle}>{getTypeBadge(t.type)}</td>
                        <td style={tdStyle}>{t.detail}</td>
                        <td style={{ ...tdStyle, fontWeight: 'bold', color: (t.type === 'sale' || t.type === 'payment_sent') ? '#28a745' : '#dc3545' }}>
                             {t.type === 'sale' ? '+' : (t.type === 'purchase' ? '-' : (t.type === 'payment_sent' ? 'Borç Ödendi (+)' : 'Tahsilat (-)'))} {t.amount} ₺
                        </td>
                        <td style={tdStyle}>
                            {/* DÜZENLEME: Sadece 'Ödeme Yapıldı' (payment_sent) türündeki işlemler silinebilir */}
                            {t.type === 'payment_sent' && (
                                <button onClick={() => handleDeletePayment(t._id)} style={{ background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', padding: '5px 10px', cursor: 'pointer', fontSize:'0.9em' }}>🗑 Sil</button>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      {showPaymentModal && (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <h3>💳 Hesap Düzenle: {selectedPharmacy?.name}</h3>
                <div style={{ margin: '15px 0' }}>
                    <label style={{display:'block', marginBottom:'5px'}}>İşlem Türü:</label>
                    <select value={paymentForm.type} onChange={(e) => setPaymentForm({...paymentForm, type: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius:'5px' }}>
                        <option value="sent">📤 Ödeme Yaptım (Borç Düş)</option>
                        <option value="received">📥 Ödeme Aldım (Alacak Düş)</option>
                    </select>
                </div>
                <div style={{ margin: '15px 0' }}>
                    <label style={{display:'block', marginBottom:'5px'}}>Tutar (TL):</label>
                    <input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})} placeholder="0.00" style={{ width: '100%', padding: '10px', borderRadius:'5px', border:'1px solid #ccc' }} />
                </div>
                <div style={{ margin: '15px 0' }}>
                    <label style={{display:'block', marginBottom:'5px'}}>Açıklama (Opsiyonel):</label>
                    <input type="text" value={paymentForm.description} onChange={(e) => setPaymentForm({...paymentForm, description: e.target.value})} placeholder="Örn: Mart ayı mahsuplaşması" style={{ width: '100%', padding: '10px', borderRadius:'5px', border:'1px solid #ccc' }} />
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button onClick={handlePaymentSubmit} style={{ flex: 1, padding: '10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Kaydet</button>
                    <button onClick={() => setShowPaymentModal(false)} style={{ flex: 1, padding: '10px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>İptal</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

const getTypeBadge = (type) => {
    switch (type) {
        case 'sale': return <span style={{background:'#d4edda', color:'#155724', padding:'4px 8px', borderRadius:'4px', fontSize:'0.85em'}}>Satış</span>;
        case 'purchase': return <span style={{background:'#f8d7da', color:'#721c24', padding:'4px 8px', borderRadius:'4px', fontSize:'0.85em'}}>Alış</span>;
        case 'payment_sent': return <span style={{background:'#cce5ff', color:'#004085', padding:'4px 8px', borderRadius:'4px', fontSize:'0.85em'}}>Ödeme Yapıldı</span>;
        case 'payment_received': return <span style={{background:'#fff3cd', color:'#856404', padding:'4px 8px', borderRadius:'4px', fontSize:'0.85em'}}>Ödeme Alındı</span>;
        default: return type;
    }
};

const cardStyle = (bgColor, textColor) => ({ flex: '1', minWidth: '200px', padding: '15px', borderRadius: '10px', background: bgColor, color: textColor, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', textAlign: 'center' });
const thStyle = { padding: '12px', borderBottom: '2px solid #ddd', color: '#555' };
const tdStyle = { padding: '12px', color: '#333' };
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContentStyle = { background: 'white', padding: '25px', borderRadius: '10px', width: '90%', maxWidth: '400px', boxShadow: '0 5px 15px rgba(0,0,0,0.3)' };

export default CurrentAccount;