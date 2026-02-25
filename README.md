# 🎬 STREAMX — ระบบดูหนังและอนิเมะ

## 📁 โครงสร้างไฟล์

```
streamx/
├── index.html          # หน้าหลัก HTML
├── css/
│   └── style.css       # สไตล์ทั้งหมด
├── js/
│   ├── config.js       # ค่าคงที่ / API Keys
│   ├── api.js          # Google Sheets + TrueMoney API
│   ├── auth.js         # ระบบ Login / Register + Modal + UI
│   ├── premium.js      # ระบบ Premium / ชำระเงินซองอั่งเปา
│   ├── admin.js        # Admin Panel
│   └── app.js          # หน้าหลัก / หนัง / ค้นหา / โปรด
└── README.md
```

---

## 🚀 วิธีใช้งาน

### 1. ตั้งค่า Google Sheet

เปิด Google Sheet แล้วสร้าง Tabs ชื่อดังนี้:

| Tab Name  | คอลัมน์ที่ต้องมี |
|-----------|----------------|
| `users`   | username, password, createdAt, premiumExpiry, favorites |
| `movies`  | id, title, image, type, premiumOnly, createdAt |
| `episodes`| id, movieId, title, url, desc, premiumOnly, createdAt |
| `premium` | id, username, amount, activatedAt, expiresAt, status |

### 2. เชื่อมต่อ SheetBest

- ไปที่ [sheetbest.com](https://sheetbest.com)
- สร้าง Connection ใหม่ → ใส่ URL ของ Google Sheet
- Copy API URL มาใส่ใน `js/config.js` บรรทัด `SHEET_BASE`

### 3. เปิดไฟล์

เปิด `index.html` ในเบราว์เซอร์ หรืออัปโหลดขึ้น Web Hosting

---

## 🔑 ข้อมูล Admin

> ⚠️ **ไม่แสดงบนหน้าเว็บ** — ดูได้ที่ `js/config.js` เท่านั้น

---

## 👑 ระบบ Premium

**ราคา:** ฿25 / เดือน

**วิธีชำระเงิน:**
1. เปิดแอป TrueMoney Wallet
2. ส่งซองอั่งเปา ฿25 ไปที่เบอร์ที่กำหนดใน `config.js`
3. คัดลอกลิงก์ซองอั่งเปา วางในระบบ
4. กด "ยืนยัน" — ระบบตรวจสอบอัตโนมัติ

**สิทธิ์ Premium:**
- 🚀 ดูหนัง/อนิเมะก่อนคนอื่น
- 📢 รับข่าวสารก่อนใคร
- 🔓 เข้าถึงคอนเทนต์ Premium Only
- 🎬 คุณภาพสูงสุด
- 👑 Premium Badge

---

## ⚙️ Admin Panel

เข้าสู่ระบบด้วยบัญชี admin แล้วกด "Admin" ที่ Navbar

**เพิ่มหนัง/อนิเมะ:**
1. กด "+ เพิ่มหนัง/อนิเมะ"
2. เลือกประเภท → ใส่ชื่อ → ใส่ลิงก์รูปภาพ → เลือก Premium Only (ถ้าต้องการ) → กด "ยืนยัน"

**เพิ่มตอน:**
1. กดปุ่ม **+** ที่หนังที่ต้องการ
2. ใส่ชื่อตอน → ลิงก์วิดีโอ (`https://short.icu/...`) → รายละเอียด → กด "เพิ่มตอนนี้"

---

## 🌐 CORS Note

TrueMoney API ต้องการ CORS proxy สำหรับการเรียกจากเบราว์เซอร์
ระบบจะพยายามเชื่อมต่อโดยตรงก่อน หากล้มเหลวจะใช้ `corsproxy.io` อัตโนมัติ
