/**
 * Payment Reminder – ส่งอีเมลทวงถามการชำระเงิน (ภาษาอังกฤษ) ล่วงหน้า 5 วันก่อน DUE DATE
 * อ่านข้อมูลจาก Google Sheet "CUSTOMER PAYMENT 2026" (ชีต DATA 1)
 *
 * วิธีใช้ครั้งแรก:  เลือกฟังก์ชัน setup  แล้วกด ▶ Run  (อนุญาตสิทธิ์ 1 ครั้ง)
 * ฟังก์ชันอื่น:  sendPreview = ส่งอีเมลตัวอย่างทันที (ไม่บันทึก) · dailyCheck = เช็กและส่งตอนนี้
 * หลังจากนั้นระบบจะเช็กทุกเช้าประมาณ 08:00 น. (เวลาไทย) และส่งอีเมลให้เอง
 */

// ===================== ตั้งค่า (แก้ได้) =====================
const CONFIG = {
  SPREADSHEET_ID: '1G9BIyhjG1xcFk_4iygkOczORBam8HeQ9VXQ8T3YJpTY', // Google Sheet CUSTOMER PAYMENT 2026
  SHEET_NAME: 'DATA 1',
  DAYS_BEFORE: 5,                       // ส่งล่วงหน้ากี่วัน
  SEND_TO: 'zoozoo8870@gmail.com',      // ส่งถึงอีเมลของคุณก่อน (ตรวจแล้วค่อย Forward ให้ลูกค้า)
  CUSTOMER_EMAIL: '',                   // ใส่อีเมลลูกค้าในอนาคต ถ้าต้องการส่งตรงถึงลูกค้า
  SEND_DIRECT_TO_CUSTOMER: false,       // true = ส่งถึงลูกค้าโดยตรง และ CC ถึงคุณ
  CUSTOMER_GREETING: 'Dear Valued Customer,',
  SENDER_NAME: 'Suchada Eiamsomang',
  SENDER_TITLE: 'Export Documentation Specialist',
  COMPANY_NAME: '',                     // ใส่ชื่อบริษัท เพื่อแสดงท้ายอีเมล
  RUN_HOUR: 8,                          // เวลาที่เช็กทุกวัน (ชั่วโมง, เวลาไทย)
  TIME_ZONE: 'Asia/Bangkok',
  LOGO_URL: 'https://zoozoo8870-svg.github.io/payment-alert/logo-192.png',
  WEB_URL: 'https://zoozoo8870-svg.github.io/payment-alert/',
  SENT_COLUMN: 'REMINDER SENT',         // คอลัมน์บันทึกว่าส่งอีเมลแล้ว (สร้างให้อัตโนมัติ)
};
// ==========================================================

/** ตั้งค่าครั้งแรก: สร้างตัวตั้งเวลาทุกวัน + ส่งอีเมลตัวอย่างให้ดู */
function setup() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'dailyCheck')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('dailyCheck')
    .timeBased().everyDays(1).atHour(CONFIG.RUN_HOUR).inTimezone(CONFIG.TIME_ZONE)
    .create();
  // ส่งอีเมลสำหรับรายการที่ถึงรอบแล้วทันที ถ้ายังไม่มี ส่งอีเมลตัวอย่างให้ดูหน้าตา 1 ชุด
  const sent = dailyCheck();
  const preview = sent ? 0 : sendPreview();
  Logger.log('ตั้งเวลาเรียบร้อย: เช็กทุกวันเวลาประมาณ %s:00 น. · ส่งอีเมลเตือน %s ฉบับ · อีเมลตัวอย่าง %s ฉบับ', CONFIG.RUN_HOUR, sent, preview);
}

/** ทำงานทุกวัน: ส่งอีเมลสำหรับ Order ที่เหลือ ≤ 5 วัน, ยังชำระไม่ครบ และยังไม่เคยส่ง */
function dailyCheck() {
  const ctx = readOrders_();
  const due = ctx.orders.filter(o => !o.paidFull && o.days !== null &&
                                     o.days >= 0 && o.days <= CONFIG.DAYS_BEFORE && !o.sent);
  const groups = groupByDue_(due);
  groups.forEach(g => {
    sendReminder_(g, false);
    const stamp = 'Sent ' + Utilities.formatDate(new Date(), CONFIG.TIME_ZONE, 'yyyy-MM-dd HH:mm');
    g.orders.forEach(o => ctx.sheet.getRange(o.row, ctx.sentCol).setValue(stamp));
  });
  Logger.log('ส่งอีเมลเตือน %s ฉบับ (%s Order)', groups.length, due.length);
  return groups.length;
}

/** ส่งอีเมลตัวอย่างทันที (ไม่บันทึกว่าส่งแล้ว) – ใช้ทดสอบหน้าตาอีเมล */
function sendPreview() {
  const ctx = readOrders_();
  let list = ctx.orders.filter(o => !o.paidFull && o.days !== null && o.days >= 0 && o.days <= CONFIG.DAYS_BEFORE);
  if (!list.length) {   // ไม่มีรายการใกล้ครบกำหนด → ใช้รายการถัดไปที่ยังไม่ชำระ เป็นตัวอย่าง
    const next = ctx.orders.filter(o => !o.paidFull && o.days !== null && o.days >= 0).sort((a, b) => a.days - b.days)[0];
    list = next ? ctx.orders.filter(o => !o.paidFull && o.dueKey === next.dueKey) : [];
  }
  const groups = groupByDue_(list);
  groups.forEach(g => sendReminder_(g, true));
  return groups.length;
}

// ---------------------------------------------------------------------------

function readOrders_() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.getSheets()[0];
  const values = sheet.getDataRange().getValues();
  const display = sheet.getDataRange().getDisplayValues();

  const hr = values.findIndex(r => r.some(c => clean_(c).toUpperCase().startsWith('ORDER')));
  if (hr < 0) throw new Error('ไม่พบหัวคอลัมน์ ORDER NO.');
  const heads = values[hr].map(h => clean_(h).toUpperCase());
  const find = test => heads.findIndex(h => h && test(h));
  const idx = {
    order:   find(h => h.includes('ORDER')),
    bl:      find(h => h.includes('B/L') || h.includes('BL NO') || h.includes('BILL OF LADING')),
    booking: find(h => h.includes('BOOKING')),
    invoice: find(h => h.includes('INVOICE')),
    net:     find(h => h.includes('NET PAYMENT')),
    amount:  find(h => h.startsWith('PAYMENT AMOUNT')),
    paid:    find(h => h.startsWith('PAID AMOUNT')),
    eta:     find(h => h.startsWith('ETA')),
    due:     find(h => h.includes('DUE DATE')),
    sent:    find(h => h === CONFIG.SENT_COLUMN),
  };
  if (idx.due < 0) throw new Error('ไม่พบคอลัมน์ DUE DATE');

  // สร้างคอลัมน์ REMINDER SENT ถ้ายังไม่มี
  if (idx.sent < 0) {
    let col = heads.length;
    while (col > 0 && !heads[col - 1]) col--;
    idx.sent = col;
    sheet.getRange(hr + 1, col + 1).setValue(CONFIG.SENT_COLUMN).setFontWeight('bold');
  }

  const ssTz = ss.getSpreadsheetTimeZone();
  const today = Utilities.formatDate(new Date(), CONFIG.TIME_ZONE, 'yyyy-MM-dd');
  const orders = [];
  for (let r = hr + 1; r < values.length; r++) {
    const row = values[r];
    const order = clean_(row[idx.order]);
    if (!order || /TOTAL/i.test(order) || /TOTAL/i.test(clean_(row[idx.invoice]))) continue;
    const net = num_(idx.net >= 0 ? row[idx.net] : null) ?? num_(idx.amount >= 0 ? row[idx.amount] : null);
    const paid = num_(idx.paid >= 0 ? row[idx.paid] : null);
    let dueKey = dateKey_(row[idx.due], display[r][idx.due], ssTz);
    if (!dueKey && idx.eta >= 0) {                     // DUE DATE ว่าง → ETA + 30 วัน
      const etaKey = dateKey_(row[idx.eta], display[r][idx.eta], ssTz);
      if (etaKey) dueKey = Utilities.formatDate(new Date(keyToUtc_(etaKey) + 30 * 864e5), 'UTC', 'yyyy-MM-dd');
    }
    orders.push({
      row: r + 1,
      order,
      invoice: clean_(row[idx.invoice]),
      bl: (idx.bl >= 0 ? clean_(row[idx.bl]) : '') || (idx.booking >= 0 ? clean_(row[idx.booking]) : ''),
      net, paid,
      balance: Math.max((net || 0) - Math.max(paid || 0, 0), 0),
      paidFull: paid != null && net != null && paid >= net - 0.005,
      dueKey,
      days: dueKey ? Math.round((keyToUtc_(dueKey) - keyToUtc_(today)) / 864e5) : null,
      sent: clean_(row[idx.sent]) !== '',
    });
  }
  return { sheet, orders, sentCol: idx.sent + 1 };
}

function groupByDue_(list) {
  const map = {};
  list.forEach(o => (map[o.dueKey] = map[o.dueKey] || { dueKey: o.dueKey, days: o.days, orders: [] }).orders.push(o));
  return Object.keys(map).sort().map(k => map[k]);
}

function sendReminder_(g, isPreview) {
  const dueText = Utilities.formatDate(new Date(keyToUtc_(g.dueKey)), 'UTC', 'd MMMM yyyy');
  const total = g.orders.reduce((s, o) => s + o.balance, 0);
  const invList = g.orders.map(o => o.invoice).join(', ');
  const subject = 'Payment Reminder – Invoice No. ' + invList + ' | Due ' + dueText;
  const toCustomer = CONFIG.SEND_DIRECT_TO_CUSTOMER && CONFIG.CUSTOMER_EMAIL && !isPreview;

  const html = buildHtml_(g, dueText, total, !toCustomer, isPreview);
  const text = buildText_(g, dueText, total);
  const opts = { htmlBody: html, name: CONFIG.SENDER_NAME };
  if (toCustomer) {
    opts.cc = CONFIG.SEND_TO;
    MailApp.sendEmail(CONFIG.CUSTOMER_EMAIL, subject, text, opts);
  } else {
    MailApp.sendEmail(CONFIG.SEND_TO, (isPreview ? '[ตัวอย่าง] ' : '[ตรวจก่อนส่งลูกค้า] ') + subject, text, opts);
  }
}

function daysText_(d) {
  if (d === 0) return 'today';
  if (d === 1) return 'tomorrow';
  return 'in ' + d + ' days';
}

function buildText_(g, dueText, total) {
  const lines = g.orders.map(o =>
    '- Order No. ' + o.order + ' | Invoice No. ' + o.invoice + ' | B/L No. ' + o.bl + ' | US$ ' + money_(o.balance));
  return [
    CONFIG.CUSTOMER_GREETING, '',
    'We hope this message finds you well.', '',
    'This is a friendly reminder that the following payment' + (g.orders.length > 1 ? 's' : '') +
      ' will be due on ' + dueText + ' (' + daysText_(g.days) + '):', '',
    lines.join('\n'), '',
    'Total amount due: US$ ' + money_(total), '',
    'We would appreciate it if you could arrange the payment on or before the due date, as per the bank details stated on the commercial invoice. Kindly send us the remittance advice (bank slip) once the transfer has been made.', '',
    'If the payment has already been made, please disregard this reminder and accept our sincere thanks.', '',
    'Should you have any questions, please feel free to contact us.', '',
    'Best regards,', CONFIG.SENDER_NAME, CONFIG.SENDER_TITLE, CONFIG.COMPANY_NAME,
  ].join('\n');
}

function buildHtml_(g, dueText, total, showNote, isPreview) {
  const C = { ink: '#1e3550', muted: '#6f8299', sky50: '#f4f9ff', sky100: '#e6f2fd', sky200: '#cfe6fa', sky700: '#2a659f', sky800: '#1f4a75', line: '#dde9f5' };
  const td = 'padding:10px 12px;border-bottom:1px solid ' + C.line + ';font-size:14px;color:' + C.ink + ';';
  const th = 'padding:10px 12px;background:' + C.sky100 + ';color:' + C.sky800 + ';font-size:12px;font-weight:bold;text-align:left;letter-spacing:.03em;';
  const rows = g.orders.map(o =>
    '<tr><td style="' + td + 'font-weight:bold;white-space:nowrap;">' + esc_(o.order) + '</td><td style="' + td + '">' + esc_(o.invoice) +
    '</td><td style="' + td + '">' + esc_(o.bl) + '</td><td style="' + td + 'text-align:right;white-space:nowrap;">' + money_(o.balance) +
    '</td><td style="' + td + 'white-space:nowrap;">' + esc_(dueText) + '</td></tr>').join('');
  const note = !showNote ? '' :
    '<tr><td style="padding:0 0 14px;"><div style="background:#fff8e1;border:1px solid #f3dd9b;border-radius:12px;padding:12px 16px;font-family:Tahoma,sans-serif;font-size:13px;color:#7a5b00;line-height:1.6;">' +
    (isPreview ? '<b>อีเมลตัวอย่าง</b> · ' : '<b>ตรวจก่อนส่งลูกค้า</b> · ') +
    'ตรวจข้อความด้านล่าง แล้วกด <b>Forward</b> ไปที่อีเมลลูกค้า (ลบกล่องสีเหลืองนี้และคำว่า [ตรวจก่อนส่งลูกค้า] ในหัวเรื่องก่อนส่ง)' +
    ' · <a href="' + CONFIG.WEB_URL + '" style="color:#7a5b00;">เปิดเว็บแจ้งเตือน</a></div></td></tr>';
  const sig = [CONFIG.SENDER_NAME, CONFIG.SENDER_TITLE, CONFIG.COMPANY_NAME].filter(Boolean)
    .map((s, i) => i === 0 ? '<b style="color:' + C.sky800 + ';">' + esc_(s) + '</b>' : esc_(s)).join('<br>');

  return '' +
  '<div style="background:#f3f8fd;padding:24px 12px;">' +
  '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;">' +
  note +
  '<tr><td style="background:linear-gradient(120deg,#dceefd,#c4e1f8);background-color:#d5eafc;border-radius:16px 16px 0 0;padding:20px 24px;">' +
    '<table role="presentation" cellpadding="0" cellspacing="0"><tr>' +
    '<td style="padding-right:14px;"><img src="' + CONFIG.LOGO_URL + '" width="48" height="48" alt="TCC" style="display:block;border-radius:12px;"></td>' +
    '<td><div style="font-size:20px;font-weight:bold;color:' + C.sky800 + ';">Payment Reminder</div>' +
    '<div style="font-size:13px;color:' + C.sky700 + ';margin-top:2px;">Due ' + esc_(dueText) + ' · ' + daysText_(g.days) + '</div></td>' +
    '</tr></table></td></tr>' +
  '<tr><td style="background:#ffffff;border:1px solid ' + C.line + ';border-top:0;border-radius:0 0 16px 16px;padding:24px;color:' + C.ink + ';font-size:15px;line-height:1.6;">' +
    '<p style="margin:0 0 14px;">' + esc_(CONFIG.CUSTOMER_GREETING) + '</p>' +
    '<p style="margin:0 0 14px;">We hope this message finds you well.</p>' +
    '<p style="margin:0 0 18px;">This is a friendly reminder that the following payment' + (g.orders.length > 1 ? 's' : '') +
      ' will be due on <b>' + esc_(dueText) + '</b> (' + daysText_(g.days) + '):</p>' +
    '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid ' + C.line + ';border-radius:12px;border-collapse:separate;overflow:hidden;">' +
      '<tr><th style="' + th + '">ORDER NO.</th><th style="' + th + '">INVOICE NO.</th><th style="' + th + '">B/L NO.</th><th style="' + th + 'text-align:right;">AMOUNT (US$)</th><th style="' + th + '">DUE DATE</th></tr>' +
      rows +
    '</table>' +
    '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0 20px;"><tr>' +
      '<td style="background:' + C.sky50 + ';border:1px solid ' + C.sky200 + ';border-radius:12px;padding:14px 18px;">' +
      '<span style="font-size:13px;color:' + C.muted + ';">Total amount due</span><br>' +
      '<span style="font-size:24px;font-weight:bold;color:' + C.sky700 + ';">US$ ' + money_(total) + '</span></td></tr></table>' +
    '<p style="margin:0 0 14px;">We would appreciate it if you could arrange the payment on or before the due date, as per the bank details stated on the commercial invoice. Kindly send us the remittance advice (bank slip) once the transfer has been made.</p>' +
    '<p style="margin:0 0 14px;">If the payment has already been made, please disregard this reminder and accept our sincere thanks.</p>' +
    '<p style="margin:0 0 20px;">Should you have any questions, please feel free to contact us.</p>' +
    '<p style="margin:0;">Best regards,<br>' + sig + '</p>' +
  '</td></tr>' +
  '</table></div>';
}

// ---------- helpers ----------
function clean_(v) { return (v == null ? '' : String(v)).replace(/[‪-‮​-‏]/g, '').replace(/\s+/g, ' ').trim(); }
function esc_(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function money_(n) { return Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function num_(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v;
  let s = clean_(v); const neg = /^\(.*\)$/.test(s) || s.includes('-');
  s = s.replace(/[^0-9.]/g, ''); if (!s) return null;
  const n = parseFloat(s); return isNaN(n) ? null : (neg ? -n : n);
}
// คืนค่าวันที่เป็นข้อความ 'yyyy-MM-dd' (ใช้เขตเวลาของ Sheet เพื่อไม่ให้วันที่เลื่อน)
function dateKey_(v, shown, tz) {
  const pad = n => String(n).padStart(2, '0');
  const s = clean_(shown); let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return m[1] + '-' + pad(m[2]) + '-' + pad(m[3]);
  if ((m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/))) return m[3] + '-' + pad(m[2]) + '-' + pad(m[1]);
  if (v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  return null;
}
function keyToUtc_(k) { const p = k.split('-').map(Number); return Date.UTC(p[0], p[1] - 1, p[2]); }
