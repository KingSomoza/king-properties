/* ============================================================
   جلسة المستخدم + غلاف الاتصال بـ Apps Script
   ============================================================ */

/** ينفّذ نداء POST إلى Apps Script Web App ويعيد الـ JSON */
async function apiCall(action, payload = {}) {
  const session = getSession();
  const body = {
    action,
    sessionId: session ? session.sessionId : null,
    ...payload,
  };

  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error("تعذّر الاتصال بالخادم (" + res.status + ")");
  }

  const data = await res.json();

  if (data && data.error === "SESSION_INVALID") {
    clearSession();
    window.location.href = "index.html";
    return;
  }

  return data;
}

/** يحفظ الجلسة — localStorage لو "تذكرني"، وإلا sessionStorage فقط */
function saveSession(session, remember) {
  const record = { ...session, lastActivity: Date.now() };
  if (remember) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(record));
  } else {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(record));
  }
}

/** يقرأ الجلسة من أي من المخزنين */
function getSession() {
  const raw =
    sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
}

/** يحدّث وقت آخر نشاط — يُستدعى عند أي تفاعل داخل لوحة التحكم */
function touchSession() {
  const raw = sessionStorage.getItem(SESSION_KEY) ? sessionStorage : localStorage;
  const existing = raw.getItem(SESSION_KEY);
  if (!existing) return;
  const record = JSON.parse(existing);
  record.lastActivity = Date.now();
  raw.setItem(SESSION_KEY, JSON.stringify(record));
}

/**
 * يُستدعى في أعلى dashboard.html:
 * - يطرد المستخدم فوراً إذا لا توجد جلسة، أو انتهت بسبب عدم النشاط.
 * - غير كافٍ وحده كحماية حقيقية (الملف يبقى قابلاً للتحميل) — الحماية
 *   الفعلية تكون على مستوى الخادم عبر verifySession في كل نداء API.
 */
function requireSession() {
  const session = getSession();
  if (!session) {
    window.location.href = "index.html";
    return null;
  }
  const elapsedMinutes = (Date.now() - session.lastActivity) / 60000;
  if (elapsedMinutes > SESSION_TIMEOUT_MINUTES) {
    clearSession();
    window.location.href = "index.html?expired=1";
    return null;
  }
  touchSession();
  return session;
}

function logout() {
  clearSession();
  window.location.href = "index.html";
}

// تمديد الجلسة تلقائياً عند أي نشاط حقيقي من المستخدم
["click", "keydown", "scroll"].forEach((evt) =>
  window.addEventListener(evt, () => {
    if (getSession()) touchSession();
  })
);
