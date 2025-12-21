function Register() {
  const [formData, setFormData] = useState({ pharmacyName: '', city: '', email: '', password: '' });
  const [loading, setLoading] = useState(false); // Yüklenme durumu eklendi

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return; // Zaten istek atılıyorsa durdur

    setLoading(true); // İşlemi başlat
    try {
      await axios.post('/api/auth/register', formData);
      toast.success("Kayıt Başarılı! Giriş yapabilirsiniz.");
      setTimeout(() => window.location.href = '/login', 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || "Kayıt Hatası");
      setLoading(false); // Hata olursa butonu tekrar aktif et
    }
  };

  return (
    // ... form kodları
    <button 
      type="submit" 
      disabled={loading} // İstek sırasında butonu pasif yap
      style={{ 
        width: '100%', 
        padding: '10px', 
        background: loading ? '#6c757d' : '#28a745', // Yüklenirken gri renk yap
        color: 'white', 
        border: 'none', 
        borderRadius: '5px', 
        cursor: loading ? 'not-allowed' : 'pointer' 
      }}
    >
      {loading ? "Kaydediliyor..." : "Kayıt Ol"}
    </button>
  );
}