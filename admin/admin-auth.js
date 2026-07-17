const form = document.getElementById("loginForm");
const errorBox = document.getElementById("loginError");
const btn = document.getElementById("loginBtn");
const spinner = document.getElementById("loginSpinner");
const btnText = document.getElementById("loginBtnText");

// إذا كانت هناك جلسة صالحة، انتقل للوحة التحكم
(function redirectIfLoggedIn() {
  const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
  if (raw) {
    try {
      const session = JSON.parse(raw);
      if (session.sessionId) {
        window.location.href = "dashboard.html";
      }
    } catch (e) {}
  }
})();

if (new URLSearchParams(location.search).get("expired") === "1") {
  showError("انتهت الجلسة بسبب عدم النشاط. الرجاء تسجيل الدخول مجدداً.");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const remember = document.getElementById("remember").checked;

  if (!username || !password) {
    showError("يرجى إدخال اسم المستخدم وكلمة المرور");
    return;
  }

  setLoading(true);
  try {
    console.log("📤 إرسال طلب تسجيل الدخول...");
    
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "login", username, password }),
    });
    
    const data = await res.json();
    console.log("📥 رد الخادم:", data);

    if (data.ok && data.sessionId) {
      // حفظ الجلسة
      const sessionData = {
        sessionId: data.sessionId,
        username: data.username || username,
        role: data.role || "supervisor",
        permissions: data.permissions || [],
        lastActivity: Date.now()
      };
      
      if (remember) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      } else {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      }
      
      console.log("✅ تم حفظ الجلسة، جاري التوجيه...");
      window.location.href = "dashboard.html";
    } else {
      showError(data.message || "اسم المستخدم أو كلمة المرور غير صحيحة");
    }
  } catch (err) {
    console.error("❌ خطأ في الاتصال:", err);
    showError("تعذّر الاتصال بالخادم. تحقق من الرابط في admin-config.js");
  } finally {
    setLoading(false);
  }
});

function setLoading(isLoading) {
  btn.disabled = isLoading;
  spinner.classList.toggle("show", isLoading);
  btnText.textContent = isLoading ? "جارٍ التحقق..." : "تسجيل الدخول";
}

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.add("show");
}

function hideError() {
  errorBox.classList.remove("show");
}