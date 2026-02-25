// ─── AUTH MODULE ──────────────────────────────────────────────────────────────

const Auth = (() => {
  let currentUser = null;

  // Session storage for user session
  const SESSION_KEY = "streamx_user";

  function loadSession() {
    try {
      const s = sessionStorage.getItem(SESSION_KEY);
      if (s) currentUser = JSON.parse(s);
    } catch {}
  }

  function saveSession(user) {
    currentUser = user;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }

  function clearSession() {
    currentUser = null;
    sessionStorage.removeItem(SESSION_KEY);
  }

  function getUser() { return currentUser; }
  function isLoggedIn() { return !!currentUser; }
  function isAdmin() { return currentUser?.isAdmin === true; }
  function isPremium() {
    if (!currentUser) return false;
    if (currentUser.isAdmin) return true;
    const exp = currentUser.premiumExpiry;
    if (!exp) return false;
    return new Date(exp) > new Date();
  }

  async function register({ username, password, confirm }) {
    username = username.trim();
    if (!username || !password) return { error: "กรุณากรอกข้อมูลให้ครบ" };
    if (password.length < 6) return { error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" };
    if (password !== confirm) return { error: "รหัสผ่านไม่ตรงกัน" };
    if (username === CONFIG.ADMIN.username) return { error: "ชื่อผู้ใช้นี้ไม่สามารถใช้งานได้" };

    UI.showLoading();
    try {
      const existing = await API.Users.getByUsername(username);
      if (Array.isArray(existing) && existing.length > 0)
        return { error: "ชื่อผู้ใช้นี้มีอยู่แล้ว" };

      const newUser = {
        username,
        password,
        createdAt: new Date().toISOString(),
        premiumExpiry: "",
        favorites: "",
      };
      await API.Users.create(newUser);
      saveSession({ username, isAdmin: false, premiumExpiry: "" });
      renderNav();
      return { success: true };
    } catch {
      return { error: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" };
    } finally {
      UI.hideLoading();
    }
  }

  async function login({ username, password }) {
    username = username.trim();
    if (!username || !password) return { error: "กรุณากรอกข้อมูลให้ครบ" };

    // Admin check (local, no API call)
    if (username === CONFIG.ADMIN.username && password === CONFIG.ADMIN.password) {
      saveSession({ username, isAdmin: true, premiumExpiry: "" });
      renderNav();
      return { success: true, isAdmin: true };
    }

    UI.showLoading();
    try {
      const results = await API.Users.getByUsername(username);
      const user = Array.isArray(results) ? results.find(u => u.username === username) : null;
      if (!user || user.password !== password) return { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
      saveSession({
        username: user.username,
        isAdmin: false,
        premiumExpiry: user.premiumExpiry || "",
      });
      renderNav();
      return { success: true };
    } catch {
      return { error: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" };
    } finally {
      UI.hideLoading();
    }
  }

  function logout() {
    clearSession();
    renderNav();
    App.showHome();
  }

  async function refreshPremiumStatus() {
    if (!currentUser || currentUser.isAdmin) return;
    try {
      const results = await API.Users.getByUsername(currentUser.username);
      const user = Array.isArray(results) ? results.find(u => u.username === currentUser.username) : null;
      if (user) {
        currentUser.premiumExpiry = user.premiumExpiry || "";
        saveSession(currentUser);
        renderNav();
      }
    } catch {}
  }

  // ── Render Nav ──
  function renderNav() {
    const navRight = document.getElementById("nav-right");
    if (!navRight) return;
    if (!currentUser) {
      navRight.innerHTML = `
        <button class="nav-btn outline" id="btn-login">เข้าสู่ระบบ</button>
        <button class="nav-btn fill" id="btn-register">สมัครสมาชิก</button>
      `;
      document.getElementById("btn-login").onclick = () => Modal.openAuth("login");
      document.getElementById("btn-register").onclick = () => Modal.openAuth("register");
    } else {
      const premBadge = isPremium()
        ? `<span class="premium-badge">👑 PREMIUM</span>`
        : `<button class="nav-btn premium-cta" id="btn-get-premium">✨ รับ Premium</button>`;
      const adminBtn = isAdmin()
        ? `<button class="nav-btn outline" id="btn-admin">⚙️ Admin</button>` : "";
      navRight.innerHTML = `
        <button class="nav-btn outline" id="btn-favorites">❤️ โปรด</button>
        ${premBadge}
        ${adminBtn}
        <div class="user-pill">
          <div class="user-avatar">${currentUser.username[0].toUpperCase()}</div>
          <span class="user-name">${currentUser.username}</span>
          <button class="logout-btn" id="btn-logout" title="ออกจากระบบ">✕</button>
        </div>
      `;
      document.getElementById("btn-favorites").onclick = () => App.showFavorites();
      document.getElementById("btn-logout").onclick = () => logout();
      const adminEl = document.getElementById("btn-admin");
      if (adminEl) adminEl.onclick = () => Admin.render();
      const premBtn = document.getElementById("btn-get-premium");
      if (premBtn) premBtn.onclick = () => Premium.openModal();
    }
  }

  // ── Auth Modal ──
  function openAuthModal(mode) {
    const isLogin = mode === "login";
    const html = `
      <div class="modal-overlay" id="auth-modal">
        <div class="modal">
          <div class="modal-header">
            <div class="modal-title">${isLogin ? "🔑 เข้าสู่ระบบ" : "✨ สมัครสมาชิก"}</div>
            <button class="modal-close" id="auth-close">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">ชื่อผู้ใช้</label>
              <input class="form-input" id="auth-username" placeholder="กรอกชื่อผู้ใช้" />
            </div>
            <div class="form-group">
              <label class="form-label">รหัสผ่าน</label>
              <input class="form-input" id="auth-password" type="password" placeholder="กรอกรหัสผ่าน" />
            </div>
            ${!isLogin ? `
            <div class="form-group">
              <label class="form-label">ยืนยันรหัสผ่าน</label>
              <input class="form-input" id="auth-confirm" type="password" placeholder="กรอกรหัสผ่านอีกครั้ง" />
            </div>` : ""}
            <div id="auth-error" class="error-msg" style="display:none"></div>
            <button class="btn-primary btn-full" id="auth-submit">
              ${isLogin ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
            </button>
            <div class="form-switch">
              ${isLogin
                ? `ยังไม่มีบัญชี? <span id="auth-switch">สมัครสมาชิกที่นี่</span>`
                : `มีบัญชีแล้ว? <span id="auth-switch">เข้าสู่ระบบ</span>`}
            </div>
          </div>
        </div>
      </div>`;
    Modal.render(html);

    document.getElementById("auth-close").onclick = Modal.close;
    document.getElementById("auth-switch").onclick = () => {
      Modal.close();
      setTimeout(() => openAuthModal(isLogin ? "register" : "login"), 50);
    };

    const submit = async () => {
      const username = document.getElementById("auth-username").value;
      const password = document.getElementById("auth-password").value;
      const confirm = !isLogin ? document.getElementById("auth-confirm").value : null;
      const errEl = document.getElementById("auth-error");
      errEl.style.display = "none";

      let res;
      if (isLogin) res = await login({ username, password });
      else res = await register({ username, password, confirm });

      if (res.error) {
        errEl.textContent = "⚠️ " + res.error;
        errEl.style.display = "block";
        return;
      }
      Modal.close();
      if (res.isAdmin) {
        UI.toast("ยินดีต้อนรับ Admin! 👑", "success");
        Admin.render();
      } else {
        UI.toast(`ยินดีต้อนรับ ${currentUser.username}! 🎬`, "success");
        App.showHome();
      }
    };

    document.getElementById("auth-submit").onclick = submit;
    ["auth-username","auth-password","auth-confirm"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("keydown", e => e.key === "Enter" && submit());
    });
  }

  loadSession();

  return { getUser, isLoggedIn, isAdmin, isPremium, login, register, logout, renderNav, openAuthModal, refreshPremiumStatus, saveSession };
})();


// ── Modal Helper ──────────────────────────────────────────────────────────────
const Modal = {
  render(html) {
    const layer = document.getElementById("modal-layer");
    layer.innerHTML = html;
    layer.querySelector(".modal-overlay")?.addEventListener("click", e => {
      if (e.target.classList.contains("modal-overlay")) Modal.close();
    });
  },
  close() {
    document.getElementById("modal-layer").innerHTML = "";
  },
  openAuth(mode) { Auth.openAuthModal(mode); },
};


// ── UI Helpers ────────────────────────────────────────────────────────────────
const UI = {
  toast(msg, type = "success", duration = 3000) {
    const c = document.getElementById("toast-container");
    const t = document.createElement("div");
    t.className = `toast ${type}`;
    t.innerHTML = `${type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️"} ${msg}`;
    c.appendChild(t);
    setTimeout(() => t.remove(), duration);
  },
  showLoading() {
    let el = document.getElementById("global-loading");
    if (!el) {
      el = document.createElement("div");
      el.id = "global-loading";
      el.innerHTML = `<div class="spinner"></div>`;
      document.body.appendChild(el);
    }
    el.style.display = "flex";
  },
  hideLoading() {
    const el = document.getElementById("global-loading");
    if (el) el.style.display = "none";
  },
};
