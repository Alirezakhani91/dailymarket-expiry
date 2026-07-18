# دیتابیس و Migrationها

Migrationهای 001 تا 007 مربوط به ساختار سازمانی، کاربران، محصولات/بچ‌های انقضا،
فروش/مشتریان/تحویل و گردش‌کار انقضا هستند و باید از Nhost Cloud استخراج و در
`nhost/migrations/default/` قرار گیرند (فعلاً به‌صورت TODO اسکلت‌بندی شده‌اند).

Migration 008 به‌دلیل شامل بودن اطلاعات شخصی نخستین مدیر سیستم، بازطراحی شده
و اطلاعات حساس از طریق `nhost/functions/bootstrap-admin.ts` و Environment
Variables تزریق می‌شود، نه از طریق Migration عمومی.
