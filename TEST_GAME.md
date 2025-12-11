# 🎮 TEST GAME SENARYOSU
## Arapça Kelime Öğrenme Sistemi - Oyun Test Senaryoları

**Test Tarihi:** [TARİH]  
**Test Eden:** [İSİM]  
**Test Versiyonu:** [VERSİYON]

---

## 📋 TEST SENARYOLARI

### Senaryo 1: İlk Kullanıcı - Yeni Başlangıç
**Amaç:** Yeni kullanıcının sisteme ilk girişini test etmek

**Adımlar:**
1. ✅ Tarayıcıyı aç ve `index.html` dosyasını yükle
2. ✅ Console'u aç (F12) ve hata kontrolü yap
3. ✅ Sayfa yüklenmesini bekle
4. ✅ Dashboard'un göründüğünü kontrol et
5. ✅ Tüm istatistiklerin sıfır olduğunu kontrol et (XP: 0, Level: 1, Hearts: 5, Gems: 0, Streak: 0)
6. ✅ İlk öğrenme modunu seç (örn: "Aralıklı Tekrar")
7. ✅ İlk soruyu cevapla
8. ✅ XP'nin arttığını kontrol et (+10 XP)
9. ✅ Can'ın azaldığını kontrol et (yanlış cevap verirse)
10. ✅ Progress'in kaydedildiğini kontrol et (localStorage)

**Beklenen Sonuç:**
- ✅ Sayfa hatasız yüklenmeli
- ✅ Tüm değerler başlangıç değerlerinde olmalı
- ✅ İlk soru görünmeli
- ✅ Cevap verdikten sonra XP artmalı
- ✅ Progress localStorage'a kaydedilmeli

**Notlar:**
- [Test notları buraya]

---

### Senaryo 2: Öğrenme Modları Testi
**Amaç:** Tüm öğrenme modlarının çalıştığını test etmek

**Test Edilecek Modlar:**
1. ✅ **Aralıklı Tekrar (spaced-repetition)**
   - Modu başlat
   - 5 soru cevapla
   - Streak sisteminin çalıştığını kontrol et
   
2. ✅ **Karma Alıştırma (interleaved)**
   - Modu başlat
   - Farklı soru tiplerinin geldiğini kontrol et
   - 5 soru cevapla
   
3. ✅ **Sesli Öğrenme (audio-first)**
   - Modu başlat
   - Ses çalma butonunun göründüğünü kontrol et
   - Ses çalma fonksiyonunu test et
   - 3 soru cevapla
   
4. ✅ **Tanıma → Hatırlama (recognition-recall)**
   - Modu başlat
   - Aşamalı geçişi kontrol et (recognition → recall → production)
   - 5 soru cevapla
   
5. ✅ **Bağlamsal Öğrenme (contextual)**
   - Modu başlat
   - Cümle içinde kelime gösterildiğini kontrol et
   - 3 soru cevapla
   
6. ✅ **Zayıf Kelimeler (weak-words)**
   - Önce bazı kelimeleri yanlış cevapla
   - Modu başlat
   - Zayıf kelimelerin gösterildiğini kontrol et
   - 3 soru cevapla

**Beklenen Sonuç:**
- ✅ Tüm modlar başlatılabilmeli
- ✅ Her mod kendi soru tipini göstermeli
- ✅ Ses çalma modunda ses çalmalı
- ✅ Zayıf kelimeler modunda önceki yanlışlar gösterilmeli

**Notlar:**
- [Test notları buraya]

---

### Senaryo 3: Gamification Sistemi Testi
**Amaç:** XP, Level, Hearts, Gems, Streak, Badges, League sistemlerini test etmek

**Test Adımları:**

#### 3.1 XP & Level Sistemi
1. ✅ Başlangıç XP: 0, Level: 1 kontrol et
2. ✅ 5 doğru cevap ver (her biri +10 XP)
3. ✅ XP'nin 50 olduğunu kontrol et
4. ✅ Level'in hala 1 olduğunu kontrol et (100 XP'de level 2 olmalı)
5. ✅ 5 daha doğru cevap ver (toplam 100 XP)
6. ✅ Level'in 2 olduğunu kontrol et
7. ✅ Level up animasyonunun gösterildiğini kontrol et

#### 3.2 Hearts Sistemi
1. ✅ Başlangıç Hearts: 5 kontrol et
2. ✅ 5 yanlış cevap ver
3. ✅ Hearts'ın 0 olduğunu kontrol et
4. ✅ Hearts modal'ının gösterildiğini kontrol et
5. ✅ "Bekle (30 dakika)" seçeneğini test et
6. ✅ Hearts refill timer'ın çalıştığını kontrol et

#### 3.3 Gems Sistemi
1. ✅ Başlangıç Gems: 0 kontrol et
2. ✅ Bir bölümü tamamla
3. ✅ Gems'in +10 arttığını kontrol et
4. ✅ Günlük sandığı aç
5. ✅ Gems'in arttığını kontrol et

#### 3.4 Streak Sistemi
1. ✅ Başlangıç Streak: 0 kontrol et
2. ✅ İlk çalışmayı yap
3. ✅ Streak'in hala 0 olduğunu kontrol et (ilk gün streak başlamaz)
4. ✅ Sayfayı yenile ve ertesi gün simüle et (localStorage'da lastStudyDate'i değiştir)
5. ✅ Yeni çalışma yap
6. ✅ Streak'in 1 olduğunu kontrol et
7. ✅ 2 gün daha çalış (toplam 3 gün streak)
8. ✅ Streak'in 3 olduğunu kontrol et

#### 3.5 Badges Sistemi
1. ✅ 100 XP kazan
2. ✅ "İlk Adımlar" rozetinin kazanıldığını kontrol et
3. ✅ 500 XP kazan
4. ✅ "Öğrenci" rozetinin kazanıldığını kontrol et
5. ✅ 7 gün streak yap
6. ✅ "Hafta Savaşçısı" rozetinin kazanıldığını kontrol et
7. ✅ Rozetler modal'ını aç ve tüm rozetleri kontrol et

#### 3.6 League Sistemi
1. ✅ Başlangıç League: null kontrol et (XP yoksa)
2. ✅ 10 XP kazan
3. ✅ League'in "Bronze" olduğunu kontrol et
4. ✅ 1000 XP kazan
5. ✅ League'in "Silver" olduğunu kontrol et
6. ✅ 5000 XP kazan
7. ✅ League'in "Gold" olduğunu kontrol et

**Beklenen Sonuç:**
- ✅ Tüm gamification sistemleri çalışmalı
- ✅ Değerler doğru hesaplanmalı
- ✅ Animasyonlar gösterilmeli
- ✅ Rozetler kazanılmalı
- ✅ League geçişleri çalışmalı

**Notlar:**
- [Test notları buraya]

---

### Senaryo 4: Bölüm (Chapter) Sistemi Testi
**Amaç:** Bölüm sisteminin çalıştığını test etmek

**Test Adımları:**
1. ✅ Dashboard'da "Bölümler" sekmesine git
2. ✅ Bölüm 1'in görünür ve kilitsiz olduğunu kontrol et
3. ✅ Bölüm 2'nin kilitli olduğunu kontrol et
4. ✅ Bölüm 1'i başlat
5. ✅ Bölüm 1'deki tüm kelimeleri öğren (doğru cevap ver)
6. ✅ Bölüm tamamlandığında ödül alındığını kontrol et (+100 XP, +10 Gems)
7. ✅ Bölüm 2'nin kilidinin açıldığını kontrol et
8. ✅ Bölüm 2'yi başlat ve test et

**Beklenen Sonuç:**
- ✅ Bölümler doğru sırayla kilitlemeli
- ✅ Bölüm tamamlandığında ödül verilmeli
- ✅ Sonraki bölüm kilidi açılmalı
- ✅ Progress kaydedilmeli

**Notlar:**
- [Test notları buraya]

---

### Senaryo 5: Günlük Sandık ve Hediye Sandığı Testi
**Amaç:** Günlük sandık ve hediye sandığı sistemini test etmek

**Test Adımları:**

#### 5.1 Günlük Sandık
1. ✅ En az 5 kelime öğren veya 50 XP kazan
2. ✅ Günlük sandık butonunun aktif olduğunu kontrol et
3. ✅ Günlük sandığı aç
4. ✅ Ödüllerin verildiğini kontrol et (XP ve Gems)
5. ✅ Sandık butonunun devre dışı olduğunu kontrol et (bugün tekrar açılamaz)
6. ✅ Sayfayı yenile ve sandığın hala açılamadığını kontrol et

#### 5.2 Hediye Sandığı
1. ✅ En az 100 XP kazan veya 10 kelime öğren
2. ✅ Hediye sandığının gösterildiğini kontrol et (7 günde bir)
3. ✅ Hediye sandığını aç
4. ✅ Ödüllerin verildiğini kontrol et
5. ✅ 7 gün sonra tekrar gösterildiğini kontrol et (simüle et)

**Beklenen Sonuç:**
- ✅ Günlük sandık günlük aktivite sonrası açılabilmeli
- ✅ Hediye sandığı 7 günde bir gösterilmeli
- ✅ Ödüller doğru verilmeli
- ✅ Tekrar açma engellenmeli

**Notlar:**
- [Test notları buraya]

---

### Senaryo 6: Ses Sistemi Testi
**Amaç:** Ses çalma ve yönetim sistemini test etmek

**Test Adımları:**
1. ✅ Sesli öğrenme modunu başlat
2. ✅ Ses çalma butonuna tıkla
3. ✅ Sesin çalındığını kontrol et
4. ✅ Başka bir soruya geç
5. ✅ Önceki sesin durduğunu kontrol et
6. ✅ Modal aç
7. ✅ Sesin durduğunu kontrol et
8. ✅ Modal'ı kapat
9. ✅ Ses cache'inin çalıştığını kontrol et (aynı ses tekrar çalındığında)

**Beklenen Sonuç:**
- ✅ Sesler çalmalı
- ✅ Ses çakışması olmamalı
- ✅ Modal açıldığında ses durmalı
- ✅ Ses cache çalışmalı

**Notlar:**
- [Test notları buraya]

---

### Senaryo 7: Keyboard Navigation ve Accessibility Testi
**Amaç:** Klavye navigasyonu ve erişilebilirliği test etmek

**Test Adımları:**
1. ✅ Tab tuşu ile tüm elementler arasında gezin
2. ✅ Enter/Space ile butonları aktifleştir
3. ✅ Escape ile modal'ları kapat
4. ✅ Arrow keys ile tab navigation yap
5. ✅ Screen reader ile test et (NVDA/JAWS)
6. ✅ ARIA labels'in doğru olduğunu kontrol et
7. ✅ Focus management'in çalıştığını kontrol et

**Beklenen Sonuç:**
- ✅ Tüm elementler klavye ile erişilebilir olmalı
- ✅ Focus görünür olmalı
- ✅ Screen reader doğru bilgi vermeli
- ✅ Modal açıldığında focus modal içine gitmeli

**Notlar:**
- [Test notları buraya]

---

### Senaryo 8: Performance Testi
**Amaç:** Performans optimizasyonlarını test etmek

**Test Adımları:**
1. ✅ Console'u aç ve performance monitor'u aktifleştir
2. ✅ Sayfa yükleme süresini ölç
3. ✅ 10 hızlı tıklama yap (debouncing testi)
4. ✅ Scroll yap (throttling testi)
5. ✅ Tab'lar arasında geçiş yap (lazy loading testi)
6. ✅ Bellek kullanımını kontrol et
7. ✅ Network isteklerini kontrol et

**Beklenen Sonuç:**
- ✅ Sayfa yükleme < 3 saniye olmalı
- ✅ Debouncing çalışmalı (hızlı tıklamalar engellenmeli)
- ✅ Throttling çalışmalı (scroll smooth olmalı)
- ✅ Lazy loading çalışmalı (tab içerikleri gerektiğinde yüklenmeli)
- ✅ Bellek kullanımı makul olmalı

**Notlar:**
- [Test notları buraya]

---

### Senaryo 9: Edge Cases Testi
**Amaç:** Edge case'leri test etmek

**Test Adımları:**

#### 9.1 localStorage Dolu
1. ✅ localStorage'ı doldur (büyük data ekle)
2. ✅ Progress kaydetmeyi dene
3. ✅ QuotaExceededError handling'in çalıştığını kontrol et
4. ✅ Storage temizleme mekanizmasının çalıştığını kontrol et

#### 9.2 Network Hatası
1. ✅ Network'ü kapat (offline mod)
2. ✅ Sayfayı yenile
3. ✅ Offline cache'in kullanıldığını kontrol et
4. ✅ Offline indicator'ın gösterildiğini kontrol et

#### 9.3 Corrupted Data
1. ✅ localStorage'da corrupted data oluştur
2. ✅ Sayfayı yenile
3. ✅ Data validation'ın çalıştığını kontrol et
4. ✅ Default state'in yüklendiğini kontrol et

#### 9.4 Empty Data
1. ✅ words array'ini boşalt (simüle et)
2. ✅ Öğrenme modunu başlatmayı dene
3. ✅ Error handling'in çalıştığını kontrol et
4. ✅ Kullanıcıya uygun mesaj gösterildiğini kontrol et

#### 9.5 Rapid Clicks
1. ✅ Bir butona 10 kez hızlıca tıkla
2. ✅ Debouncing'in çalıştığını kontrol et
3. ✅ Sadece bir işlemin gerçekleştiğini kontrol et

#### 9.6 Modal Management
1. ✅ Bir modal aç
2. ✅ Başka bir modal açmayı dene
3. ✅ Önceki modal'ın kapandığını kontrol et
4. ✅ Escape ile modal'ı kapat
5. ✅ Focus'un geri döndüğünü kontrol et

**Beklenen Sonuç:**
- ✅ Tüm edge case'ler handle edilmeli
- ✅ Kullanıcıya uygun mesajlar gösterilmeli
- ✅ Sistem çökmeden devam etmeli

**Notlar:**
- [Test notları buraya]

---

### Senaryo 10: Mobile Responsiveness Testi
**Amaç:** Mobil cihazlarda çalıştığını test etmek

**Test Adımları:**
1. ✅ Chrome DevTools'da mobile view'i aktifleştir
2. ✅ Farklı ekran boyutlarını test et (320px, 375px, 768px, 1024px)
3. ✅ Touch event'leri test et
4. ✅ Responsive layout'u kontrol et
5. ✅ Modal'ların mobilde düzgün göründüğünü kontrol et
6. ✅ Butonların dokunulabilir boyutta olduğunu kontrol et

**Beklenen Sonuç:**
- ✅ Tüm ekran boyutlarında düzgün görünmeli
- ✅ Touch event'ler çalışmalı
- ✅ Layout responsive olmalı
- ✅ Butonlar dokunulabilir olmalı

**Notlar:**
- [Test notları buraya]

---

## 📊 TEST SONUÇLARI ÖZET

| Senaryo | Durum | Notlar |
|---------|-------|--------|
| Senaryo 1: İlk Kullanıcı | ⬜ Bekliyor | |
| Senaryo 2: Öğrenme Modları | ⬜ Bekliyor | |
| Senaryo 3: Gamification | ⬜ Bekliyor | |
| Senaryo 4: Bölüm Sistemi | ⬜ Bekliyor | |
| Senaryo 5: Sandık Sistemleri | ⬜ Bekliyor | |
| Senaryo 6: Ses Sistemi | ⬜ Bekliyor | |
| Senaryo 7: Accessibility | ⬜ Bekliyor | |
| Senaryo 8: Performance | ⬜ Bekliyor | |
| Senaryo 9: Edge Cases | ⬜ Bekliyor | |
| Senaryo 10: Mobile | ⬜ Bekliyor | |

**Genel Başarı Oranı:** [%]  
**Toplam Test:** [SAYI]  
**Başarılı:** [SAYI]  
**Başarısız:** [SAYI]  
**Atlanan:** [SAYI]

---

## 🐛 BULUNAN HATALAR

### Kritik Hatalar
- [Yok]

### Orta Seviye Hatalar
- [Yok]

### Düşük Seviye Hatalar
- [Yok]

---

## ✅ ÖNERİLER

1. [Öneri 1]
2. [Öneri 2]
3. [Öneri 3]

---

## 📝 TEST NOTLARI

- [Genel notlar buraya]
- [Özel durumlar buraya]
- [Bilinen sorunlar buraya]

---

**Test Tamamlandı:** [TARİH] [SAAT]  
**Test Eden:** [İSİM]  
**Onaylandı:** [İSİM] [TARİH]

