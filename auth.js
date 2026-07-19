// ===== تنظیمات مشترک اتصال به Nhost =====
const NHOST_SUBDOMAIN = "wijabqjyryslediitcrc";
const NHOST_REGION = "eu-central-1";
const GRAPHQL_URL = `https://${NHOST_SUBDOMAIN}.graphql.${NHOST_REGION}.nhost.run/v1`;
const AUTH_URL = `https://${NHOST_SUBDOMAIN}.auth.${NHOST_REGION}.nhost.run/v1/signin/email-password`;

const ROLE_HOME = {
  store_operator: "operator.html",
  region_manager: "manager.html",
  executive_manager: "executive.html",
  system_admin: "admin.html"
};

const ROLE_LABEL = {
  store_operator: "اپراتور فروشگاه",
  region_manager: "مدیر منطقه",
  executive_manager: "مدیر ارشد",
  system_admin: "مدیر سیستم"
};

const STATUS_LABEL = {
  draft: "پیش‌نویس",
  needs_correction: "نیاز به اصلاح",
  approved: "تأییدشده",
  sold: "فروخته‌شده",
  rejected: "ردشده"
};

function nhSession() {
  const token = sessionStorage.getItem("nhost_access_token");
  const userId = sessionStorage.getItem("nhost_user_id");
  const role = sessionStorage.getItem("nhost_default_role");
  if (!token || !userId || !role) return null;
  return { token, userId, role };
}

function nhRequireRole(allowedRoles) {
  const session = nhSession();
  if (!session) {
    window.location.href = "login.html";
    return null;
  }
  if (!allowedRoles.includes(session.role)) {
    window.location.href = ROLE_HOME[session.role] || "login.html";
    return null;
  }
  return session;
}

function nhLogout() {
  sessionStorage.clear();
  window.location.href = "login.html";
}

async function nhGql(query, variables, token) {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ query, variables })
  });

  let json;
  try {
    json = await res.json();
  } catch (e) {
    throw new Error("پاسخ نامعتبر از سرور دریافت شد. اتصال اینترنت یا آدرس سرور را بررسی کنید.");
  }

  if (json.errors) {
    const msg = json.errors[0].message || "خطای ناشناخته";
    if (msg.includes("JWTExpired") || msg.includes("Could not verify JWT") || msg.includes("Malformed Authorization")) {
      throw new Error("SESSION_EXPIRED");
    }
    throw new Error(msg);
  }

  return json.data;
}

function nhStampClass(status) {
  return "stamp stamp-" + status;
}

function nhFriendlyAuthError(message) {
  if (!message) return "ورود ناموفق بود.";
  if (message.includes("Incorrect email or password") || message.includes("invalid-email-password")) {
    return "ایمیل یا رمز عبور اشتباه است.";
  }
  if (message.includes("not verified") || message.includes("unverified")) {
    return "این حساب هنوز تأیید نشده است.";
  }
  return message;
}

// ===== تقویم شمسی (بدون وابستگی خارجی) =====
const JALALI_MONTHS = ["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];

function nhDiv(a, b) { return Math.floor(a / b); }

function nhGregorianToJalali(gy, gm, gd) {
  const g_d_m = [0,31,59,90,120,151,181,212,243,273,304,334];
  let jy = gy <= 1600 ? 0 : 979;
  gy -= gy <= 1600 ? 621 : 1600;
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days = (365 * gy) + nhDiv(gy2 + 3, 4) - nhDiv(gy2 + 99, 100) + nhDiv(gy2 + 399, 400) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * nhDiv(days, 12053);
  days %= 12053;
  jy += 4 * nhDiv(days, 1461);
  days %= 1461;
  if (days > 365) {
    jy += nhDiv(days - 1, 365);
    days = (days - 1) % 365;
  }
  let jm, jd;
  if (days < 186) {
    jm = 1 + nhDiv(days, 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + nhDiv(days - 186, 30);
    jd = 1 + ((days - 186) % 30);
  }
  return [jy, jm, jd];
}

function nhJalaliToGregorian(jy, jm, jd) {
  let gy = jy <= 979 ? 621 : 1600;
  jy -= jy <= 979 ? 0 : 979;
  let days = (365 * jy) + (nhDiv(jy, 33) * 8) + nhDiv((jy % 33) + 3, 4) + 78 + jd + (jm < 7 ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  gy += 400 * nhDiv(days, 146097);
  days %= 146097;
  if (days > 36524) {
    days -= 1;
    gy += 100 * nhDiv(days, 36524);
    days %= 36524;
    if (days >= 365) days += 1;
  }
  gy += 4 * nhDiv(days, 1461);
  days %= 1461;
  if (days > 365) {
    gy += nhDiv(days - 1, 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const leap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const sal_a = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (gm = 0; gm < 13; gm++) {
    const v = sal_a[gm];
    if (gd <= v) break;
    gd -= v;
  }
  return [gy, gm, gd];
}

function nhIsoToJalaliStr(iso) {
  if (!iso) return "—";
  const [gy, gm, gd] = iso.split("-").map(Number);
  const [jy, jm, jd] = nhGregorianToJalali(gy, gm, gd);
  return `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`;
}

function nhJalaliToIso(jy, jm, jd) {
  const [gy, gm, gd] = nhJalaliToGregorian(jy, jm, jd);
  return `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;
}

function nhTodayJalali() {
  const now = new Date();
  return nhGregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function nhDaysInJalaliMonth(jm) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return 29;
}
