# Hasura Metadata

این پوشه پس از اجرای `nhost init` و اتصال به پروژه Cloud با دستور زیر پر می‌شود:

```
hasura metadata export --envfile .env.development
```

یا از طریق Nhost CLI که خودش Metadata را Sync می‌کند.

## نقش‌های اپلیکیشن (باید در `databases/default/tables/*.yaml` تعریف شوند)

- `store_operator`
- `region_manager`
- `executive_manager`
- `system_admin`

نقش داخلی `admin` هرگز نباید به کاربران اپلیکیشن اختصاص داده شود؛ فقط برای عملیات
سیستمی/Function ها با Admin Secret استفاده می‌شود.

## قواعد کلی Permission (خلاصه)

| نقش | select | insert | update | delete |
|---|---|---|---|---|
| store_operator | فقط فروشگاه‌های تخصیص‌یافته | draft خودش | فقط draft/needs_correction خودش | خیر |
| region_manager | فقط منطقه تخصیص‌یافته | فروش همان منطقه | بررسی ثبت‌های همان منطقه | خیر (بسیار محدود) |
| executive_manager | محدوده تحت مدیریت (Read-Only) | فقط Follow-Up/Announcement | خیر (به‌جز موارد فوق) | خیر |
| system_admin | کامل (Audit می‌شود) | کامل | کامل | محدود و Audit‌شده |

پیاده‌سازی دقیق هر Permission به‌صورت فایل جداگانه YAML برای هر جدول اضافه خواهد شد
(مرحله بعدی پس از تعریف Schema نهایی جداول).
