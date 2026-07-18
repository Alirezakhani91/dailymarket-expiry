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
