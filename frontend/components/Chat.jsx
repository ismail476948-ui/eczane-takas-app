import React, { useEffect, useState } from "react";
import ScrollToBottom from "react-scroll-to-bottom";
import io from "socket.io-client";

// Socket'i dışarıda tanımlıyoruz ki her render'da sıfırlanmasın
const socket = io.connect(); 

function Chat({ orderId, username, userId }) {
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageList, setMessageList] = useState([]);

  // 1. Odaya Katıl
  useEffect(() => {
    if (orderId) {
        socket.emit("join_room", orderId);
    }
  }, [orderId]);

  // 2. Mesaj Gönderme
  const sendMessage = async () => {
    if (currentMessage !== "") {
      const messageData = {
        id: Date.now() + Math.random(), // <-- YENİ: Her mesaja benzersiz bir kimlik veriyoruz
        orderId: orderId,
        author: username,
        senderId: userId,
        message: currentMessage,
        time: new Date(Date.now()).getHours() + ":" + new Date(Date.now()).getMinutes(),
      };

      await socket.emit("send_message", messageData);
      setCurrentMessage("");
    }
  };

  // 3. Mesajları Dinle (ÇİFT MESAJ ENGELLEYİCİ KOD)
  useEffect(() => {
    const handleMessage = (data) => {
      setMessageList((prevList) => {
        // KONTROL: Eğer gelen mesajın ID'si zaten listede varsa, ekleme yapma!
        const isDuplicate = prevList.some(msg => msg.id === data.id);
        if (isDuplicate) return prevList;
        
        // Yoksa ekle
        return [...prevList, data];
      });
    };

    // Dinleyiciyi aç
    socket.on("receive_message", handleMessage);

    // Temizlik (Component kapanırsa dinlemeyi kapat)
    return () => {
        socket.off("receive_message", handleMessage);
    };
  }, []); // Bağımlılık dizisi boş kalsın

  return (
    <div className="chat-window" style={styles.window}>
      <div className="chat-header" style={styles.header}>
        <p>💬 Canlı Sohbet</p>
      </div>
      <div className="chat-body" style={styles.body}>
        <ScrollToBottom className="message-container" style={styles.scroll}>
          {messageList.map((messageContent, index) => {
            const isMe = messageContent.senderId === userId;
            return (
              <div
                key={messageContent.id || index} // Key olarak ID kullanıyoruz
                className="message"
                style={{
                    display: 'flex',
                    justifyContent: isMe ? 'flex-end' : 'flex-start',
                    padding: '5px'
                }}
              >
                <div>
                  <div className="message-content" style={{
                      background: isMe ? '#28a745' : '#eee',
                      color: isMe ? 'white' : 'black',
                      padding: '8px 12px',
                      borderRadius: '15px',
                      maxWidth: '200px',
                      wordWrap: 'break-word'
                  }}>
                    <p style={{margin:0}}>{messageContent.message}</p>
                  </div>
                  <div className="message-meta" style={{fontSize:'0.7em', color:'#888', textAlign: isMe ? 'right' : 'left', marginTop:'3px'}}>
                    <p style={{margin:0}}>{messageContent.time} - {messageContent.author}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </ScrollToBottom>
      </div>
      <div className="chat-footer" style={styles.footer}>
        <input
          type="text"
          value={currentMessage}
          placeholder="Mesaj yaz..."
          onChange={(event) => {
            setCurrentMessage(event.target.value);
          }}
          onKeyPress={(event) => {
            event.key === "Enter" && sendMessage();
          }}
          style={styles.input}
        />
        <button onClick={sendMessage} style={styles.button}>➤</button>
      </div>
    </div>
  );
}

const styles = {
    window: { width: '300px', height: '400px', border: '1px solid #ccc', borderRadius: '10px', display: 'flex', flexDirection: 'column', background: 'white', boxShadow: '0 5px 15px rgba(0,0,0,0.2)' },
    header: { background: '#333', color: 'white', padding: '10px', borderTopLeftRadius: '10px', borderTopRightRadius: '10px', fontWeight: 'bold' },
    body: { flex: 1, overflowY: 'auto', padding: '10px' },
    scroll: { width: '100%', height: '100%' },
    footer: { display: 'flex', padding: '10px', borderTop: '1px solid #eee' },
    input: { flex: 1, padding: '8px', borderRadius: '20px', border: '1px solid #ccc', marginRight: '5px', outline: 'none' },
    button: { background: 'transparent', border: 'none', fontSize: '1.5em', color: '#28a745', cursor: 'pointer' }
};

export default Chat;