import { useEffect, useState } from 'react';
import axios from 'axios';
import io from 'socket.io-client'; 

const socket = io.connect(); 

function Exchanges({ onPageLoad }) {
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [unreadCounts, setUnreadCounts] = useState({}); 

  // Filtreler
  const [filters, setFilters] = useState({
    incoming: true,  outgoing: true,
    active: true,    completed: true, cancelled: false
  });

  // Modallar
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanOrderId, setScanOrderId] = useState(null); 
  const [qrText, setQrText] = useState("");
  const [showViewQRModal, setShowViewQRModal] = useState(false);
  const [viewQRCodes, setViewQRCodes] = useState([]); 
  
  // CHAT
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatOrderId, setChatOrderId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatPartnerName, setChatPartnerName] = useState("");

  const token = localStorage.getItem('token');
  const currentUserId = localStorage.getItem('userId');

  const fetchData = async () => {
    try {
      const resOrders = await axios.get('/api/orders', {
        headers: { 'x-auth-token': token }
      });
      setOrders(resOrders.data);
      
      // Okunmamış mesaj sayılarını getir
      const resUnread = await axios.get('/api/messages/unread/count', {
        headers: { 'x-auth-token': token }
      });
      setUnreadCounts(resUnread.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData();
    if (onPageLoad) onPageLoad();

    // Socket Dinleyicisi
    socket.on("receive_message", (data) => {
        // Eğer mesajı ben attıysam (sender._id veya sender) listeye ekleme
        const senderId = data.sender._id || data.sender;
        if (senderId === currentUserId) return;

        // Mesaj şu an açık olan sohbetin mesajıysa ekle
        setChatMessages((prev) => [...prev, data]);
        
        // Bildirimleri güncelle (eğer sohbet açık değilse)
        if (data.orderId !== chatOrderId) {
             fetchData(); // Listeyi yenile ki kırmızı nokta gelsin
        }
    });

    return () => {
        socket.off("receive_message");
    };
  }, [chatOrderId]); // chatOrderId değişince listener güncellensin

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.checked });
  };

  const updateStatus = async (orderId, newStatus, qrData = null) => {
    if (newStatus === 'İptal Edildi' && !window.confirm("Emin misiniz?")) return;
    try {
      const body = { status: newStatus };
      if (qrData) body.qrCodes = qrData;
      
      await axios.put(`/api/orders/${orderId}`, body, { headers: { 'x-auth-token': token } });
      
      const currentOrder = orders.find(o => o._id === orderId);
      if(currentOrder) {
        const isMeSeller = currentOrder.seller._id === currentUserId;
        const targetUserId = isMeSeller ? currentOrder.buyer._id : currentOrder.seller._id;
        // Basit bildirim
        socket.emit('send_message', { 
            orderId: orderId, 
            text: `Sipariş durumu: ${newStatus}`, 
            sender: { _id: currentUserId } 
        });
      }

      alert(`İşlem: ${newStatus}`);
      setShowScanModal(false); setQrText(""); fetchData();
    } catch (error) { alert("Hata oluştu"); }
  };

  // --- SOHBET ---
  const handleOpenChat = async (orderId, partnerName) => {
    setChatOrderId(orderId); 
    setChatPartnerName(partnerName); 
    setChatMessages([]); 
    setShowChatModal(true);

    socket.emit("join_room", orderId);

    try {
        // Mesaj geçmişini çek
        const res = await axios.get(`/api/messages/${orderId}`, { headers: { 'x-auth-token': token } });
        setChatMessages(res.data);
        
        // Okundu olarak işaretle
        await axios.put(`/api/messages/read/${orderId}`, {}, { headers: { 'x-auth-token': token } });
        
        // Kırmızı noktayı yerel olarak sil
        setUnreadCounts(prev => ({ ...prev, [orderId]: 0 }));
    } catch (error) { console.error("Sohbet hatası"); }
  };

  const handleSendMessage = async () => {
    if(!newMessage.trim()) return;

    const messageData = {
        orderId: chatOrderId,
        text: newMessage,
        sender: { _id: currentUserId }, // UI için geçici obje
        createdAt: new Date().toISOString()
    };

    try {
        // 1. Önce ekrana bas
        setChatMessages((prev) => [...prev, messageData]);
        setNewMessage("");

        // 2. Veritabanına kaydet
        const res = await axios.post('/api/messages', { orderId: chatOrderId, text: newMessage }, { headers: { 'x-auth-token': token } });
        
        // 3. Socket ile gönder (Backend'den dönen tam veriyi yollamak daha sağlıklı)
        socket.emit("send_message", { ...messageData, ...res.data });
        
    } catch (error) { alert("Mesaj gönderilemedi."); }
  };

  // --- KAREKOD ---
  const handleOpenScanModal = (orderId) => { setScanOrderId(orderId); setQrText(""); setShowScanModal(true); };
  
  const handleSubmitQR = () => {
    const qrArray = qrText.split('\n').filter(line => line.trim() !== '');
    if (qrArray.length === 0) return alert("Karekod okutun.");
    updateStatus(scanOrderId, 'Transferde', qrArray);
  };
  
  const handleOpenViewQR = (codes) => { setViewQRCodes(codes || []); setShowViewQRModal(true); };
  
  const handleCopyQRCodes = () => {
    if (viewQRCodes.length === 0) return;
    navigator.clipboard.writeText(viewQRCodes.join('\n')).then(() => alert("Kopyalandı!")).catch(err => alert("Hata."));
  };

  // --- FİLTRELEME ---
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
    <div>
      <h1 style={{ textAlign: 'center', color: '#333' }}>🔄 Takas Hareketleri</h1>

      {/* FİLTRELEME ALANI */}
      <div style={{ background: '#f1f1f1', padding: '15px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #ddd' }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#555' }}>🔎 Filtreleme</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
            <label style={{ cursor: 'pointer', display: 'flex', gap: '5px' }}><input type="checkbox" name="incoming" checked={filters.incoming} onChange={handleFilterChange} /> 📥 Alınanlar</label>
            <label style={{ cursor: 'pointer', display: 'flex', gap: '5px' }}><input type="checkbox" name="outgoing" checked={filters.outgoing} onChange={handleFilterChange} /> 📤 Verilenler</label>
            <span style={{ borderLeft: '1px solid #ccc', margin: '0 10px' }}></span>
            <label style={{ cursor: 'pointer', display: 'flex', gap: '5px' }}><input type="checkbox" name="active" checked={filters.active} onChange={handleFilterChange} /> ⏳ Devam Edenler</label>
            <label style={{ cursor: 'pointer', display: 'flex', gap: '5px' }}><input type="checkbox" name="completed" checked={filters.completed} onChange={handleFilterChange} /> ✅ Tamamlananlar</label>
            <label style={{ cursor: 'pointer', display: 'flex', gap: '5px', color: '#dc3545' }}><input type="checkbox" name="cancelled" checked={filters.cancelled} onChange={handleFilterChange} /> ❌ İptal Edilenler</label>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <input type="text" placeholder="Ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '5px', border: '1px solid #ccc' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {filteredOrders.map((order) => {
          const isSeller = order.seller._id === currentUserId;
          const unitPrice = order.medicine?.price || 0;
          const statusColor = isSeller ? '#28a745' : '#dc3545';
          const partnerName = isSeller ? order.buyer?.pharmacyName : order.seller?.pharmacyName;
          const unreadCount = unreadCounts[order._id] || 0;

          return (
            <div key={order._id} style={{ border: isSeller ? '2px solid #28a745' : '2px solid #dc3545', backgroundColor: isSeller ? '#fafffb' : '#fff5f5', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: '#333' }}>{isSeller ? '📤 ' : '📥 '} {order.medicine?.name} (x{order.quantity})</h3>
                <span style={{ padding: '5px 10px', borderRadius: '5px', background: statusColor, color: 'white', fontWeight: 'bold' }}>{order.status.toUpperCase()}</span>
              </div>
              <p>💰 <strong>Tutar:</strong> {unitPrice * order.quantity} ₺</p>
              <p>{isSeller ? <span>Talep Eden: <strong>{order.buyer?.pharmacyName}</strong></span> : <span>İlaç Sahibi: <strong>{order.seller?.pharmacyName}</strong></span>}</p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '15px' }}>
                <button onClick={() => handleOpenChat(order._id, partnerName)} style={{ background: '#007bff', color: 'white', padding: '10px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer', position: 'relative' }}>
                    💬 Mesajlaş
                    {unreadCount > 0 && <span style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'red', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.8em', fontWeight: 'bold' }}>{unreadCount}</span>}
                </button>
                {order.qrCodes?.length > 0 && <button onClick={() => handleOpenViewQR(order.qrCodes)} style={{ background: '#6f42c1', color: 'white', padding: '10px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>📦 Karekodlar</button>}
                {isSeller && order.status === 'Beklemede' && <button onClick={() => updateStatus(order._id, 'Onaylandı')} style={{ background: '#28a745', color: 'white', padding: '10px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>✅ Onayla</button>}
                {isSeller && order.status === 'Onaylandı' && <button onClick={() => handleOpenScanModal(order._id)} style={{ background: '#ffc107', color: 'black', padding: '10px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>📸 Karekod Okut</button>}
                {!isSeller && order.status === 'Transferde' && <button onClick={() => updateStatus(order._id, 'Tamamlandı')} style={{ background: '#17a2b8', color: 'white', padding: '10px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>🤝 Teslim Aldım</button>}
                {((!isSeller && order.status === 'Beklemede') || (isSeller && order.status !== 'Tamamlandı' && order.status !== 'İptal Edildi')) && 
                  <button onClick={() => updateStatus(order._id, 'İptal Edildi')} style={{ background: '#6c757d', color: 'white', padding: '10px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>🚫 İptal Et</button>
                }
              </div>
            </div>
          );
        })}
      </div>

      {/* CHAT MODAL */}
      {showChatModal && (
        <div style={modalOverlayStyle}>
            <div style={{ ...modalContentStyle, padding: 0, height: '600px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ background: '#007bff', color: 'white', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>💬 {chatPartnerName}</h3>
                    <button onClick={() => setShowChatModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.5em', cursor: 'pointer' }}>&times;</button>
                </div>
                <div style={{ flex: 1, padding: '15px', overflowY: 'auto', background: '#f5f5f5', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {chatMessages.map((msg, index) => {
                        const isMe = msg.sender._id === currentUserId || msg.sender === currentUserId; 
                        return (
                            <div key={index} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%', background: isMe ? '#dcf8c6' : 'white', padding: '10px', borderRadius: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                                <span style={{ color: '#333' }}>{msg.text}</span>
                                <span style={{ fontSize: '0.7em', color: '#999', display: 'block', textAlign: 'right', marginTop: '5px' }}>
                                    {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                                </span>
                            </div>
                        );
                    })}
                </div>
                <div style={{ padding: '10px', background: 'white', borderTop: '1px solid #ddd', display: 'flex', gap: '10px' }}>
                    <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Mesaj yaz..." style={{ flex: 1, padding: '10px', borderRadius: '20px', border: '1px solid #ddd', outline: 'none' }} />
                    <button onClick={handleSendMessage} style={{ background: '#007bff', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer' }}>➤</button>
                </div>
            </div>
        </div>
      )}

      {/* KAREKOD MODALLARI (Değişmedi, yer tasarrufu için kısalttım ama senin kodunda kalabilir) */}
      {showScanModal && (
        <div style={modalOverlayStyle}>
             <div style={modalContentStyle}>
                <h2>📸 Karekodları Okutun</h2>
                <textarea 
                    autoFocus value={qrText} onChange={(e) => setQrText(e.target.value)} rows={10} style={textAreaStyle} 
                    placeholder="Her satıra bir karekod gelecek şekilde okutun..."
                />
                <div style={{ textAlign: 'right', fontSize: '0.9em', color: '#007bff', marginTop: '5px', fontWeight: 'bold' }}>
                    Okunan Karekod Sayısı: {qrText.split('\n').filter(l => l.trim() !== '').length}
                </div>
                <div style={{display:'flex', gap:'10px', marginTop:'15px'}}>
                   <button onClick={() => setShowScanModal(false)} style={cancelBtnStyle}>İptal</button>
                   <button onClick={handleSubmitQR} style={confirmBtnStyle}>Onayla</button>
                </div>
             </div>
        </div>
      )}

      {showViewQRModal && (
         <div style={modalOverlayStyle}>
             <div style={modalContentStyle}>
                 <h3>📦 Karekodlar</h3>
                 <div style={{maxHeight:'300px', overflowY:'auto', background:'#f9f9f9', padding:'10px', border:'1px solid #eee', borderRadius:'5px'}}>
                    {viewQRCodes.map((c,i) => <div key={i} style={{borderBottom:'1px solid #eee', padding:'2px 0'}}>{c}</div>)}
                 </div>
                 <div style={{ textAlign: 'right', fontSize: '0.9em', color: '#6f42c1', marginTop: '10px', fontWeight: 'bold' }}>
                    Toplam Adet: {viewQRCodes.length}
                 </div>
                 <div style={{display:'flex', gap:'10px', marginTop:'15px'}}>
                    <button onClick={handleCopyQRCodes} style={confirmBtnStyle}>Kopyala</button>
                    <button onClick={() => setShowViewQRModal(false)} style={cancelBtnStyle}>Kapat</button>
                 </div>
             </div>
         </div>
      )}
    </div>
  );
}

const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContentStyle = { background: 'white', padding: '20px', borderRadius: '10px', width: '90%', maxWidth: '500px', boxShadow: '0 5px 15px rgba(0,0,0,0.3)', overflow: 'hidden' };
const textAreaStyle = { width: '100%', padding: '10px', fontFamily: 'monospace', borderRadius: '5px', border: '1px solid #ccc', resize: 'vertical' };
const cancelBtnStyle = { flex: 1, padding: '10px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' };
const confirmBtnStyle = { flex: 1, padding: '10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' };

export default Exchanges;