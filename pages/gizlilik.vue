<script setup lang="ts">
definePageMeta({ layout: false })
useHead({ title: 'Gizlilik — Upkept' })
</script>

<template>
  <div class="pp">
    <div class="pp-wrap">
      <NuxtLink to="/" class="pp-brand">
        <svg width="24" height="24" viewBox="0 0 60 60" fill="none">
          <path d="M47 22 A19 19 0 1 0 49 34" stroke="#6d6fae" stroke-width="6.5" stroke-linecap="round" />
          <circle cx="47" cy="14" r="4.6" fill="#6d6fae" />
        </svg>
        <span>upkept</span>
      </NuxtLink>

      <h1>Gizlilik Politikası</h1>
      <p class="pp-date">Son güncelleme: 23 Temmuz 2026</p>

      <p>Upkept, verilerini senin cihazında tutan bir alışkanlık takip uygulamasıdır. Hesap yok, reklam yok, analitik/izleme yok. Bu politika hangi verinin nerede durduğunu açıklar.</p>

      <h2>Toplanan veri</h2>
      <p>Uygulama yalnızca senin girdiğin verileri işler: alışkanlık adları, günlük durumlar (yaptım / kısmen / yapamadım), sebep etiketleri, kısa notlar ve tarihler. Bu veriler <b>cihazının içinde</b> (yerel SQLite) saklanır. Ad, e-posta, konum, kişiler gibi kişisel bilgi toplanmaz.</p>

      <h2>Bulut senkron (opsiyonel)</h2>
      <p>Cihazların arasında senkron istersen, Ayarlar'dan bir <b>senkron kodu</b> üretirsin. Bu durumda alışkanlık verilerin, kimliğine bağlı olmayan bu anonim koda göre Cloudflare altyapısında (D1) saklanır — yalnızca aynı kodu giren cihazların aynı veriyi görebilmesi için. Kod = tek erişim anahtarıdır; sende kalır, biz bir kimlikle eşleştirmeyiz.</p>
      <p>Senkron <b>varsayılan olarak kapalıdır</b>. Kod üretmediğin sürece hiçbir veri cihazından çıkmaz. Ayarlar → “Bağlantıyı kes” ile senkronu istediğin an durdurabilirsin.</p>

      <h2>Üçüncü taraflar</h2>
      <p>Barındırma ve (kullanırsan) senkron altyapısı için <b>Cloudflare</b> kullanılır. Reklam ağı, analitik veya izleme SDK'sı kullanılmaz. Verilerin satılmaz, kiralanmaz, pazarlama amacıyla paylaşılmaz.</p>

      <h2>Verini silme</h2>
      <p>Alışkanlık ve kayıtlarını uygulama içinden silebilirsin. Uygulamayı kaldırdığında cihazındaki veri silinir. Senkron kullandıysan, koduna bağlı bulut kaydının silinmesini istemek için aşağıdaki e-postadan bize ulaşabilirsin.</p>

      <h2>Çocuklar</h2>
      <p>Upkept genel kitleye yöneliktir ve bilerek çocuklardan veri toplamaz.</p>

      <h2>Değişiklikler</h2>
      <p>Bu politika güncellenirse bu sayfadaki tarih değişir.</p>

      <h2>İletişim</h2>
      <p>Sorular için: <a href="mailto:erenbekman@gmail.com">erenbekman@gmail.com</a></p>

      <NuxtLink to="/" class="pp-back">← Ana sayfa</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.pp { min-height: 100vh; background: #f7f4ed; color: #262420; font-family: 'Karla', system-ui, sans-serif; }
.pp-wrap { max-width: 720px; margin: 0 auto; padding: 40px 24px 80px; }
.pp-brand { display: inline-flex; align-items: center; gap: 9px; margin-bottom: 36px; }
.pp-brand span { font-family: 'Spectral', serif; font-weight: 500; font-size: 22px; letter-spacing: -0.8px; color: #201e1a; }
h1 { font-family: 'Spectral', serif; font-weight: 500; font-size: 40px; letter-spacing: -1px; margin: 0 0 6px; color: #201e1a; }
.pp-date { font-size: 14px; color: #9a917f; margin: 0 0 28px; }
h2 { font-family: 'Spectral', serif; font-weight: 500; font-size: 22px; margin: 32px 0 8px; color: #201e1a; }
p { font-size: 16px; line-height: 1.7; color: #4a453c; margin: 0 0 12px; }
b { color: #201e1a; }
a { color: #6d6fae; }
.pp-back { display: inline-block; margin-top: 40px; font-size: 15px; font-weight: 700; color: #6d6fae; }
</style>
