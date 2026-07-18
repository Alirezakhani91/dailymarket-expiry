// nhost/functions/bootstrap-admin.ts
//
// این تابع یک‌بار (توسط خود system_admin یا در فرآیند Deploy اولیه) فراخوانی می‌شود
// تا نخستین مدیر سیستم را با استفاده از Nhost Admin Secret ایجاد کند.
//
// اطلاعات واقعی (ایمیل، موبایل، کد پرسنلی) هرگز داخل کد نیستند؛
// همگی از Nhost Environment Variables خوانده می‌شوند:
//   BOOTSTRAP_ADMIN_EMAIL
//   BOOTSTRAP_ADMIN_PHONE
//   BOOTSTRAP_ADMIN_PERSONNEL_CODE
//   NHOST_ADMIN_SECRET  (به‌صورت خودکار توسط Nhost در دسترس Function است)

import type { Request, Response } from "express";

export default async (req: Request, res: Response) => {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const phone = process.env.BOOTSTRAP_ADMIN_PHONE;
  const personnelCode = process.env.BOOTSTRAP_ADMIN_PERSONNEL_CODE;

  if (!email || !phone || !personnelCode) {
    return res.status(500).json({
      error:
        "متغیرهای BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PHONE / BOOTSTRAP_ADMIN_PERSONNEL_CODE در Nhost تنظیم نشده‌اند.",
    });
  }

  // TODO: فراخوانی Nhost Auth Admin API یا Hasura Mutation با admin role
  // برای ایجاد کاربر system_admin و درج رکورد مربوطه.
  // این بخش عمداً به‌عنوان اسکلت باقی مانده تا مطابق ساختار واقعی جداول شما تکمیل شود.

  return res.status(200).json({ status: "bootstrap logic not yet implemented" });
};
