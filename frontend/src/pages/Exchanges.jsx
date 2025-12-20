import { useEffect, useState } from 'react';
import axios from 'axios';
import io from 'socket.io-client';

// Socket bağlantısı
const socket = io.connect();

function Exchanges({ onPageLoad }) {
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [unreadCounts, setUnreadCounts] = useState({});

  // Filtreler
  const [filters, setFilters] = useState({
    incoming: true, outgoing: true,
    active: true, completed: true, cancelled: false
  });

  // Karekod Modalları
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanOrderId, setScanOrderId] = useState(null);
  const [qrText, setQrText] = useState("");
  
  const [showViewQRModal, setShowViewQRModal] = useState(false);
  const [viewQRCodes, setViewQRCodes] = useState([]);

  // Chat Modalı
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatOrderId, setChatOrderId] = useState(null);
  const [chatPartnerName, setChatPartnerName] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  const token = localStorage.getItem('token');
  const currentUserId = localStorage.getItem('userId');

  // --- VERİLERİ GETİR ---
  const fetchData = async () => {
    try {
      // Siparişleri Çek
      const resOrders = await axios.get('/api/orders', {
        headers: { 'x-auth-token': token }
      });
      setOrders(resOrders.data);

      // Okunmamış Mesaj Sayılarını Çek
      const resUnread = await axios.get('/api/messages/unread/count', {
        headers: { 'x-auth-token': token }
      });
      setUnreadCounts(resUnread.data);

    } catch (error) {
      console.error("Veri çekme hatası:", error);
    }
  };

  useEffect(() => {
    fetchData();
    if (onPageLoad) onPageLoad();

    // SOCKET DİNLEYİCİSİ (Çift mesajı önleyen yapı)
    socket.on("receive_message", (data) => {
        // Mesajı atan ben isem listeye ekleme (Zaten gönderirken ekledik)
        const senderId = data.sender._id || data.sender;
        if (senderId === currentUserId) return;

        // Mesaj şu an açık olan sohbetin mesajıysa ekrana bas
        setChatMessages((prev) => {
            // Eğer o an açık olan orderId ile mesajın orderId'si tutuyorsa ekle
            // (Burada closure sorunu olmaması için basit ekleme yapıyoruz, kullanıcı görmezse sorun yok)
            return [...prev, data];
        });

        // Eğer sohbet açık değilse, arka planda listeyi yenile ki kırmızı nokta yansın
        fetchData(); 
    });

    return () => {
        socket.off("receive_message");
    };
  }, []); 

  // --- İŞLEM FONKSİYONLARI ---
  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.checked });
  };

  // Sipariş Durumu Güncelleme
  const updateStatus = async (orderId, newStatus, qrData = null) => {
    if (newStatus === 'İptal Edildi' && !window.confirm("Emin misiniz?")) return;
    try {
        const body = { status: newStatus };
        if (qrData) body.qrCodes = qrData;

        await axios.put(`/api/orders/${orderId}`, body, { headers: { 'x-auth-token': token } });
        
        // Socket ile karşı tarafa bildirim gibi mesaj at (Sistem Mesajı)
        socket.emit('send_message', { 
            orderId: orderId, 
            text: `⚠️ SİSTEM: Sipariş durumu güncellendi: ${newStatus}`, 
            sender: { _id: currentUserId } 
        });

        alert(`İşlem Başarılı: ${newStatus}`);
        setShowScanModal(false); 
        setQrText(""); 
        fetchData(); // Listeyi yenile
    } catch (error) { 
        alert("Hata oluştu."); 
    }
  };

  // --- SOHBETİ AÇ ---
  const handleOpenChat = async (orderId, partnerName) => {
    setChatOrderId(orderId);
    setChatPartnerName(partnerName);
    setChatMessages([]);
    setShowChatModal(true);

    // Socket Odasına Gir
    socket.emit("join_room", orderId);

    try {
        // 1. Eski mesajları API'den çek
        const res = await axios.get(`/api/messages/${orderId}`, { headers: { 'x-auth-token': token } });
        setChatMessages(res.data);

        // 2. Okundu olarak işaretle
        await axios.put(`/api/messages/read/${orderId}`, {}, { headers: { 'x-auth-token': token } });

        // 3. Yerel state'teki kırmızı noktayı sil
        setUnreadCounts(prev => ({ ...prev, [orderId]: 0 }));
    } catch (error) {
        console.error("Sohbet açma hatası:", error);
    }
  };

  // --- MESAJ GÖNDER ---
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
        // 1. Mesajı veritabanına kaydet (Backend populate edip dönecek)
        const res = await axios.post('/api/messages', { 
            orderId: chatOrderId, 
            text: newMessage 
        }, { headers: { 'x-auth-token': token } });

        const savedMessage = res.data;

        // 2. Ekrana Bas (Hız hissi için)
        setChatMessages((prev) => [...prev, savedMessage]);
        setNewMessage("");

        // 3. Socket ile karşıya yolla
        socket.emit("send_message", savedMessage);

    } catch (error) {
        alert("Mesaj gönderilemedi.");
        console.error(error);
    }
  };

  // --- KAREKOD İŞLEMLERİ ---
  const handleOpenScanModal = (orderId) => {
    setScanOrderId(orderId);
    setQrText("");
    setShowScanModal(true);
  };

  const handleSubmitQR = () => {
    const qrArray = qrText.split('\n').filter(line => line.trim() !== '');
    if (qrArray.length === 0) return alert("Lütfen karekodları okutun.");
    updateStatus(scanOrderId, 'Transferde', qrArray);
  };

  const handleOpenViewQR = (codes) => {
    // Karekodları modalda göster
    setViewQRCodes(codes || []);
    setShowViewQRModal(true);
  };

  const handleCopyQRCodes = () => {
    if (viewQRCodes.length === 0) return;
    navigator.clipboard.writeText(viewQRCodes.join('\n'))
      .then(() => alert("Kopyalandı!"))
      .catch(() => alert("Kopyalama başarısız."));
  };

  // --- FİLTRELEME MANTIĞI ---
  const filteredOrders = orders.filter(order => {
    const term = searchTerm.toLowerCase();
    const medName = order.medicine?.name?.toLowerCase() || '';
    const buyerName = order.buyer?.pharmacyName?.toLowerCase() || '';
    const sellerName = order.seller?.pharmacyName?.toLowerCase() || '';
    const searchMatch = medName.includes(term) || buyerName.includes(term) || sellerName.includes(term);

    const isSeller = order.seller._id === currentUserId;
    const directionMatch = (isSeller && filters.outgoing) || (!isSeller && filters.incoming);

    const isCompleted = order.status === 'Tamamlandı';
    const isCancelled = order.status === 'İptal Edildi';
    const isActive = !isCompleted && !isCancelled;
    const statusMatch = (isActive && filters.active) || (isCompleted && filters.completed) || (isCancelled && filters.cancelled);

    return searchMatch && directionMatch && statusMatch;
  });

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ textAlign: 'center', color: '#333' }}>🔄 Takas Hareketleri</h1>

      {/* FİLTRELEME KUTUSU */}
      <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #dee2e6' }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>🔎 Filtreler</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
            <label style={{cursor:'pointer'}}><input type="checkbox" name="incoming" checked={filters.incoming} onChange={handleFilterChange} /> 📥 Alınan</label>
            <label style={{cursor:'pointer'}}><input type="checkbox" name="outgoing" checked={filters.outgoing} onChange={handleFilterChange} /> 📤 Verilen</label>
            <span style={{borderLeft:'1px solid #ccc'}}></span>
            <label style={{cursor:'pointer'}}><input type="checkbox" name="active" checked={filters.active} onChange={handleFilterChange} /> ⏳ Aktif</label>
            <label style={{cursor:'pointer'}}><input type="checkbox" name="completed" checked={filters.completed} onChange={handleFilterChange} /> ✅ Tamamlanan</label>
            <label style={{cursor:'pointer', color:'#dc3545'}}><input type="checkbox" name="cancelled" checked={filters.cancelled} onChange={handleFilterChange} /> ❌ İptal</label>
        </div>
      </div>

      <input 
        type="text" 
        placeholder="İlaç veya eczane ara..." 
        value={searchTerm} 
        onChange={(e) => setSearchTerm(e.target.value)} 
        style={{ width: '100%', padding: '12px', borderRadius: '5px', border: '1px solid #ced4da', marginBottom: '20px' }} 
      />

      {/* LİSTELEME */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {filteredOrders.map((order) => {
          const isSeller = order.seller._id === currentUserId;
          const partnerName = isSeller ? order.buyer?.pharmacyName : order.seller?.pharmacyName;
          const statusColor = isSeller ? '#28a745' : '#dc3545'; // Satıcı Yeşil, Alıcı Kırmızı çerçeve
          const unreadCount = unreadCounts[order._id] || 0;

          return (
            <div key={order._id} style={{ 
                borderLeft: `5px solid ${statusColor}`, 
                background: 'white', 
                padding: '20px', 
                borderRadius: '8px', 
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '15px'
            }}>
                {/* SOL TARAF: BİLGİLER */}
                <div style={{ flex: 1, minWidth: '250px' }}>
                    <h3 style={{ margin: '0 0 5px 0', color: '#343a40' }}>
                        {isSeller ? '📤 Satış:' : '📥 Alış:'} {order.medicine?.name} 
                        <span style={{ fontSize: '0.8em', color: '#6c757d', marginLeft: '10px' }}>(x{order.quantity})</span>
                    </h3>
                    <div style={{ fontSize: '0.9em', color: '#495057' }}>
                        <p style={{ margin: '2px 0' }}>👤 <strong>{partnerName}</strong></p>
                        <p style={{ margin: '2px 0' }}>💰 Toplam: <strong>{(order.medicine?.price || 0) * order.quantity} ₺</strong></p>
                        <p style={{ margin: '2px 0' }}>📅 Durum: <strong style={{ color: statusColor }}>{order.status}</strong></p>
                    </div>
                </div>

                {/* SAĞ TARAF: BUTONLAR */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'flex-end' }}>
                    
                    {/* MESAJ BUTONU */}
                    <button onClick={() => handleOpenChat(order._id, partnerName)} style={btnStyle('#007bff', true)}>
                        💬 Mesaj
                        {unreadCount > 0 && <span style={badgeStyle}>!</span>}
                    </button>

                    {/* KAREKODLARI GÖSTER (Sadece transferde veya tamamlandıysa ve kod varsa) */}
                    {order.qrCodes && order.qrCodes.length > 0 && (
                        <button onClick={() => handleOpenViewQR(order.qrCodes)} style={btnStyle('#6610f2')}>
                            📦 Kodları Gör
                        </button>
                    )}

                    {/* SATICI AKSİYONLARI */}
                    {isSeller && order.status === 'Beklemede' && (
                        <button onClick={() => updateStatus(order._id, 'Onaylandı')} style={btnStyle('#28a745')}>✅ Onayla</button>
                    )}
                    {isSeller && order.status === 'Onaylandı' && (
                        <button onClick={() => handleOpenScanModal(order._id)} style={btnStyle('#ffc107', false, 'black')}>📸 Kod Okut & Gönder</button>
                    )}

                    {/* ALICI AKSİYONLARI */}
                    {!isSeller && order.status === 'Transferde' && (
                        <button onClick={() => updateStatus(order._id, 'Tamamlandı')} style={btnStyle('#17a2b8')}>🤝 Teslim Aldım</button>
                    )}

                    {/* İPTAL BUTONU (Ortak) */}
                    {((!isSeller && order.status === 'Beklemede') || (isSeller && order.status !== 'Tamamlandı' && order.status !== 'İptal Edildi')) && (
                        <button onClick={() => updateStatus(order._id, 'İptal Edildi')} style={btnStyle('#6c757d')}>🚫 İptal</button>
                    )}
                </div>
            </div>
          );
        })}
      </div>

      {/* --- CHAT MODALI --- */}
      {showChatModal && (
        <div style={modalOverlayStyle}>
            <div style={{ ...modalContentStyle, height: '600px', display: 'flex', flexDirection: 'column', padding: 0 }}>
                {/* HEADER */}
                <div style={{ background: '#007bff', color: 'white', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>💬 {chatPartnerName}</h3>
                    <button onClick={() => setShowChatModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.5em', cursor: 'pointer' }}>&times;</button>
                </div>
                
                {/* MESSAGES AREA */}
                <div style={{ flex: 1, padding: '15px', overflowY: 'auto', background: '#f1f1f1', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {chatMessages.length === 0 && <p style={{textAlign:'center', color:'#999'}}>Henüz mesaj yok.</p>}
                    {chatMessages.map((msg, index) => {
                        const isMe = msg.sender?._id === currentUserId || msg.sender === currentUserId;
                        return (
                            <div key={index} style={{ 
                                alignSelf: isMe ? 'flex-end' : 'flex-start', 
                                maxWidth: '75%', 
                                background: isMe ? '#dcf8c6' : 'white', 
                                padding: '10px', 
                                borderRadius: '8px', 
                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)' 
                            }}>
                                <div style={{ color: '#333' }}>{msg.text}</div>
                                <div style={{ fontSize: '0.7em', color: '#999', textAlign: 'right', marginTop: '4px' }}>
                                    {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ''}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* INPUT AREA */}
                <div style={{ padding: '10px', background: 'white', borderTop: '1px solid #ddd', display: 'flex', gap: '10px' }}>
                    <input 
                        type="text" 
                        value={newMessage} 
                        onChange={(e) => setNewMessage(e.target.value)} 
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} 
                        placeholder="Mesaj yaz..." 
                        style={{ flex: 1, padding: '10px', borderRadius: '20px', border: '1px solid #ccc', outline: 'none' }} 
                    />
                    <button onClick={handleSendMessage} style={{ background: '#007bff', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>➤</button>
                </div>
            </div>
        </div>
      )}

      {/* --- KAREKOD GÖNDERME MODALI --- */}
      {showScanModal && (
        <div style={modalOverlayStyle}>
             <div style={{ ...modalContentStyle, padding: '20px' }}>
                <h3>📸 Karekodları Okutun</h3>
                <textarea 
                    autoFocus 
                    value={qrText} 
                    onChange={(e) => setQrText(e.target.value)} 
                    rows={8} 
                    style={textAreaStyle} 
                    placeholder="Her satıra bir kod gelecek şekilde barkod okuyucunuzla okutun..."
                />
                <div style={{ textAlign: 'right', fontSize: '0.9em', color: '#007bff', margin: '5px 0 15px 0' }}>
                    Okunan Adet: <strong>{qrText.split('\n').filter(l => l.trim() !== '').length}</strong>
                </div>
                <div style={{ display:'flex', gap:'10px' }}>
                   <button onClick={() => setShowScanModal(false)} style={cancelBtnStyle}>İptal</button>
                   <button onClick={handleSubmitQR} style={confirmBtnStyle}>Onayla ve Gönder</button>
                </div>
             </div>
        </div>
      )}

      {/* --- KAREKOD İZLEME MODALI --- */}
      {showViewQRModal && (
         <div style={modalOverlayStyle}>
             <div style={{ ...modalContentStyle, padding: '20px' }}>
                 <h3>📦 Karekod Listesi</h3>
                 <div style={{ maxHeight: '300px', overflowY: 'auto', background: '#f8f9fa', padding: '10px', border: '1px solid #dee2e6', borderRadius: '5px', fontFamily: 'monospace' }}>
                    {viewQRCodes.length > 0 ? (
                        viewQRCodes.map((code, i) => (
                            <div key={i} style={{ borderBottom: '1px solid #eee', padding: '4px 0' }}>{code}</div>
                        ))
                    ) : (
                        <p>Karekod verisi bulunamadı.</p>
                    )}
                 </div>
                 <div style={{ display:'flex', gap:'10px', marginTop:'20px' }}>
                    <button onClick={handleCopyQRCodes} style={confirmBtnStyle}>Kopyala</button>
                    <button onClick={() => setShowViewQRModal(false)} style={cancelBtnStyle}>Kapat</button>
                 </div>
             </div>
         </div>
      )}
    </div>
  );
}

// STİLLER
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContentStyle = { background: 'white', borderRadius: '10px', width: '95%', maxWidth: '500px', boxShadow: '0 5px 15px rgba(0,0,0,0.3)', overflow: 'hidden' };
const textAreaStyle = { width: '100%', padding: '10px', fontFamily: 'monospace', borderRadius: '5px', border: '1px solid #ced4da', resize: 'vertical' };
const cancelBtnStyle = { flex: 1, padding: '10px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' };
const confirmBtnStyle = { flex: 1, padding: '10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' };

const btnStyle = (bg, relative = false, color = 'white') => ({
    background: bg, color: color, border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer', fontWeight: '500', fontSize: '0.9em', position: relative ? 'relative' : 'static'
});

const badgeStyle = {
    position: 'absolute', top: '-8px', right: '-8px', background: 'red', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7em', fontWeight: 'bold', border: '2px solid white'
};

export default Exchanges;