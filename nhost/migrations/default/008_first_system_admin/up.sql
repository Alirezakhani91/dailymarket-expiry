-- Migration 008 - نسخه بازطراحی‌شده و امن
--
-- نسخه اصلی این Migration که در Nhost Cloud اجرا شده بود، شامل اطلاعات شخصی
-- (ایمیل، موبایل، کد پرسنلی) نخستین مدیر سیستم بود.
-- طبق سیاست پروژه، هیچ اطلاعات شخصی واقعی نباید داخل Git Repository قرار گیرد.
--
-- این نسخه فقط "ساختار" لازم برای Bootstrap کردن مدیر سیستم را می‌سازد.
-- ایجاد رکورد واقعی مدیر باید در یک Setup Script جداگانه و خارج از این
-- Migration عمومی انجام شود (نگاه کنید به: nhost/functions/bootstrap-admin
-- که در ادامه پروژه اضافه خواهد شد).

-- مثال: یک جدول/ستون برای علامت‌گذاری اینکه Bootstrap انجام شده یا نه
-- (در صورتی که چنین چیزی در نسخه اصلی وجود داشته، متناسب با ساختار واقعی
-- دیتابیس شما تنظیم شود)

CREATE TABLE IF NOT EXISTS public.system_bootstrap (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bootstrapped  boolean NOT NULL DEFAULT false,
  bootstrapped_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- نکته: مقداردهی اولیه system_admin (ایمیل/موبایل/کد پرسنلی واقعی) باید
-- در زمان اجرا از طریق Environment Variable یا Nhost Secret خوانده شود،
-- نه اینکه در این فایل Hardcode شود.
