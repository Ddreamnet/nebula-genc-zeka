# Playground sohbet kalıcılığı — uygulama planı

**Durum:** plan, henüz kodlanmadı. **Tarih:** 9 Ağustos 2026

Hedef: öğrenci yeni sohbet açabilsin, eski sohbetlerini listeleyip açabilsin, açtığı yerden devam edebilsin. Bugün `messages` sadece React state'inde — sayfa yenilenince her şey gider.

---

## 0. Önce bir düzeltme

> "Model sadece son mesajımı algılayacak, bunu biliyorum"

Bu şu an doğru değil — `generate/route.ts` zaten son **20 turu** modele gönderiyor (`HISTORY_LIMIT = 20`), yani model geçmişi görüyor. Kalıcılık eklendiğinde de aynı kural işler: 200 mesajlık eski bir sohbeti açıp devam edersen modele son 20 tur gider, tamamı değil.

Bu bilinçli bir maliyet kararı: her tur tüm geçmişi girdi token'ı olarak yeniden faturalandırılır. 20 tur ≈ sabit bir tavan. Kalıcılık bunu değiştirmiyor, sadece o 20 turun nereden geldiğini değiştiriyor (RAM yerine veritabanı).

---

## 1. Veri modeli

### `playground_chats`

| Sütun | Tip | Not |
|---|---|---|
| `id` | `uuid pk default gen_random_uuid()` | |
| `user_id` | `uuid not null default auth.uid()` | `references auth.users(id) on delete cascade` |
| `tool_id` | `text not null` | sohbetin başladığı model (`claude-haiku` vb.) |
| `title` | `text` | ilk kullanıcı mesajından türetilir |
| `created_at` | `timestamptz not null default now()` | |
| `last_message_at` | `timestamptz not null default now()` | liste sıralaması bu sütundan |
| `message_count` | `int not null default 0` | listede "12 mesaj" göstermek için |
| `archived_at` | `timestamptz` | soft delete — silme gerçek DELETE değil |

### `playground_chat_messages`

| Sütun | Tip | Not |
|---|---|---|
| `id` | `uuid pk default gen_random_uuid()` | |
| `chat_id` | `uuid not null` | `references playground_chats(id) on delete cascade` |
| `user_id` | `uuid not null default auth.uid()` | denormalize — RLS'in join yapmasını önler |
| `role` | `text not null` | `check (role in ('user','assistant'))` |
| `content` | `text not null default ''` | |
| `kind` | `text not null default 'text'` | `check (kind in ('text','code','image','video','audio'))` |
| `attachment_paths` | `text[] not null default '{}'` | öğrencinin yüklediği görsellerin Storage yolları |
| `output_path` | `text` | üretilen medyanın Storage yolu |
| `generation_id` | `uuid` | `references ai_generations(id)` — faturalandırma kaydına bağlar |
| `seq` | `int not null` | sohbet içi sıra |
| `created_at` | `timestamptz not null default now()` | |

**`seq` neden var:** kullanıcı ve asistan satırları aynı transaction'da yazıldığında `created_at` eşit çıkabilir; `ORDER BY created_at` o durumda belirsiz. `seq` sıralamayı deterministik yapar.

### İndeksler

```sql
create index idx_playground_chats_user_recent
  on public.playground_chats (user_id, last_message_at desc)
  where archived_at is null;

create index idx_playground_chat_messages_chat_seq
  on public.playground_chat_messages (chat_id, seq);
```

---

## 2. RLS

Depodaki mevcut kalıba birebir uyuyor (`baseline_schema.sql:1445+`): öğrenci kendi satırı, admin her şey.

```sql
alter table public.playground_chats enable row level security;
alter table public.playground_chat_messages enable row level security;

create policy student_manage_own_chats on public.playground_chats
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy admin_full_access_playground_chats on public.playground_chats
  for all to authenticated
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));
```

Mesaj tablosu için aynı ikili (`user_id = auth.uid()` sayesinde join gerekmiyor).

---

## 3. RPC'ler

Yazma işleri `SECURITY DEFINER` RPC'lerden geçer — `rpc_start_generation` / `rpc_finalize_generation` kalıbının aynısı. Sebep: `seq`, `message_count` ve `last_message_at` tek transaction'da tutarlı kalmalı.

### `rpc_append_turn`

```
rpc_append_turn(
  p_chat_id uuid,              -- null ise yeni sohbet açar
  p_tool_id text,
  p_user_content text,
  p_attachment_paths text[],
  p_generation_id uuid
) returns table (chat_id uuid, assistant_message_id uuid)
```

Yaptıkları:
1. `p_chat_id` null ise `playground_chats`'e satır açar; değilse `user_id = auth.uid()` olduğunu doğrular (aksi halde `raise exception`).
2. Sohbet satırını `select ... for update` ile kilitler — iki sekme aynı anda yazarsa `seq` çakışmasın.
3. Kullanıcı mesajını `seq = coalesce(max(seq),0)+1` ile yazar.
4. **Boş bir asistan satırı** yazar (`content = ''`) ve id'sini döner. Sıra burada sabitlenir, model cevabı sonra doldurulur.
5. `title` boşsa ilk kullanıcı mesajından üretir:
   `left(regexp_replace(p_user_content, '\s+', ' ', 'g'), 60)`
6. `last_message_at = now()`, `message_count = message_count + 2`.

> Başlığı LLM ile özetlemek daha güzel olurdu ama her sohbet için ekstra bir model çağrısı = ekstra cevher. İlk 60 karakter bedava ve pratikte yeterli. İstenirse sonra eklenir.

### `rpc_settle_message`

```
rpc_settle_message(
  p_message_id uuid,
  p_content text,
  p_kind text,
  p_output_path text
) returns void
```

Boş asistan satırını doldurur. **Video için kritik:** video asenkron, cevap `generate/[id]/status/route.ts` içinde geliyor — o route da aynı RPC'yi çağırır. Ayrı bir yol gerekmez.

### `rpc_rename_chat(p_chat_id uuid, p_title text)` / `rpc_archive_chat(p_chat_id uuid)`

Sahiplik kontrolü + tek satır update.

---

## 4. Ekli görsellerin saklanması

Bugün ekler sadece o istek içinde yaşıyor (data URL olarak modele gidiyor, hiçbir yere yazılmıyor). Kalıcılık için Storage'a inmeleri gerekiyor.

**Yeni bucket: `playground-inputs`** (private). `playground-outputs`'tan ayrı olmasının sebebi farklı saklama süresi — girdi görselleri daha agresif temizlenebilir, çıktılar öğrencinin eseri.

Yol şeması: `{user_id}/{generation_id}-in{n}.jpg`

**Ne zaman yüklenir:** `rpc_start_generation` başarılı olduktan **sonra** (bakiye geçti, `generation_id` elimizde), model çağrısından **önce**. Böylece gate'e takılan istek yetim dosya bırakmaz.

**Okurken:** çıktılarda olduğu gibi 1 saatlik signed URL.

---

## 5. Devam ederken görselleri geri gönderme — planın en riskli yeri

Şu an `route.ts` geçmişten gelen görselleri sadece `data:image/...` biçiminde kabul ediyor (`IMAGE_DATA_URL_RE`). Kaydedilmiş bir sohbet açıldığında istemci elinde data URL değil, **Storage yolu** olacak.

Naif çözüm — istemci signed URL'i geri göndersin, sunucu OpenRouter'a iletsin — **yapılmamalı**: istemciden gelen keyfi bir URL'i modele yönlendirmek SSRF kapısıdır ve başka bir öğrencinin dosyasına işaret edebilir.

**Doğru çözüm:** geçmiş kayıtları URL değil **yol** taşır, sunucu yolu doğrulayıp kendisi imzalar:

```ts
// Yol mutlaka bu kullanıcının klasöründe olmalı — istemcinin gönderdiği
// yola asla olduğu gibi güvenilmez.
if (!path.startsWith(`${user.id}/`)) continue;
const { data } = await supabase.storage.from("playground-inputs").createSignedUrl(path, 3600);
```

OpenRouter `image_url.url` alanında http(s) URL kabul ediyor (data URL zorunlu değil), yani imzalı URL doğrudan çalışır. Süre 1 saat, istek anında üretildiği için sorun olmaz.

Mevcut "sadece son turun görselleri taşınır" kuralı ve o görsellerin de faturalandırılması aynen korunur.

---

## 6. API route'ları

| Route | İş |
|---|---|
| `GET /api/playground/chats` | Liste. `?limit=30&before=<iso>` ile cursor sayfalama. `archived_at is null`. |
| `GET /api/playground/chats/[id]` | Mesajlar, `seq` sırasında; ek ve çıktı yolları signed URL'e çevrilmiş. |
| `PATCH /api/playground/chats/[id]` | Yeniden adlandır. |
| `DELETE /api/playground/chats/[id]` | Arşivle (soft delete). |
| `POST /api/playground/generate` | **Değişiklik:** `chatId?: string` alır, cevapta `chatId` döner. |

`generate` route'unun yeni akışı:

```
1. rpc_start_generation(...)        // mevcut — cevher düşer
2. ekleri playground-inputs'a yükle // yeni
3. rpc_append_turn(...)             // yeni — chatId + assistantMessageId döner
4. model çağrısı                    // mevcut
5. rpc_finalize_generation(...)     // mevcut — gerçek maliyet
6. rpc_settle_message(...)          // yeni — asistan satırını doldurur
```

Hata durumunda 6. adım da çalışır, `content` = hata mesajı. Böylece transkript delik kalmaz.

---

## 7. Arayüz

**Sohbet listesi:** header'daki iki mega menünün yanına üçüncü bir tetikleyici ("Sohbetler") — mevcut `Popover` + `useHoverPopover` kalıbı zaten var, yeni bir bileşen sistemi gerekmiyor. Mobilde tam ekran drawer.

Gruplama: `Bugün` / `Bu hafta` / `Daha eski`. Her satır: başlık, model rozeti (`ProviderBadge`), göreli zaman.

**"Yeni sohbet" butonu:** `setMessages([])`, `setChatId(null)`, `setAttachments([])`. Aktif model korunur.

**Bir sohbet açmak:** mesajları çeker, `activeTool`'u `chat.tool_id`'den kurar, `chatId`'yi set eder. `Msg.attachments` artık signed URL tutar (data URL değil) — `Bubble` zaten `<img src>` render ettiği için görsel tarafta değişiklik gerekmez.

**Model değiştirme:** bugün `selectTool` sohbeti temizliyor. Kalıcılıkla birlikte iki seçenek var:
- **(a)** Aynı davranış — model değişimi yeni sohbet başlatır. Basit, öngörülebilir.
- **(b)** Sohbet korunur, sonraki mesaj yeni modele gider.

**(a) öneriliyor.** `playground_chats.tool_id` tek değer tutuyor; (b) için mesaj başına model kaydı gerekir ve "bu cevabı hangi model verdi" karmaşası çocuk kullanıcı için gereksiz.

---

## 8. Migration disiplini — ayrı bir bulgu

`supabase/migrations/` altındaki 7 dosyada `ai_generations`, `playground_credits`, `rpc_start_generation`, `rpc_finalize_generation`, `rpc_attach_video_job` **hiç geçmiyor**. Playground şeması doğrudan uzak veritabanına uygulanmış, migration olarak kayda geçmemiş.

Pratik sonucu: depodaki migration geçmişi mevcut veritabanını yeniden kuramaz. Yeni bir ortam (staging, yerel Supabase) ayağa kaldırmak imkânsız.

**Öneri:** bu planı uygulamadan önce mevcut playground şemasını uzak DB'den çekip bir "catch-up" migration olarak işlemek —
`supabase db diff` ya da tabloların `pg_dump --schema-only` çıktısı. Yeni sohbet tabloları o zaman düzgün bir migration dosyası olarak eklenir.

---

## 9. Saklama ve maliyet

| Kalem | Öneri |
|---|---|
| Mesaj satırları | Sınırsız tut — metin ucuz, öğrencinin arşivi bu. |
| Girdi görselleri | 90 gün sonra temizle; satırdaki `attachment_paths` kalır, önizleme kırık görünür. Ya da 90 gün sonra thumbnail'e indir. |
| Çıktı medyası | Şimdilik dokunma; hacim büyürse ayrı karar. |
| Arşivlenen sohbetler | 30 gün sonra gerçek DELETE (cascade mesajları da alır). |

Moderasyon yan faydası: bugün bir öğrencinin yüklediği görselin hiçbir kaydı yok, sadece `prompt` metni var. Girdileri saklamak 10-18 yaş bir üründe denetlenebilirlik açısından tek başına gerekçe.

---

## 10. Uygulama sırası

1. **Catch-up migration** — mevcut playground şemasını kayda geçir (§8).
2. **Migration** — iki tablo, indeksler, RLS, `playground-inputs` bucket'ı.
3. **RPC'ler** — `rpc_append_turn`, `rpc_settle_message`, rename/archive.
4. **`generate` route** — ek yükleme + iki yeni RPC çağrısı; `chatId` alıp döndürme.
5. **Yol→imzalı URL doğrulaması** (§5) — güvenlik açısından kritik parça, 4 ile birlikte.
6. **`GET/PATCH/DELETE /api/playground/chats`**.
7. **Arayüz** — liste menüsü, yeni sohbet, sohbet açma.
8. **Saklama işi** — pg_cron ya da elle çalıştırılan temizlik.

1-5 arası tek bir PR olabilir (kalıcılık, arayüz yok — sohbetler yazılır ama görünmez). 6-7 ikinci PR. Böylece yazma yolu, okuma arayüzünden önce gerçek trafikle test edilmiş olur.
