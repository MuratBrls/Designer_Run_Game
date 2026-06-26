# Designer Run 👾

**Designer Run**, freelance bir tasarımcının zorlu dünyasını konu alan, klasik Mario tarzı retro bir platform oyunudur. Amacınız; revizyon isteyen çılgın müşterilerden kaçmak, proje yedeklerini içeren SD kartları toplamak, engelleri aşmak ve günün sonunda ödemenizi alabilmek için nihai Boss'u yenmektir!

---

## 🚀 OYNA / YAYIN

Oyun web tarayıcınızda doğrudan yayındadır! Herhangi bir indirme veya kurulum yapmadan tek tıkla oynamak için aşağıdaki bağlantıya tıklayabilirsiniz:

👉 **[https://muratbrls.github.io/Designer_Run_Game/](https://muratbrls.github.io/Designer_Run_Game/)**

---

## 📖 Hikaye

Freelance çalışan bir tasarımcı olarak yeni bir projeye başladınız. Ancak işler hiç de kolay değil! Sürekli revizyon isteyen müşteriler, yaklaşan teslim tarihleri (deadline) ve beklenmedik teknik aksaklıklar peşinizi bırakmıyor. Bölümleri tamamlayarak projeyi teslim edin ve final sahnesinde **Ödeme Onaylandı!** yazısını görmek için Boss müşteriyi alt edin!

---

## 👤 Karakterler ve Sınıflar

Oyuna başlamadan önce oyun tarzınıza en uygun tasarımcı sınıfını seçebilirsiniz:

1. **UI/UX Designer**
   - **Özellik:** Dengeli ve klasik platform deneyimi.
   - **Nitelikler:** Hız ⭐⭐⭐, Zıplama ⭐⭐⭐, Can: ❤️❤️❤️
   - **Tanım:** Standart hareket ve klasik oynanış sunar.

2. **3D Modeler**
   - **Özellik:** Dayanıklı ve ağır sıklet.
   - **Nitelikler:** Hız ⭐⭐, Zıplama ⭐⭐, Can: ❤️❤️❤️❤️
   - **Tanım:** Daha fazla cana sahiptir. Havadan sert bir düşüş yaptığında etraftaki düşmanları sarsan bir **Şok Dalgası** yaratır!

3. **Frontend Coder**
   - **Özellik:** Aşırı hızlı ve çevik.
   - **Nitelikler:** Hız ⭐⭐⭐⭐, Zıplama ⭐⭐⭐, Can: ❤️❤️❤️
   - **Tanım:** En hızlı karakterdir. `SHIFT` tuşuna basarak ileriye doğru hızlı bir **Dash (Atılım)** gerçekleştirebilir!

---

## ⚡ Güçler & Yetenekler

Bölümlerde toplayabileceğiniz özel araçlar ve yetenekler:

* 📷 **Kamera:** Tasarımcınızı 12 saniye boyunca ölümsüz yapar ve dokunduğu tüm müşterileri etkisiz hale getirir.
* ☕ **Kahve:** Tasarımcının enerjisini artırarak 18 saniye boyunca havada çift zıplama yapabilmesini sağlar.
* 🖱️ **Wacom Grafik Tablet:** 14 saniye boyunca süper hız artışı sağlar.
* 🤖 **Yapay Zeka (AI Drone):** Sizi takip eden ve yaklaşan müşterilere otomatik kod/tasarım fırlatan bir drone çağırır (30sn).
* ↩️ **CTRL+Z (Undo/Geri Al):** Bir kez öldüğünüzde can kaybetmek yerine sizi son güvenli kayıt noktanıza (checkpoint) geri ışınlar.
* 🌀 **Gizli Boyut Portalı:** Portal platformlarının üzerindeyken `S` veya `Aşağı Yön` tuşuna basarak bol miktarda SD kart içeren gizli boyuta geçiş yapabilirsiniz.

---

## 🕹️ Kontroller

Oyun varsayılan olarak şu tuşlarla oynanır (Ana menüdeki **AYARLAR** kısmından tuşları dilediğiniz gibi değiştirebilirsiniz):

* **Sol / Sağ Hareket:** `A / D` veya `Sol / Sağ Yön Tuşları`
* **Zıplama / Çift Zıplama:** `SPACE / W` veya `Yukarı Yön Tuşu`
* **Özel Yetenek (Dash/Şok):** `SHIFT`
* **Kod/Tasarım Fırlat (Ateş):** `X` veya `C`
* **Gizli Portala Giriş:** `S` veya `Aşağı Yön Tuşu`
* **Duraklat / Menü:** `ESC` veya `P`

---

## 🔧 Kurulum ve Çalıştırma

Oyunu yerel bilgisayarınızda farklı yöntemlerle çalıştırabilirsiniz:

### Yöntem 1: Çift Tıklayarak Oynama (Önerilen)
Oyun dosyalarını indirdikten sonra klasörün içerisindeki **`oyna.bat`** dosyasına çift tıklamanız yeterlidir. Gerekli kütüphaneler otomatik olarak yüklenecek ve oyun masaüstünde açılacaktır.

### Yöntem 2: Doğrudan Tarayıcıda Çalıştırma (Web)
Herhangi bir yerel HTTP sunucusu başlatarak oyunu tarayıcıda açabilirsiniz.
Örneğin Python yüklüyse terminalde şu komutu çalıştırıp `http://localhost:8000` adresine gidin:
```bash
python -m http.server 8000
```

### Yöntem 3: Masaüstü Uygulaması Olarak Çalıştırma (Electron)
1. Bilgisayarınızda [Node.js](https://nodejs.org/) kurulu olduğundan emin olun.
2. Terminalde proje klasörüne gidin ve bağımlılıkları yükleyin:
   ```bash
   npm install
   ```
3. Uygulamayı geliştirme modunda başlatın:
   ```bash
   npm start
   ```

### Yöntem 4: Windows EXE Kurulum Paketini Oluşturma
Oyunu bağımsız bir Windows programı (.exe) haline getirmek için:
1. Terminalde şu komutu çalıştırın:
   ```bash
   npm run build
   ```
2. Derleme tamamlandıktan sonra oluşturulan executable dosyalarını projenin kök dizinindeki `dist/` klasöründe bulabilirsiniz:
   - **NSIS Kurulum Dosyası:** `dist/Designer Run Setup 1.0.0.exe`
   - **Paketlenmiş Klasör:** `dist/win-unpacked/Designer Run.exe`

---

## 🎨 Tasarım Notları
Oyun, pencerelerin yeniden boyutlandırılması durumunda ekran oranının bozulmaması için otomatik CSS ölçeklendirme arayüzüne sahiptir. Ayarlar ve Ses kontrolleri oyun duraklatıldığında veya ana menüde kolayca yönetilebilir.
