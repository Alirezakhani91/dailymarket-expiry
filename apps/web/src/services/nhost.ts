import { NhostClient } from "@nhost/nhost-js";

// مقادیر از Environment Variables خوانده می‌شوند - هرگز اینجا Hardcode نشوند.
const subdomain = import.meta.env.VITE_NHOST_SUBDOMAIN;
const region = import.meta.env.VITE_NHOST_REGION;

if (!subdomain || !region) {
  // این خطا در توسعه کمک می‌کند فراموش نشدن .env تشخیص داده شود.
  console.warn(
    "VITE_NHOST_SUBDOMAIN یا VITE_NHOST_REGION تنظیم نشده‌اند. فایل .env را بررسی کنید."
  );
}

export const nhost = new NhostClient({
  subdomain,
  region,
});
