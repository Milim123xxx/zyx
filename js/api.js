// ─── API LAYER — Google Sheets via SheetBest ──────────────────────────────────

const API = (() => {
  const base = CONFIG.SHEET_BASE;

  async function request(path, method = "GET", body = null) {
    const opts = {
      method,
      headers: { "Content-Type": "application/json" },
    };
    if (body) opts.body = JSON.stringify(body);
    try {
      const res = await fetch(base + path, opts);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // DELETE returns empty body
      const text = await res.text();
      return text ? JSON.parse(text) : [];
    } catch (e) {
      console.error("API Error:", e);
      throw e;
    }
  }

  /* ── USERS ── */
  const Users = {
    getAll: () => request(CONFIG.SHEET_USERS),
    create: (u) => request(CONFIG.SHEET_USERS, "POST", u),
    update: (username, data) =>
      request(`${CONFIG.SHEET_USERS}/username/${encodeURIComponent(username)}`, "PATCH", data),
    getByUsername: (username) =>
      request(`${CONFIG.SHEET_USERS}/search?username=${encodeURIComponent(username)}`),
  };

  /* ── MOVIES ── */
  const Movies = {
    getAll: () => request(CONFIG.SHEET_MOVIES),
    create: (m) => request(CONFIG.SHEET_MOVIES, "POST", m),
    delete: (id) => request(`${CONFIG.SHEET_MOVIES}/id/${id}`, "DELETE"),
    update: (id, data) => request(`${CONFIG.SHEET_MOVIES}/id/${id}`, "PATCH", data),
  };

  /* ── EPISODES ── */
  const Episodes = {
    getAll: () => request(CONFIG.SHEET_EPISODES),
    getByMovieId: (movieId) =>
      request(`${CONFIG.SHEET_EPISODES}/search?movieId=${movieId}`),
    create: (ep) => request(CONFIG.SHEET_EPISODES, "POST", ep),
    delete: (id) => request(`${CONFIG.SHEET_EPISODES}/id/${id}`, "DELETE"),
  };

  /* ── PREMIUM ── */
  const Premium = {
    getAll: () => request(CONFIG.SHEET_PREMIUM),
    create: (p) => request(CONFIG.SHEET_PREMIUM, "POST", p),
    getByUsername: (username) =>
      request(`${CONFIG.SHEET_PREMIUM}/search?username=${encodeURIComponent(username)}`),
    update: (username, data) =>
      request(`${CONFIG.SHEET_PREMIUM}/username/${encodeURIComponent(username)}`, "PATCH", data),
  };

  return { Users, Movies, Episodes, Premium };
})();


// ─── LOCAL CACHE (fallback when offline / fast reads) ──────────────────────────
const Cache = (() => {
  const store = {};
  const set = (k, v) => { store[k] = v; };
  const get = (k) => store[k] || null;
  const clear = (k) => { delete store[k]; };
  return { set, get, clear };
})();


// ─── TRUEMONEY VOUCHER ─────────────────────────────────────────────────────────
const TrueMoney = {
  // Extract voucher hash from URL
  extractHash(url) {
    try {
      const u = new URL(url);
      return u.searchParams.get("v") || null;
    } catch {
      // try regex
      const m = url.match(/[?&]v=([^&]+)/);
      return m ? m[1] : null;
    }
  },

  // Redeem voucher via TrueMoney API
  // NOTE: TrueMoney API blocks direct browser requests due to CORS.
  // We use a CORS proxy to forward the request.
  async redeem(voucherUrl) {
    const hash = this.extractHash(voucherUrl);
    if (!hash) return { success: false, error: "ลิงก์ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง" };

    const endpoint = `https://gift.truemoney.com/campaign/vouchers/${hash}/redeem`;
    const payload = { mobile: CONFIG.TRUEMONEY_PHONE, voucher_hash: hash };

    // Try direct call first (in case CORS is allowed)
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return this._parseResponse(data);
    } catch (directErr) {
      // Fallback: try CORS proxy
      try {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(endpoint)}`;
        const res = await fetch(proxyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        return this._parseResponse(data);
      } catch (proxyErr) {
        console.error("TrueMoney error:", proxyErr);
        return {
          success: false,
          error: "ไม่สามารถตรวจสอบซองอั่งเปาได้ กรุณาลองใหม่อีกครั้ง",
        };
      }
    }
  },

  _parseResponse(data) {
    // TrueMoney success response: { status: { code: "SUCCESS" }, data: { voucher: { amount_baht: 25 } } }
    if (data?.status?.code === "SUCCESS") {
      const amount = parseFloat(data?.data?.voucher?.amount_baht || 0);
      return { success: true, amount };
    }
    const code = data?.status?.code || "UNKNOWN";
    const msgs = {
      "VOUCHER_OUT_OF_BUDGET": "ซองอั่งเปาถูกใช้งานแล้ว",
      "VOUCHER_EXPIRED": "ซองอั่งเปาหมดอายุแล้ว",
      "VOUCHER_NOT_FOUND": "ไม่พบซองอั่งเปานี้",
      "TARGET_USER_NOT_FOUND": "ไม่พบผู้รับ",
      "ALREADY_REDEEMED": "ซองอั่งเปานี้ถูกใช้ไปแล้ว",
    };
    return { success: false, error: msgs[code] || `ข้อผิดพลาด: ${code}` };
  },
};
