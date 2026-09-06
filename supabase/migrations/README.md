# Migration durumu — 2026-09-05 (UYGULANDI)

## ✅ Durum: hepsi canlıya uygulandı (2026-09-05)

`schema_migrations` ile bu klasör artık iki yönde de eşleşiyor. `db push`
çalıştırmaya gerek yok; çalıştırılırsa da uygulanacak bir şey bulamaz.

Uygulama sırasında MCP kendi sürüm damgasını attığı için iki dosya yeniden
adlandırıldı — `20260830093000` → `20260905120812`, `20260905093000` →
`20260905120827`. Dosya adları artık Supabase'in kaydettiği sürümle birebir,
bu yüzden `db push` onları tekrar uygulamaya kalkmaz.

Aşağıdaki bölüm, uygulamadan ÖNCEKİ durumu ve neyin neden yapıldığını
belgeliyor — geçmiş kaydı olarak duruyor.

## ⚠️ (Geçmiş) Doğrudan `supabase db push` ÇALIŞTIRMA tuzağı

Bu klasörde, canlı veritabanının `supabase_migrations.schema_migrations`
tablosunda **kayıtlı olmayan** ama etkileri **zaten canlıda olan** iki dosya var:

- `20260828120000_admin_playground_draws_on_openrouter_balance.sql`
- `20260830090000_limit_concurrent_generations.sql`

Her ikisi de `rpc_start_generation` fonksiyonunun tamamını
`CREATE OR REPLACE` ile yeniden yazıyor. Bu fonksiyonun **canlıdaki güncel
hâli** ise daha sonraki `20260904232950_teacher_playground_no_ore_limit.sql`
tarafından yazıldı — ve o migration `schema_migrations`'ta **kayıtlı**.

`db push` yalnızca kayıtlı olmayanları, sürüm sırasına göre uygular. Yani
şu anda push edilirse:

```
20260828120000  uygulanır  → rpc_start_generation (öğretmen dalı YOK)
20260830090000  uygulanır  → rpc_start_generation (öğretmen dalı YOK)
20260830093000  uygulanır  → ✅ gerçekten eksik olan bu
20260904232950  ATLANIR    → kayıtlı olduğu için öğretmen dalı GERİ GELMEZ
20260905093000  uygulanır  → ✅ yeni bütünlük migration'ı
```

Sonuç: **öğretmenler yeniden cevher bakiyesi kapısına takılır.** 2026-09-04'te
çıkılan özellik sessizce geri alınmış olur.

## Doğru sıra

```bash
export SUPABASE_ACCESS_TOKEN="$SUPABASE_PAT_NEBULA"

# 1) Etkileri zaten canlıda olan iki dosyayı "uygulandı" olarak işaretle.
#    Bu bir DDL değil, yalnızca schema_migrations'a kayıt düşer.
supabase migration repair --status applied 20260828120000
supabase migration repair --status applied 20260830090000

# 2) Yerelin uzakla eşleştiğini gör. Beklenen: yalnızca
#    20260830093000 ve 20260905093000 "Local" tarafında kalır.
supabase migration list

# 3) Gerçekten eksik olan ikisini uygula.
supabase db push

# 4) Tipleri yeniden üret (playground_generation_inputs + meeting_url).
supabase gen types typescript --linked > web/src/lib/supabase/database.types.ts
```

## Bu klasördeki dosyaların durumu

| Dosya | Canlıda | schema_migrations'ta | Not |
|---|---|---|---|
| `20260726*` … `20260821091500` | ✅ | ✅ | Sağlam |
| `20260828120000` | ✅ | ✅ | 2026-09-05'te kayda geçirildi (repair) |
| `20260830090000` | ✅ | ✅ | 2026-09-05'te kayda geçirildi (repair) |
| `20260902213349` | ✅ | ✅ | Dosya 2026-09-05'te geri yazıldı (backfill) |
| `20260904232950` | ✅ | ✅ | `rpc_start_generation`'ın güncel hâli |
| `20260905120812` | ✅ | ✅ | Uygulandı (eski adı `20260830093000`) |
| `20260905120827` | ✅ | ✅ | Uygulandı (eski adı `20260905093000`) |

## `20260905093000` ne yapıyor

1. `students` için öğretmen UPDATE policy'si — yoktu, bu yüzden "Hakkında"
   notu sessizce kayboluyor ve ekranda "kaydedildi" yazıyordu.
2. `end_time > start_time` ve `day_of_week 0-6` CHECK kısıtları — hiçbir
   katmanda yoktu; ters saat girilmiş bir ders öğretmen bakiyesinden
   **eksi dakika** düşürüyordu.
3. `student_lessons.meeting_url` — Zoom/Meet linki için; ürün genelinde
   böyle bir alan hiç yoktu.
4. `teacher_view_global_resources` policy'si — predicate'i `auth.uid()`
   içermiyordu, yani rolsüz her oturum tüm global kaynakları okuyabiliyordu.
5. `lesson_reminder_log` için açık admin-okuma policy'si.
6. `topics(student_id, order_index)` ve
   `notifications(recipient_id, created_at desc)` indeksleri.

Uygulamadan önce doğrulandı: üç zaman tablosunda da **0 ihlal eden satır**.
