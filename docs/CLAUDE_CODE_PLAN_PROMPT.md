# Claude Code plan prompt'u

Kullanım:

1. `TEKNIK_DOKUMAN.md` ve `GOREV_PANOSU.md` dosyalarını repo'da `docs/` klasörüne koy.
2. Claude Code'u repo kökünde aç, **plan moduna geç (Shift+Tab ile "plan mode")** ya da varsa plan skill'ini çağır.
3. Aşağıdaki prompt'u yapıştır. `<ROL>` kısmını kendi rolünle değiştir: `1 Mobil UI`, `2 Cüzdan + entegrasyon`, `3 Solana programı`, `4 Web doğrulama`, `5 Backend + kaptan` ya da tüm repo iskeleti için `Herkes`.

---

```text
Plan modundasın; plan onaylanmadan hiçbir dosya yazma, komut çalıştırma.

Bağlam:
- @docs/TEKNIK_DOKUMAN.md projenin tek doğruluk kaynağı: mimari, Recording hesap yapısı, MWA akışı, hash/şifreleme kuralları, Supabase şeması, doğrulama sayfası, ortak kurallar.
- @docs/GOREV_PANOSU.md görev listesi ve tarihler (25–29 Kasım 2026, İstanbul saati).
- Proje: Witness. Seeker'da ses kaydı → SHA-256 → Seed Vault ile imzalanıp Solana devnet'e yazılır → web sayfası dosyayı tarayıcıda hash'leyip zincirle karşılaştırır.
- Repo yapısı: /app (React Native + Expo dev build), /program (Anchor), /web (Next.js), /supabase (SQL + Edge Functions), /docs.

Benim rolüm: <ROL>

İstediğim plan:
1. Önce repo'yu incele: hangi klasörler ve dosyalar zaten var, neler eksik. Var olan bir şeyi tekrar kurmayı planlama.
2. GOREV_PANOSU.md'de benim rolüme ait görevleri tarih sırasıyla çıkar. "MVP" ve "Hedef" görevleri önce gelsin; "Ekstra" görevleri ayrı bir bölümde, MVP bitince yapılacak şekilde listele.
3. Her görev için:
   - Oluşturulacak / değiştirilecek dosyaların tam yolları
   - Kullanılacak paketler ve sürümleri (dokümandakilerle uyumlu)
   - Teknik dokümandaki hangi kurala bağlı olduğu (ör. "Hash kuralı", "PDA seed'leri ['rec', hash32]", "Memo formatı witness:v1:<hex>")
   - Bitti sayılması için somut kabul kriteri ve nasıl test edileceği (komut ya da manuel adım)
   - Başka bir rolden beklediği şey (ör. program ID + IDL) ve o gelene kadar ne ile ilerleneceği (mock / sahte veri)
4. Riskli adımları işaretle ve her biri için yedek planı yaz (dokümandaki Memo yedeği, emülatör + mock wallet vb.).
5. Ortak kurallara aykırı bir şey önermemen gerekiyor: dosya mühürlendikten sonra yeniden kodlanmaz; transkript zincire yazılmaz (attach_transcript yok); konum zincire açık yazılmaz, sadece commitment; gizli anahtarlar repo'ya girmez, sadece .env.example.
6. Dokümanda belirsiz ya da eksik olan bir nokta görürsen uydurma; planın sonuna "Açık sorular" olarak ekle.
7. Planın en sonunda, bugün (25 Kasım) bitirmem gereken ilk 3 adımı tek tek yaz.

Plan Türkçe olsun; kod, dosya adları ve komutlar İngilizce kalabilir.
```

---

**İpuçları**

- Herkes kendi rolüyle ayrı bir Claude Code oturumu açarsa planlar çakışmaz; ortak dosyalara (IDL, `.env.example`) sadece sahibi dokunur.
- Repo iskeletini kurmak için önce bir kişi `<ROL>` yerine `Herkes` yazıp sadece klasör yapısı, README ve `.env.example` planını onaylatsın.
- Plan onaylandıktan sonra Claude Code'a "Planın 1. adımını uygula, bitince testi çalıştır ve dur" gibi adım adım ilerlemesini söyle.
