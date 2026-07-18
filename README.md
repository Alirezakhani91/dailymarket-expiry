# dailymarket-expiry

پلتفرم ثبت و مدیریت محصولات نزدیک به تاریخ انقضا برای فروشگاه‌ها، مناطق و مدیریت اجرایی.

## معماری

- **Backend:** Nhost (PostgreSQL, Hasura GraphQL, Nhost Auth, Nhost Storage, Serverless Functions, Database Triggers)
- **Frontend:** Vite + TypeScript + React + Tailwind CSS + فونت Vazirmatn + پشتیبانی کامل RTL
- **Monorepo:** pnpm workspaces (`apps/web`, `packages/shared`, `nhost/*`)

GitHub این Repository به‌عنوان **Source of Truth** پروژه در نظر گرفته می‌شود. هیچ تغییر
ساختاری (Migration، Permission، Function) نباید فقط در Nhost Dashboard باقی بماند.

## پیش‌نیازها

- Node.js >= 18
- pnpm >= 9 (`npm install -g pnpm`)
- Nhost CLI (`npm install -g nhost`)
- Docker (اختیاری - برای اجرای Nhost به‌صورت Local)

## نصب Dependencies

```bash
pnpm install
```

## اجرای Frontend (توسعه)

```bash
cp apps/web/.env.example apps/web/.env
# مقادیر VITE_NHOST_SUBDOMAIN و VITE_NHOST_REGION را تنظیم کنید
pnpm dev
```

## اجرای Nhost به‌صورت Local

اگر Docker در دسترس است:

```bash
cd nhost
nhost up
```

اگر Docker/محیط Local در دسترس نیست، مستقیم روی Nhost Cloud Project توسعه دهید،
اما همچنان هر تغییر Migration/Metadata باید در همین Repository Commit شود.

## اتصال به Nhost Cloud

1. پروژه Cloud موجود را از طریق Nhost Dashboard به این GitHub Repository متصل کنید.
2. **قبل از فعال‌سازی Git-based Deployment**، مراحل Baseline زیر را انجام دهید
   (چون Migrationهای 001 تا 007 قبلاً مستقیم روی Cloud اجرا شده‌اند):
   - بررسی وضعیت فعلی Migrationهای اجراشده در Cloud.
   - مقایسه ساختار فعلی دیتابیس با فایل‌های داخل `nhost/migrations/default/`.
   - ثبت این Migrationها به‌عنوان «قبلاً اجراشده» (Baseline) در Nhost، بدون اجرای مجدد.
   - فقط پس از تایید Baseline، Git-based Deployment را فعال کنید.

   ⚠️ تا زمانی که این Baseline انجام نشده، Migrationهای 001 تا 007 را دوباره روی
   دیتابیس Cloud اجرا نکنید - این کار باعث Conflict می‌شود.

## Environment Variables

فایل نمونه: `apps/web/.env.example`

فرانت‌اند فقط این دو متغیر عمومی را دریافت می‌کند:

```
VITE_NHOST_SUBDOMAIN=
VITE_NHOST_REGION=
```

هرگز Admin Secret، Database Password، یا هر Secret مدیریتی دیگر در Frontend یا این
فایل قرار نگیرد. Secretهای Backend فقط در Nhost Environment Variables یا GitHub
Secrets نگهداری می‌شوند.

## اجرای Migrationها

```bash
cd nhost
nhost up          # اعمال Migrationها روی محیط Local
```

برای Production، Migrationهای جدید فقط از طریق Merge به `main` و CI/CD اعمال می‌شوند
(نه به‌صورت دستی در Dashboard).

## Seed Data

داده‌های آزمایشی/نمونه در `nhost/seeds/default/` قرار دارند و قابل Commit هستند.
اطلاعات واقعی کاربران/مشتریان/فروشگاه‌ها هرگز اینجا قرار نمی‌گیرد.

## Build

```bash
pnpm build
```

## Deployment

- **Frontend:** GitHub Actions → Build → سرویس Static Hosting متصل به GitHub
  (یا GitHub Pages در صورت انتخاب صریح - جزئیات در `docs/deployment.md`)
- **Backend:** Git-based Deployment از طریق Nhost (فقط بعد از Baseline اولیه)

## Branching Strategy

| Branch | هدف |
|---|---|
| `main` | نسخه پایدار - Protected، بدون Push مستقیم |
| `develop` | نسخه در حال توسعه |
| `feature/*` | قابلیت جدید |
| `fix/*` | اصلاح خطا |

فرمت Commit: `feat:` `fix:` `refactor:` `security:` `db:` `ui:` `docs:` `chore:`

## Security Notes

- فایل‌های `.env*`، `*.pem`، `*.key`، `.secrets` هرگز Commit نمی‌شوند (نگاه کنید به `.gitignore`).
- نقش داخلی `admin` هرگز به کاربران اپلیکیشن اختصاص داده نمی‌شود.
- عملیات حساس (ایجاد کاربر، ارسال پیامک/ایمیل، Job زمان‌بندی‌شده) فقط در Nhost
  Functions با دسترسی به Secret انجام می‌شوند - نه در Frontend.
- Migration 008 (Bootstrap مدیر سیستم) از اطلاعات شخصی پاک‌سازی شده؛ جزئیات در
  `docs/database.md`.

## Troubleshooting

مشکلات رایج و راه‌حل به‌مرور توسعه پروژه در این بخش اضافه می‌شود.

---

برای جزئیات بیشتر: `docs/architecture.md`، `docs/database.md`، `docs/permissions.md`،
`docs/workflows.md`، `docs/deployment.md`
