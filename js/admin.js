// ─── ADMIN MODULE ─────────────────────────────────────────────────────────────

const Admin = (() => {

  async function render() {
    if (!Auth.isAdmin()) return;
    const app = document.getElementById("app");
    const footer = document.getElementById("app-footer");
    footer.style.display = "none";

    // Load data
    UI.showLoading();
    let movies = [], episodes = [], premiums = [];
    try {
      [movies, episodes, premiums] = await Promise.all([
        API.Movies.getAll(),
        API.Episodes.getAll(),
        API.Premium.getAll(),
      ]);
    } catch { UI.toast("โหลดข้อมูลล้มเหลว", "error"); }
    UI.hideLoading();

    // Attach episodes count to movies
    movies = movies.map(m => ({
      ...m,
      _epCount: episodes.filter(e => e.movieId == m.id).length,
    }));

    Cache.set("movies", movies);
    Cache.set("episodes", episodes);

    const filmCount = movies.filter(m => m.type === "movie").length;
    const animeCount = movies.filter(m => m.type === "anime").length;
    const premActive = premiums.filter(p => p.expiresAt && new Date(p.expiresAt) > new Date()).length;

    app.innerHTML = `
      <div class="admin-layout">
        <aside class="admin-sidebar">
          <div class="admin-logo">⚙️ ADMIN</div>
          <div class="admin-nav-item active" id="nav-manage">🎬 จัดการหนัง</div>
          <div class="admin-nav-item" id="nav-premium-list">👑 สมาชิก Premium</div>
          <div class="admin-nav-item" id="nav-home">🏠 กลับหน้าหลัก</div>
        </aside>
        <div class="admin-content" id="admin-content-area">
          <div class="admin-stats">
            <div class="stat-card">
              <div class="stat-icon">🎬</div>
              <div class="stat-num" style="color:var(--accent)">${movies.length}</div>
              <div class="stat-label">ทั้งหมด</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">🎥</div>
              <div class="stat-num">${filmCount}</div>
              <div class="stat-label">หนัง</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">🎌</div>
              <div class="stat-num">${animeCount}</div>
              <div class="stat-label">อนิเมะ</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">👑</div>
              <div class="stat-num" style="color:#ffd60a">${premActive}</div>
              <div class="stat-label">Premium</div>
            </div>
          </div>

          <div id="admin-section-movies">
            ${renderMovieSection(movies)}
          </div>
          <div id="admin-section-premium" style="display:none">
            ${renderPremiumSection(premiums)}
          </div>
        </div>
      </div>`;

    // Nav events
    document.getElementById("nav-manage").onclick = () => {
      document.getElementById("admin-section-movies").style.display = "block";
      document.getElementById("admin-section-premium").style.display = "none";
    };
    document.getElementById("nav-premium-list").onclick = () => {
      document.getElementById("admin-section-movies").style.display = "none";
      document.getElementById("admin-section-premium").style.display = "block";
    };
    document.getElementById("nav-home").onclick = () => {
      footer.style.display = "";
      App.showHome();
    };

    bindMovieActions();
  }

  function renderMovieSection(movies) {
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;">
        <h2 class="admin-title">จัดการ<span style="color:var(--accent)">หนัง & อนิเมะ</span></h2>
        <button class="btn-primary" id="btn-add-movie">+ เพิ่มหนัง / อนิเมะ</button>
      </div>
      <div id="movie-list">
        ${movies.length === 0
          ? `<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">ยังไม่มีหนัง กด "+ เพิ่มหนัง/อนิเมะ" เพื่อเริ่มต้น</div></div>`
          : movies.map(m => movieRowHTML(m)).join("")}
      </div>`;
  }

  function movieRowHTML(m) {
    return `
      <div class="admin-movie-row" data-id="${m.id}">
        ${m.image
          ? `<img src="${m.image}" class="admin-movie-thumb" onerror="this.style.display='none'" />`
          : `<div class="admin-movie-thumb-placeholder">🎬</div>`}
        <div style="flex:1;min-width:0;">
          <div class="admin-movie-name">${m.title}</div>
          <div class="admin-ep-count">
            ${m.type === "anime" ? "🎌 อนิเมะ" : "🎬 หนัง"} · ${m._epCount || 0} ตอน
            ${m.premiumOnly === "true" ? `<span class="prem-only-tag">👑 Premium</span>` : ""}
          </div>
        </div>
        <button class="add-ep-btn btn-add-ep" data-id="${m.id}" data-title="${m.title}" title="เพิ่มตอน">+</button>
        <button class="del-btn btn-del-movie" data-id="${m.id}">ลบ</button>
      </div>`;
  }

  function renderPremiumSection(premiums) {
    if (!premiums.length) return `<div class="empty-state"><div class="empty-icon">👑</div><div class="empty-text">ยังไม่มีสมาชิก Premium</div></div>`;
    return `
      <h2 class="admin-title" style="margin-bottom:1.2rem;">สมาชิก <span style="color:#ffd60a">Premium</span></h2>
      <div class="prem-table-wrap">
        <table class="prem-table">
          <thead>
            <tr><th>ผู้ใช้</th><th>จำนวนเงิน</th><th>เปิดใช้เมื่อ</th><th>หมดอายุ</th><th>สถานะ</th></tr>
          </thead>
          <tbody>
            ${premiums.map(p => {
              const active = p.expiresAt && new Date(p.expiresAt) > new Date();
              const exp = p.expiresAt ? new Date(p.expiresAt).toLocaleDateString("th-TH") : "-";
              const act = p.activatedAt ? new Date(p.activatedAt).toLocaleDateString("th-TH") : "-";
              return `
                <tr>
                  <td>${p.username}</td>
                  <td>฿${p.amount}</td>
                  <td>${act}</td>
                  <td>${exp}</td>
                  <td><span class="status-badge ${active ? "active" : "expired"}">${active ? "✅ ใช้งาน" : "❌ หมดอายุ"}</span></td>
                </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>`;
  }

  function bindMovieActions() {
    const btn = document.getElementById("btn-add-movie");
    if (btn) btn.onclick = () => openAddMovieModal();

    document.querySelectorAll(".btn-add-ep").forEach(b => {
      b.onclick = () => openAddEpModal(b.dataset.id, b.dataset.title);
    });
    document.querySelectorAll(".btn-del-movie").forEach(b => {
      b.onclick = () => confirmDeleteMovie(b.dataset.id);
    });
  }

  // ── Add Movie Modal ──
  function openAddMovieModal() {
    const html = `
      <div class="modal-overlay" id="add-movie-modal">
        <div class="modal">
          <div class="modal-header">
            <div class="modal-title">+ เพิ่มหนัง / อนิเมะ</div>
            <button class="modal-close" id="am-close">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">ประเภท</label>
              <div class="type-toggle">
                <button class="type-btn active" data-val="movie" id="type-movie">🎬 หนัง</button>
                <button class="type-btn" data-val="anime" id="type-anime">🎌 อนิเมะ</button>
              </div>
              <input type="hidden" id="am-type" value="movie" />
            </div>
            <div class="form-group">
              <label class="form-label">ชื่อหนัง / อนิเมะ *</label>
              <input class="form-input" id="am-title" placeholder="เช่น Attack on Titan" />
            </div>
            <div class="form-group">
              <label class="form-label">ลิงก์รูปภาพ (Poster)</label>
              <input class="form-input" id="am-image" placeholder="https://..." />
              <img id="am-preview" style="display:none;width:80px;height:110px;object-fit:cover;border-radius:6px;margin-top:8px;" />
            </div>
            <div class="form-group">
              <label class="form-label" style="display:flex;align-items:center;gap:0.5rem;">
                <input type="checkbox" id="am-premium" style="width:16px;height:16px;accent-color:var(--accent);" />
                <span>👑 เฉพาะสมาชิก Premium เท่านั้น</span>
              </label>
            </div>
            <div id="am-error" class="error-msg" style="display:none"></div>
            <div class="form-actions">
              <button class="btn-secondary" id="am-cancel">ยกเลิก</button>
              <button class="btn-primary" id="am-submit" style="flex:2">✅ ยืนยัน เพิ่มหนัง</button>
            </div>
          </div>
        </div>
      </div>`;

    Modal.render(html);
    document.getElementById("am-close").onclick = Modal.close;
    document.getElementById("am-cancel").onclick = Modal.close;

    // Type toggle
    document.getElementById("type-movie").onclick = () => {
      document.getElementById("am-type").value = "movie";
      document.getElementById("type-movie").classList.add("active");
      document.getElementById("type-anime").classList.remove("active");
    };
    document.getElementById("type-anime").onclick = () => {
      document.getElementById("am-type").value = "anime";
      document.getElementById("type-anime").classList.add("active");
      document.getElementById("type-movie").classList.remove("active");
    };

    // Image preview
    document.getElementById("am-image").oninput = e => {
      const prev = document.getElementById("am-preview");
      prev.src = e.target.value;
      prev.style.display = e.target.value ? "block" : "none";
    };

    document.getElementById("am-submit").onclick = async () => {
      const title = document.getElementById("am-title").value.trim();
      const image = document.getElementById("am-image").value.trim();
      const type = document.getElementById("am-type").value;
      const premiumOnly = document.getElementById("am-premium").checked;
      const errEl = document.getElementById("am-error");

      if (!title) { errEl.textContent = "⚠️ กรุณาใส่ชื่อหนัง"; errEl.style.display = "block"; return; }

      UI.showLoading();
      try {
        await API.Movies.create({
          id: Date.now().toString(),
          title, image, type,
          premiumOnly: premiumOnly.toString(),
          createdAt: new Date().toISOString(),
        });
        UI.hideLoading();
        Modal.close();
        UI.toast("เพิ่มหนังสำเร็จ! 🎬", "success");
        setTimeout(() => render(), 300);
      } catch {
        UI.hideLoading();
        errEl.textContent = "⚠️ เกิดข้อผิดพลาด กรุณาลองใหม่";
        errEl.style.display = "block";
      }
    };
  }

  // ── Add Episode Modal ──
  function openAddEpModal(movieId, movieTitle) {
    const eps = (Cache.get("episodes") || []).filter(e => e.movieId == movieId);
    const html = `
      <div class="modal-overlay" id="add-ep-modal">
        <div class="modal">
          <div class="modal-header">
            <div>
              <div style="font-size:0.72rem;color:var(--muted);margin-bottom:2px;">เพิ่มตอนใหม่</div>
              <div class="modal-title">📺 ${movieTitle}</div>
            </div>
            <button class="modal-close" id="ep-close">✕</button>
          </div>
          <div class="modal-body">
            <div class="ep-current-info">
              ปัจจุบัน <b style="color:var(--accent)">${eps.length}</b> ตอน
            </div>
            <div class="form-group">
              <label class="form-label">ชื่อตอน *</label>
              <input class="form-input" id="ep-title" placeholder="เช่น ตอนที่ 1 - จุดเริ่มต้น" />
            </div>
            <div class="form-group">
              <label class="form-label">ลิงก์วิดีโอ * <span style="font-weight:400;color:var(--muted)">(เช่น https://short.icu/...)</span></label>
              <input class="form-input" id="ep-url" placeholder="https://short.icu/tdPLHo4IX" />
            </div>
            <div class="form-group">
              <label class="form-label">รายละเอียดตอน (ไม่บังคับ)</label>
              <textarea class="form-input" id="ep-desc" rows="3" placeholder="เนื้อเรื่องย่อของตอนนี้..." style="resize:vertical;min-height:80px;"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label" style="display:flex;align-items:center;gap:0.5rem;">
                <input type="checkbox" id="ep-premium" style="width:16px;height:16px;accent-color:var(--accent);" />
                <span>👑 เฉพาะสมาชิก Premium เท่านั้น</span>
              </label>
            </div>
            <div id="ep-error" class="error-msg" style="display:none"></div>
            <div class="form-actions">
              <button class="btn-secondary" id="ep-cancel">ยกเลิก</button>
              <button class="btn-primary" id="ep-submit" style="flex:2">✅ เพิ่มตอนนี้</button>
            </div>
          </div>
        </div>
      </div>`;

    Modal.render(html);
    document.getElementById("ep-close").onclick = Modal.close;
    document.getElementById("ep-cancel").onclick = Modal.close;

    document.getElementById("ep-submit").onclick = async () => {
      const title = document.getElementById("ep-title").value.trim();
      const url = document.getElementById("ep-url").value.trim();
      const desc = document.getElementById("ep-desc").value.trim();
      const premiumOnly = document.getElementById("ep-premium").checked;
      const errEl = document.getElementById("ep-error");

      if (!title || !url) {
        errEl.textContent = "⚠️ กรุณากรอกชื่อตอนและลิงก์วิดีโอ";
        errEl.style.display = "block";
        return;
      }

      UI.showLoading();
      try {
        await API.Episodes.create({
          id: Date.now().toString(),
          movieId: movieId.toString(),
          title, url, desc,
          premiumOnly: premiumOnly.toString(),
          createdAt: new Date().toISOString(),
        });
        UI.hideLoading();
        Modal.close();
        UI.toast("เพิ่มตอนสำเร็จ! ✅", "success");
        setTimeout(() => render(), 300);
      } catch {
        UI.hideLoading();
        errEl.textContent = "⚠️ เกิดข้อผิดพลาด กรุณาลองใหม่";
        errEl.style.display = "block";
      }
    };
  }

  // ── Delete Movie ──
  function confirmDeleteMovie(movieId) {
    const html = `
      <div class="modal-overlay">
        <div class="modal" style="max-width:380px;">
          <div class="modal-header">
            <div class="modal-title" style="color:var(--accent)">⚠️ ยืนยันการลบ</div>
            <button class="modal-close" id="del-close">✕</button>
          </div>
          <div class="modal-body">
            <p style="color:var(--muted);margin-bottom:1.5rem;">คุณแน่ใจหรือไม่ว่าต้องการลบหนังนี้? การกระทำนี้ไม่สามารถยกเลิกได้</p>
            <div class="form-actions">
              <button class="btn-secondary" id="del-cancel">ยกเลิก</button>
              <button class="btn-primary" id="del-confirm" style="background:#dc2626;flex:1.5">🗑 ลบเลย</button>
            </div>
          </div>
        </div>
      </div>`;
    Modal.render(html);
    document.getElementById("del-close").onclick = Modal.close;
    document.getElementById("del-cancel").onclick = Modal.close;
    document.getElementById("del-confirm").onclick = async () => {
      UI.showLoading();
      try {
        await API.Movies.delete(movieId);
        // Also delete related episodes
        const eps = (Cache.get("episodes") || []).filter(e => e.movieId == movieId);
        await Promise.all(eps.map(e => API.Episodes.delete(e.id)));
        UI.hideLoading();
        Modal.close();
        UI.toast("ลบหนังแล้ว", "success");
        setTimeout(() => render(), 300);
      } catch {
        UI.hideLoading();
        UI.toast("เกิดข้อผิดพลาดในการลบ", "error");
      }
    };
  }

  return { render };
})();
        
