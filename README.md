<div align="center">

<img src="docs/logo.png" width="96" alt="upkept" />

# upkept

### Kusursuz değil, *sürekli* ol.

Sakin ve yargısız bir alışkanlık takipçisi. Her alışkanlık günün rakamına bir katman ekler; gün doldukça sen de görürsün. Bir günü kaçırmak bir alarm değil — sadece sessizce, istersen bir sebeple kaydedilir. Çünkü önemli olan kusursuz bir seri değil, **geri dönmen.**

<br/>

**[🌐 Web'de aç](https://up-kept.app/app)**  ·  **[⬇︎ macOS için indir](https://github.com/erenbekman/upkept/releases/latest/download/Upkept.dmg)**  ·  **[📱 App Store'dan indir](https://apps.apple.com/us/app/upkept/id6794236887)**

![platform](https://img.shields.io/badge/web·macOS·iOS-ff5a36?style=flat-square)
![hesap](https://img.shields.io/badge/hesap-gerekmez-14a37f?style=flat-square)
![offline](https://img.shields.io/badge/offline-çalışır-2f80ed?style=flat-square)
![fiyat](https://img.shields.io/badge/fiyat-ücretsiz-111114?style=flat-square)

<br/>

<img src="docs/preview-app.png" width="300" alt="upkept — Bugün ekranı, katmanlarla dolan gün rakamı" />

</div>

---

## Neden upkept?

Çoğu alışkanlık uygulaması seni bir seriyi bozduğunda cezalandırır — kırmızı rakamlar, bildirimler, suçluluk. upkept'in fikri farklı:

> **Kaçırmak bir hata değil, veridir.**

Bir günü kaçırdığında sebebini bir dokunuşla bırakırsın (*yorgundum, seyahatteydim, vaktim olmadı…*). Zamanla bu küçük notlar bir örüntüye dönüşür — kendini yargılamadan tanırsın. Metrikler "kusursuzluk" değil **süreklilik yüzdesi** etrafında kurulu.

## Öne çıkanlar

- 🌊 **Dolan rakam** — günün rakamı her alışkanlıkla bir katman dolar. Basılı tut: yaptım; dokun: kısmen, dinlen ya da olmadı.
- ✍️ **Yargısız kayıt** — "olmadı + sebep" kaydetmek "yaptım" kadar hızlı. Miktarlı hedefler (8 bardak su gibi) adım adım dolar.
- ▦ **İlerleme** — dolan rakamlardan bir ay takvimi, aylık grid ve sayılar: süreklilik, seriler, en sık sebep, en zor gün.
- 📱 **Widget** — ana ekranda ve kilit ekranında dolan rakam; satıra dokunarak işaretle.
- 🎨 **Açık / koyu, beş vurgu rengi** — istersen rakam tek renkle dolar.
- 🔒 **Gizlilik önce** — hesap yok, reklam yok, izleme yok. Verilerin cihazında kalır.
- ☁️ **Opsiyonel senkron** — istersen login'siz, anonim bir kodla cihazların arasında senkronla.
- 📴 **Offline** — uçakta, dağda, internetsiz her yerde çalışır.

<div align="center">
<img src="docs/preview-grid.png" width="760" alt="upkept — İlerleme: ay, grid ve sayılar" />
</div>

## İndir / kullan

| Platform | Nasıl |
|---|---|
| **Web / PWA** | [up-kept.app](https://up-kept.app/app) — tarayıcıda aç, "Ana ekrana ekle" ile kur |
| **macOS** | [Upkept.dmg indir](https://github.com/erenbekman/upkept/releases/latest/download/Upkept.dmg) → Applications'a sürükle · Apple tarafından onaylı, uyarı çıkmaz |
| **iOS** | [App Store'dan indir](https://apps.apple.com/us/app/upkept/id6794236887) — iPhone & iPad |
| **Windows / Android** | Yakında |

macOS uygulaması açılışta kendini otomatik günceller — yeni sürüm için tekrar indirmene gerek yok.

## Gizlilik

Veriler (alışkanlıklar, durumlar, notlar) cihazında **yerel SQLite**'ta tutulur. Zorunlu hesap, bulut ya da izleme yok. Cihazlar arası senkronu açarsan verin Cloudflare'de anonim bir koda göre saklanır — kimliğine bağlı değil, istediğin an durdurabilirsin. Ayrıntı: [Gizlilik Politikası](https://up-kept.app/privacy).

---

<details>
<summary><b>Geliştiriciler için</b></summary>

Tek kod tabanı → web (PWA) · iOS/Android (Capacitor) · masaüstü (Tauri).
Nuxt 3 (SPA, `ssr: false`) · TypeScript · @capacitor-community/sqlite (web'de jeep-sqlite + sql.js, native'de gerçek SQLite) · @vite-pwa/nuxt.

```bash
npm install
npm run dev              # geliştirme
npm run generate         # web build → .output/public (Cloudflare Pages: output dir "dist")
npm run cap:sync         # generate + native'e kopyala
npx cap open ios         # Xcode
npx tauri build --bundles app   # masaüstü
scripts/release-desktop.sh 0.1.2 "notlar"   # imzalı desktop sürümü + auto-update
```

</details>

## Lisans

© 2026 Eren Bekman — tüm hakları saklıdır. Kaynak kod okunabilsin diye açık; kopyalama, değiştirme ve yeniden dağıtım izne tabidir. Ayrıntı: [LICENSE](LICENSE).

<div align="center">
<br/>
<i>Kaçırmak da yolculuğun bir parçası.</i>
</div>
