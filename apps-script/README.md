# Payment Reminder (อีเมลเตือนชำระเงินอัตโนมัติ)

ส่งอีเมลภาษาอังกฤษเตือนการชำระเงิน **ล่วงหน้า 5 วันก่อน DUE DATE** โดยอ่านข้อมูลจาก Google Sheet `CUSTOMER PAYMENT 2026`
- ส่งถึงอีเมลของคุณก่อน (`zoozoo8870@gmail.com`) ตรวจแล้วกด Forward ให้ลูกค้า
- 1 อีเมลต่อ 1 DUE DATE (Order ที่ครบกำหนดวันเดียวกันรวมอยู่ในอีเมลเดียว)
- ไม่ส่งรายการที่ชำระครบแล้ว และไม่ส่งซ้ำ (บันทึกในคอลัมน์ `REMINDER SENT` ของ Sheet)
- เช็กทุกวันประมาณ 08:00 น. (เวลาไทย)

## ติดตั้ง (ครั้งเดียว)
1. เปิด Google Sheet → เมนู **ส่วนขยาย (Extensions) → Apps Script**
2. ลบโค้ดเดิมในหน้า `Code.gs` → วางโค้ดทั้งหมดจาก `PaymentReminder.gs` → กด 💾 บันทึก
3. ช่องเลือกฟังก์ชันด้านบน เลือก **setup** → กด **▶ Run (เรียกใช้)**
4. อนุญาตสิทธิ์: Review permissions → เลือกบัญชี → Advanced (ขั้นสูง) → Go to … (unsafe) → Allow

## ตั้งค่า
แก้ในส่วน `CONFIG` ด้านบนของโค้ด เช่น `COMPANY_NAME`, `DAYS_BEFORE`, `CUSTOMER_EMAIL`
