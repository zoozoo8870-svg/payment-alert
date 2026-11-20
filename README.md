# CUSTOMER PAYMENT – แจ้งเตือน DUE DATE

เว็บแจ้งเตือนก่อนครบกำหนดชำระเงิน 5 วัน โดยแสดง ORDER NO. ทุกครั้งที่แจ้ง

## ไฟล์ในโฟลเดอร์นี้
- `index.html` – หน้าเว็บ
- `data.xlsx` – ข้อมูล Order (ไฟล์ Excel)

## ตั้งค่าครั้งแรก (GitHub Pages)
1. สร้าง repository ใหม่ใน GitHub
2. กด **Add file → Upload files** แล้วอัปโหลด `index.html`, `data.xlsx` และ `README.md`
3. ไปที่ **Settings → Pages** ตรง Source เลือก **Deploy from a branch** เลือก Branch `main` และโฟลเดอร์ `/ (root)` แล้วกด **Save**
4. รอประมาณ 1–2 นาที จะได้ลิงก์เว็บหน้าตาแบบ `https://<ชื่อผู้ใช้>.github.io/<ชื่อ repository>/`

## อัปเดตข้อมูล
- แก้ไฟล์ Excel ตามปกติ บันทึกเป็นชื่อ **`data.xlsx`** แล้วอัปโหลดทับไฟล์เดิมใน GitHub
- ใช้รูปแบบตารางเดิม คือหัวคอลัมน์ ORDER NO., INVOICE NO., NET PAYMENT AMOUNT (US$), PAID AMOUNT, DUE DATE ฯลฯ
- ถ้า Order หลายรายการใช้ DUE DATE เดียวกัน ให้ผสานเซลล์ (merge) เหมือนที่ทำอยู่ได้เลย
- เมื่อใส่ PAID AMOUNT เท่ากับหรือมากกว่า NET PAYMENT แล้ว Order นั้นจะขึ้นสถานะ "ชำระแล้ว" และไม่แจ้งเตือนอีก

## หลักการแจ้งเตือน
- ⚠️ **ใกล้ครบกำหนด**: เหลือ 0–5 วันก่อน DUE DATE และยังชำระไม่ครบ
- ⛔ **เลยกำหนด**: เลย DUE DATE แล้วแต่ยังชำระไม่ครบ
- ถ้าต้องการเปลี่ยนจำนวนวัน ให้แก้ `ALERT_DAYS = 5` ในไฟล์ `index.html`

> ⚠️ ถ้า repository เป็นแบบ Public ใครที่มีลิงก์จะเห็นข้อมูลนี้ได้
