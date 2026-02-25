// ─── MAIN APP MODULE ──────────────────────────────────────────────────────────

const App = (() => {
  let allMovies = [];
  let allEpisodes = [];
  let favorites = [];
  let searchTimeout = null;
  let currentView = "home";
  let currentTypeFilter = "all";

  // ── Init ──
  async function init() {
    Auth.renderNav();
    setupSearch();
    document.getElementById("nav-logo").onclick = () => showHome();

    // Reload favorites from session
    loadFavoritesFromSession();

    await showHome();
  }

  function loadFavoritesFromSession() {
    try {
      const user = Auth.getUser();
      if (!user) { favorites = []; return; }
      const raw = sessionStorage.getItem("fav_" + user.username);
      favorites = raw ? JSON.parse(raw) : [];
    } catch { favorites = []; }
  }

  function saveFavoritesToSession() {
    try {
      const user = Auth.getUser();
      if (!user) return;
      sessionStorage.setItem("fav_" + user.username, JSON.stringify(favorites));
    } catch {}
  }

  function setupSearch() {
    const input = document.getElementById("search-input");
    if (!input) return;
    input.addEventListener("input", () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        const q = input.value.trim();
        if (q.length >= 1) showSearch(q);
        else if (currentView === "search") showHome();
      }, 300);
    });
  }

  // ── Fetch Data ──
  async function fetchData() {
    UI.showLoading();
    try {
      [allMovies, allEpisodes] = await Promise.all([
        API.Movies.getAll(),
        API.Episodes.getAll(),
      ]);
      allMovies = allMovies.map(m => ({
        ...m,
        _episodes: allEpisodes.filter(e => e.movieId == m.id),
      }));
      Cache.set("movies", allMovies);
      Cache.set("episodes", allEpisodes);
    } catch (e) {
      UI.toast("ไม่สามารถโหลดข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ", "error");
    }
    UI.hideLoading();
  }

  // ── VIEWS ──

  async function showHome() {
    currentView = "home";
    document.getElementById("app-footer").style.display = "";
    const searchInput = document.getElementById("search-input");
    if (searchInput) searchInput.value = "";
    document.getElementById("nav-search-wrap").style.display = "";

    await fetchData();

    const animes = allMovies.filter(m => m.type === "anime");
    const films  = allMovies.filter(m => m.type === "movie");
    const featured = allMovies.slice(-4).reverse();
    const isPrem = Auth.isPremium();

    document.getElementById("app").innerHTML = `
      <!-- HERO -->
      <section class="hero">
        <div class="hero-bg"></div>
        <div class="hero-grid"></div>
        <div class="hero-orb hero-orb-1"></div>
        <div class="hero-orb hero-orb-2"></div>
        <div class="hero-content">
          <div class="hero-badge">🔥 แพลตฟอร์มสตรีมมิ่งชั้นนำ</div>
          <h1 class="hero-title">ดูหนัง &<br/><span class="hl">อนิเมะ</span><br/>ได้ทุกที่</h1>
          <p class="hero-desc">รวมหนังและอนิเมะคุณภาพสูง พร้อมระบบ Premium สำหรับผู้ที่ต้องการสิทธิพิเศษ</p>
          <div class="hero-actions">
            <button class="btn-primary" id="hero-browse">▶ ดูทั้งหมด</button>
            ${!isPrem ? `<button class="btn-premium-hero" id="hero-prem">👑 รับ Premium ฿25/เดือน</button>` : `<span class="prem-hero-badge">👑 PREMIUM MEMBER</span>`}
          </div>
        </div>
        ${featured.length > 0 ? `
        <div class="hero-featured">
          ${featured.slice(0,4).map(m => `
            <div class="hero-card-mini" data-id="${m.id}">
              ${m.image ? `<img src="${m.image}" alt="${m.title}" onerror="this.style.display='none'" />` : `<div class="hero-card-placeholder">🎬</div>`}
              <div class="hero-card-mini-overlay">
                <div class="hero-card-mini-title">${m.title}</div>
              </div>
              ${m.premiumOnly === "true" && !isPrem ? `<div class="lock-overlay">🔒</div>` : ""}
            </div>`).join("")}
        </div>` : ""}
      </section>

      <!-- PREMIUM BANNER (non-premium users) -->
      ${!isPrem && Auth.isLoggedIn() ? `
      <div class="prem-banner" id="prem-banner">
        <div class="prem-banner-text">
          <span class="prem-banner-icon">👑</span>
          <div>
            <div style="font-weight:700;">อัปเกรดเป็น Premium</div>
            <div style="font-size:0.82rem;opacity:0.8;">ดูหนังก่อนใคร · ข่าวก่อนใคร · ฿${CONFIG.PREMIUM_PRICE}/เดือน</div>
          </div>
        </div>
        <button class="btn-primary" id="prem-banner-btn" style="padding:0.5rem 1.2rem;font-size:0.85rem;">รับเลย</button>
      </div>` : ""}

      <!-- CONTENT SECTIONS -->
      <div class="content-sections">
        ${allMovies.length === 0 ? `
        <div class="section">
          <div class="empty-state">
            <div class="empty-icon">🎬</div>
            <div style="color:var(--text);font-size:1.1rem;margin-bottom:0.5rem;">ยังไม่มีหนังในระบบ</div>
            <div class="empty-text">Admin สามารถเพิ่มหนังได้จาก Admin Panel</div>
          </div>
        </div>` : ""}
        ${films.length > 0 ? movieSectionHTML("🎬 หนัง", films) : ""}
        ${animes.length > 0 ? movieSectionHTML("🎌 อนิเมะ", animes) : ""}
      </div>`;

    // Events
    document.getElementById("hero-browse")?.addEventListener("click", () => showBrowse());
    document.getElementById("hero-prem")?.addEventListener("click", () => Premium.openModal());
    document.getElementById("prem-banner-btn")?.addEventListener("click", () => Premium.openModal());
    document.querySelectorAll(".hero-card-mini").forEach(el => {
      el.addEventListener("click", () => {
        const m = allMovies.find(x => x.id == el.dataset.id);
        if (m) openDetail(m);
      });
    });
    bindMovieCards();
  }

  function movieSectionHTML(title, movies) {
    return `
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">${title}</h2>
        </div>
        <div class="movie-grid">
          ${movies.map(m => movieCardHTML(m)).join("")}
        </div>
      </section>`;
  }

  function movieCardHTML(m) {
    const isPrem = Auth.isPremium();
    const locked = m.premiumOnly === "true" && !isPrem;
    const isFav = favorites.some(f => f.id == m.id);
    return `
      <div class="movie-card" data-id="${m.id}">
        <div class="movie-card-poster">
          ${m.image ? `<img src="${m.image}" alt="${m.title}" onerror="this.style.display='none'" />` : `<div class="poster-placeholder">🎬</div>`}
          <div class="movie-card-badge">${m.type === "anime" ? "ANIME" : "MOVIE"}</div>
          ${m.premiumOnly === "true" ? `<div class="prem-card-badge">👑</div>` : ""}
          ${Auth.isLoggedIn() ? `<button class="fav-btn ${isFav ? "active" : ""}" data-id="${m.id}">${isFav ? "❤️" : "🤍"}</button>` : ""}
          <div class="play-overlay">
            ${locked ? `<div class="lock-msg">🔒 Premium เท่านั้น</div>` : `<div class="play-icon">▶</div>`}
          </div>
        </div>
        <div class="movie-card-info">
          <div class="movie-card-title">${m.title}</div>
          <div class="movie-card-meta">
            <span class="ep-count">${m._episodes?.length || 0} ตอน</span>
          </div>
        </div>
      </div>`;
  }

  function bindMovieCards() {
    document.querySelectorAll(".movie-card").forEach(el => {
      el.addEventListener("click", e => {
        if (e.target.classList.contains("fav-btn") || e.target.closest(".fav-btn")) return;
        const m = allMovies.find(x => x.id == el.dataset.id);
        if (m) openDetail(m);
      });
    });
    document.querySelectorAll(".fav-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        if (!Auth.isLoggedIn()) { Modal.openAuth("login"); return; }
        const id = btn.dataset.id;
        const m = allMovies.find(x => x.id == id);
        if (!m) return;
        const idx = favorites.findIndex(f => f.id == id);
        if (idx >= 0) {
          favorites.splice(idx, 1);
          btn.textContent = "🤍"; btn.classList.remove("active");
          UI.toast("ลบออกจากรายการโปรด", "info");
        } else {
          favorites.push({ id: m.id, title: m.title, image: m.image, type: m.type });
          btn.textContent = "❤️"; btn.classList.add("active");
          UI.toast("เพิ่มในรายการโปรด ❤️", "success");
        }
        saveFavoritesToSession();
      });
    });
  }

  // ── BROWSE ──
  function showBrowse(typeFilter = "all") {
    currentView = "browse";
    currentTypeFilter = typeFilter;
    renderContent();
  }

  function renderContent(q = "") {
    let filtered = allMovies.filter(m => {
      const matchQ = !q || m.title.toLowerCase().includes(q.toLowerCase());
      const matchT = currentTypeFilter === "all" || m.type === currentTypeFilter;
      return matchQ && matchT;
    });

    const header = q ? `ผลการค้นหา "${q}"` : "เนื้อหาทั้งหมด";

    document.getElementById("app").innerHTML = `
      <div class="search-results">
        <h1 class="browse-title">${header} <span style="color:var(--muted);font-size:1rem;font-family:'Outfit',sans-serif">${filtered.length} รายการ</span></h1>
        <div class="type-filters">
          ${["all","movie","anime"].map(t => `
            <button class="type-chip ${currentTypeFilter === t ? "active" : ""}" data-type="${t}">
              ${t === "all" ? "ทั้งหมด" : t === "movie" ? "🎬 หนัง" : "🎌 อนิเมะ"}
            </button>`).join("")}
        </div>
        ${filtered.length === 0
          ? `<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-text">ไม่พบรายการที่ค้นหา</div></div>`
          : `<div class="movie-grid">${filtered.map(m => movieCardHTML(m)).join("")}</div>`}
      </div>`;

    document.querySelectorAll(".type-chip").forEach(c => {
      c.addEventListener("click", () => {
        currentTypeFilter = c.dataset.type;
        const q = document.getElementById("search-input").value.trim();
        renderContent(q);
      });
    });
    bindMovieCards();
  }

  // ── SEARCH ──
  function showSearch(q) {
    currentView = "search";
    renderContent(q);
  }

  // ── FAVORITES ──
  function showFavorites() {
    currentView = "favorites";
    const fMovies = favorites.map(f => {
      const full = allMovies.find(m => m.id == f.id);
      return full || { ...f, _episodes: [] };
    });

    document.getElementById("app").innerHTML = `
      <div class="search-results">
        <h1 class="browse-title">รายการโปรด ❤️</h1>
        ${fMovies.length === 0
          ? `<div class="empty-state"><div class="empty-icon">❤️</div><div class="empty-text">ยังไม่มีรายการโปรด<br/>กดหัวใจที่หนังเพื่อเพิ่ม</div></div>`
          : `<div class="movie-grid">${fMovies.map(m => movieCardHTML(m)).join("")}</div>`}
      </div>`;
    bindMovieCards();
  }

  // ── DETAIL MODAL ──
  function openDetail(movie) {
    const isPrem = Auth.isPremium();
    const locked = movie.premiumOnly === "true" && !isPrem;
    const isFav = favorites.some(f => f.id == movie.id);
    const eps = movie._episodes || [];

    const html = `
      <div class="modal-overlay">
        <div class="modal modal-lg">
          <div class="modal-header">
            <div class="modal-title">${movie.title}</div>
            <button class="modal-close" id="detail-close">✕</button>
          </div>
          <div class="modal-body">
            <div class="detail-layout">
              <div class="detail-poster-wrap">
                ${movie.image
                  ? `<img src="${movie.image}" class="detail-poster" onerror="this.style.display='none'" />`
                  : `<div class="detail-poster-ph">🎬</div>`}
              </div>
              <div class="detail-info">
                <div class="detail-type">${movie.type === "anime" ? "🎌 ANIME" : "🎬 MOVIE"}${movie.premiumOnly === "true" ? " · 👑 PREMIUM" : ""}</div>
                <h2 class="detail-title">${movie.title}</h2>
                <p style="color:var(--muted);font-size:0.88rem;margin-bottom:1rem;">${eps.length} ตอน</p>
                <div style="display:flex;gap:0.8rem;flex-wrap:wrap;">
                  ${locked ? `
                    <button class="btn-primary" id="detail-unlock">👑 รับ Premium เพื่อดู</button>
                  ` : eps.length > 0 ? `
                    <button class="btn-primary" id="detail-play-first">▶ เล่นตอนแรก</button>
                  ` : `
                    <button class="btn-primary" disabled style="opacity:0.5;cursor:not-allowed;">ยังไม่มีตอน</button>
                  `}
                  ${Auth.isLoggedIn() ? `
                  <button class="fav-detail-btn ${isFav ? "fav-active" : ""}" id="detail-fav">
                    ${isFav ? "❤️ ในรายการโปรด" : "🤍 เพิ่มรายการโปรด"}
                  </button>` : ""}
                </div>

                ${locked ? `
                  <div class="locked-notice">
                    <span>🔒</span>
                    <span>คอนเทนต์นี้สำหรับสมาชิก Premium เท่านั้น อัปเกรดในราคา ฿${CONFIG.PREMIUM_PRICE}/เดือน</span>
                  </div>
                ` : `
                  <div class="episodes-list" id="eps-list">
                    ${eps.length === 0 ? `<p style="color:var(--muted);font-size:0.85rem;text-align:center;padding:1rem;">ยังไม่มีตอน</p>` :
                      eps.map((ep, i) => `
                        <div class="episode-item" data-url="${ep.url}" data-title="${ep.title}" data-desc="${ep.desc || ""}" data-prem="${ep.premiumOnly}">
                          <div>
                            <div class="ep-name">ตอนที่ ${i+1}: ${ep.title} ${ep.premiumOnly === "true" ? "👑" : ""}</div>
                            ${ep.desc ? `<div class="ep-desc">${ep.desc}</div>` : ""}
                          </div>
                          <span class="play-ep-btn">${ep.premiumOnly === "true" && !isPrem ? "🔒" : "▶"}</span>
                        </div>`).join("")}
                  </div>`}
              </div>
            </div>
          </div>
        </div>
      </div>`;

    Modal.render(html);
    document.getElementById("detail-close").onclick = Modal.close;
    document.getElementById("detail-unlock")?.addEventListener("click", () => { Modal.close(); Premium.openModal(); });
    document.getElementById("detail-play-first")?.addEventListener("click", () => {
      if (eps.length) openPlayer(eps[0]);
    });
    document.getElementById("detail-fav")?.addEventListener("click", () => {
      const idx = favorites.findIndex(f => f.id == movie.id);
      const btn = document.getElementById("detail-fav");
      if (idx >= 0) {
        favorites.splice(idx, 1);
        btn.className = "fav-detail-btn";
        btn.textContent = "🤍 เพิ่มรายการโปรด";
        UI.toast("ลบออกจากรายการโปรด", "info");
      } else {
        favorites.push({ id: movie.id, title: movie.title, image: movie.image, type: movie.type });
        btn.className = "fav-detail-btn fav-active";
        btn.textContent = "❤️ ในรายการโปรด";
        UI.toast("เพิ่มในรายการโปรด ❤️", "success");
      }
      saveFavoritesToSession();
    });

    document.querySelectorAll(".episode-item").forEach(el => {
      el.addEventListener("click", () => {
        const isPremOnly = el.dataset.prem === "true";
        if (isPremOnly && !Auth.isPremium()) {
          Modal.close();
          setTimeout(() => Premium.openModal(), 50);
          return;
        }
        openPlayer({ title: el.dataset.title, url: el.dataset.url, desc: el.dataset.desc });
      });
    });
  }

  // ── PLAYER MODAL ──
  function openPlayer(ep) {
    const html = `
      <div class="modal-overlay">
        <div class="modal player-modal">
          <div class="modal-header">
            <div class="modal-title">▶ ${ep.title}</div>
            <button class="modal-close" id="player-close">✕</button>
          </div>
          <div class="modal-body" style="padding:0 1.5rem 1.5rem;">
            <div class="player-container">
              <iframe
                class="player-frame"
                src="${ep.url}"
                allowfullscreen
                allow="autoplay; fullscreen; picture-in-picture"
                title="${ep.title}"
                frameborder="0"
              ></iframe>
            </div>
            ${ep.desc ? `<p class="player-desc">${ep.desc}</p>` : ""}
          </div>
        </div>
      </div>`;
    Modal.render(html);
    document.getElementById("player-close").onclick = Modal.close;
  }

  return { init, showHome, showBrowse, showSearch, showFavorites };
})();

// ─── BOOT ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => App.init());
