// ─── PREMIUM MODULE ───────────────────────────────────────────────────────────

const Premium = (() => {

  function openModal() {
    if (!Auth.isLoggedIn()) {
      Modal.openAuth("login");
      return;
    }
    const user = Auth.getUser();
    const isPrem = Auth.isPremium();
    const expDate = user.premiumExpiry ? new Date(user.premiumExpiry).toLocaleDateString("th-TH") : null;

    const html = `
      <div class="modal-overlay" id="premium-modal">
        <div class="modal modal-premium">
          <div class="modal-header premium-header">
            <div>
              <div style="font-size:0.75rem;color:#ffd60a;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">สมาชิกพิเศษ</div>
              <div class="modal-title">👑 STREAMX PREMIUM</div>
            </div>
            <button class="modal-close" id="prem-close">✕</button>
          </div>

          ${isPrem ? `
          <div class="modal-body">
            <div class="prem-active-banner">
              <div class="prem-active-icon">👑</div>
              <div>
                <div style="font-weight:700;font-size:1.1rem;color:#ffd60a;">คุณเป็นสมาชิก Premium แล้ว!</div>
                <div style="color:#8892a4;font-size:0.85rem;margin-top:4px;">หมดอายุ: ${expDate || "ไม่มีกำหนด"}</div>
              </div>
            </div>
            <div class="prem-benefits">
              ${benefitsHTML()}
            </div>
          </div>
          ` : `
          <div class="modal-body">
            <div class="prem-price-box">
              <div class="prem-price">฿${CONFIG.PREMIUM_PRICE}</div>
              <div class="prem-period">/ เดือน</div>
            </div>

            <div class="prem-benefits">
              ${benefitsHTML()}
            </div>

            <div class="prem-divider">
              <span>วิธีชำระเงิน</span>
            </div>

            <div class="prem-payment-steps">
              <div class="step">
                <div class="step-num">1</div>
                <div>เปิดแอป TrueMoney Wallet แล้วส่งซองอั่งเปา <strong>฿${CONFIG.PREMIUM_PRICE}</strong> มาที่เบอร์ <code class="phone-code">${CONFIG.TRUEMONEY_PHONE}</code></div>
              </div>
              <div class="step">
                <div class="step-num">2</div>
                <div>คัดลอกลิงก์ซองอั่งเปาที่ได้รับ แล้ววางด้านล่างนี้</div>
              </div>
              <div class="step">
                <div class="step-num">3</div>
                <div>กดยืนยัน ระบบจะตรวจสอบและเปิดใช้ Premium ทันที</div>
              </div>
            </div>

            <div class="form-group" style="margin-top:1.2rem;">
              <label class="form-label">ลิงก์ซองอั่งเปา TrueMoney</label>
              <input
                class="form-input"
                id="voucher-url"
                placeholder="https://gift.truemoney.com/campaign/?v=..."
              />
              <div style="font-size:0.75rem;color:#8892a4;margin-top:4px;">ตัวอย่าง: https://gift.truemoney.com/campaign/?v=yGIDVps...</div>
            </div>

            <div id="prem-error" class="error-msg" style="display:none"></div>
            <div id="prem-success" class="success-msg" style="display:none"></div>

            <button class="btn-primary btn-full prem-pay-btn" id="prem-submit">
              👑 ยืนยันการชำระเงิน
            </button>

            <div class="prem-note">
              ⚡ ระบบจะตรวจสอบซองอั่งเปาอัตโนมัติ หากพบว่ายอดเงินครบ ฿${CONFIG.PREMIUM_PRICE} จะเปิดใช้งาน Premium ทันที
            </div>
          </div>
          `}
        </div>
      </div>`;

    Modal.render(html);
    document.getElementById("prem-close").onclick = Modal.close;

    if (!isPrem) {
      document.getElementById("prem-submit").onclick = handlePayment;
    }
  }

  function benefitsHTML() {
    const perks = [
      { icon: "🚀", title: "ดูหนัง & อนิเมะก่อนใคร", desc: "รับสิทธิ์ดูตอนใหม่ก่อนสมาชิกทั่วไป 24 ชั่วโมง" },
      { icon: "📢", title: "ข่าวสารก่อนคนอื่น", desc: "รับการแจ้งเตือนและข่าวอัปเดตก่อนใคร" },
      { icon: "🔓", title: "ปลดล็อกคอนเทนต์พิเศษ", desc: "เข้าถึงหนังและอนิเมะที่คัดสรรสำหรับ Premium เท่านั้น" },
      { icon: "🎬", title: "คุณภาพสูงสุด", desc: "สตรีมด้วยความละเอียดสูงไม่มีสะดุด" },
      { icon: "👑", title: "ป้าย Premium Badge", desc: "แสดงสถานะพิเศษบนโปรไฟล์ของคุณ" },
    ];
    return `<div class="benefits-list">${perks.map(p => `
      <div class="benefit-item">
        <span class="benefit-icon">${p.icon}</span>
        <div>
          <div class="benefit-title">${p.title}</div>
          <div class="benefit-desc">${p.desc}</div>
        </div>
      </div>`).join("")}</div>`;
  }

  async function handlePayment() {
    const urlInput = document.getElementById("voucher-url");
    const errEl = document.getElementById("prem-error");
    const sucEl = document.getElementById("prem-success");
    const btn = document.getElementById("prem-submit");
    const url = urlInput?.value?.trim();

    errEl.style.display = "none";
    sucEl.style.display = "none";

    if (!url) {
      errEl.textContent = "⚠️ กรุณาวางลิงก์ซองอั่งเปา";
      errEl.style.display = "block";
      return;
    }
    if (!url.includes("truemoney.com") && !url.includes("gift.true")) {
      errEl.textContent = "⚠️ ลิงก์ไม่ถูกต้อง ต้องเป็นลิงก์จาก TrueMoney เท่านั้น";
      errEl.style.display = "block";
      return;
    }

    btn.disabled = true;
    btn.textContent = "⏳ กำลังตรวจสอบ...";

    try {
      const result = await TrueMoney.redeem(url);

      if (!result.success) {
        errEl.textContent = "❌ " + result.error;
        errEl.style.display = "block";
        btn.disabled = false;
        btn.textContent = `👑 ยืนยันการชำระเงิน`;
        return;
      }

      const amount = result.amount;
      if (amount < CONFIG.PREMIUM_PRICE) {
        errEl.textContent = `❌ ยอดเงินไม่ครบ ต้องการ ฿${CONFIG.PREMIUM_PRICE} แต่ได้รับ ฿${amount}`;
        errEl.style.display = "block";
        btn.disabled = false;
        btn.textContent = `👑 ยืนยันการชำระเงิน`;
        return;
      }

      // Activate premium
      await activatePremium(Auth.getUser().username, amount);

      sucEl.textContent = `✅ ยืนยันสำเร็จ! รับเงิน ฿${amount} — เปิดใช้งาน Premium แล้ว! 🎉`;
      sucEl.style.display = "block";
      btn.textContent = "✅ สำเร็จ!";
      btn.style.background = "#22c55e";

      setTimeout(() => {
        Modal.close();
        Auth.refreshPremiumStatus();
        UI.toast("🎉 ยินดีด้วย! คุณได้เป็นสมาชิก Premium แล้ว 👑", "success", 5000);
        App.showHome();
      }, 2000);

    } catch (e) {
      errEl.textContent = "❌ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
      errEl.style.display = "block";
      btn.disabled = false;
      btn.textContent = `👑 ยืนยันการชำระเงิน`;
    }
  }

  async function activatePremium(username, amount) {
    const now = new Date();
    const expiry = new Date(now.getTime() + CONFIG.PREMIUM_DAYS * 24 * 60 * 60 * 1000);
    const expiryStr = expiry.toISOString();

    // Update user in Google Sheets
    await API.Users.update(username, { premiumExpiry: expiryStr });

    // Log premium purchase
    await API.Premium.create({
      id: Date.now().toString(),
      username,
      amount,
      activatedAt: now.toISOString(),
      expiresAt: expiryStr,
      status: "active",
    });

    // Update session
    const user = Auth.getUser();
    user.premiumExpiry = expiryStr;
    Auth.saveSession(user);
    Auth.renderNav();
  }

  return { openModal, activatePremium };
})();
