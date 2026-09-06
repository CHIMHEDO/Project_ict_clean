const nodemailer = require('nodemailer');
require('dotenv').config();

// ตั้งค่า Transporter สำหรับ Microsoft 365 Outlook SMTP
// Host: smtp.office365.com, Port: 587 (STARTTLS)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.office365.com',
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  secure: false, // true for 465, false for other ports (587 uses STARTTLS)
  auth: {
    user: process.env.SMTP_USER || process.env.EMAIL_USER || '',
    pass: process.env.SMTP_PASS || process.env.EMAIL_PASS || '',
  },
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false,
  },
});

/**
 * ส่งอีเมลแจ้งเตือนผู้ร่วมวิจัย
 * @param {Array<string>} recipientEmails - รายชื่ออีเมลผู้รับ
 * @param {Object} details - ข้อมูลประกอบการแจ้งเตือน
 */
async function sendProportionUpdateNotification(recipientEmails, details) {
  if (!recipientEmails || recipientEmails.length === 0) return;

  const senderName = details.senderName || 'ผู้ร่วมวิจัย';
  const projectTitle = details.projectTitle || 'โครงการวิจัย';
  const updatedProportion = details.updatedProportion || 0;
  const roleName = details.roleName || '';
  const remainingProportion = details.remainingProportion || 0;
  const allAuthorsList = details.allAuthorsList || [];
  const systemUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  const authorTableHtml = allAuthorsList.map(a => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 8px 12px; font-weight: 500;">${a.full_name || a.email}</td>
      <td style="padding: 8px 12px; color: #4b5563;">${a.role_name}</td>
      <td style="padding: 8px 12px; text-align: right; font-weight: bold; color: ${a.proportion > 0 ? '#10b981' : '#9ca3af'};">
        ${a.proportion}%
      </td>
      <td style="padding: 8px 12px; text-align: center;">
        ${a.is_confirmed ? '<span style="color:#059669; font-weight:600;">✅ ยืนยันแล้ว</span>' : '<span style="color:#f59e0b;">⏳ รอการยืนยัน</span>'}
      </td>
    </tr>
  `).join('');

  const mailOptions = {
    from: `"ระบบคำนวณภาระงานวิจัย ICT" <${process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@ict.university.ac.th'}>`,
    to: recipientEmails.join(', '),
    subject: `[แจ้งเตือน] มีการอัปเดตสัดส่วนงานวิจัย: "${projectTitle}"`,
    html: `
      <div style="font-family: 'Sarabun', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #1e3a8a; margin: 0;">ระบบคำนวณภาระงานและค่าตอบแทนผลงานวิจัย</h2>
          <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">การแจ้งเตือนสัดส่วนการมีส่วนร่วมในผลงานวิจัย</p>
        </div>
        
        <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
          <p style="margin: 0 0 8px 0; font-size: 16px; color: #1e40af;">
            <strong>${senderName}</strong> (${roleName}) ได้ทำการกรอก/อัปเดตสัดส่วนผลงานเป็น <strong>${updatedProportion}%</strong>
          </p>
          <p style="margin: 0; font-size: 14px; color: #1e40af;">
            สัดส่วนคงเหลือสำหรับผู้ร่วมวิจัยท่านอื่น: <strong style="color: #b91c1c;">${remainingProportion}%</strong>
          </p>
        </div>

        <h4 style="color: #374151; margin-bottom: 8px;">ข้อมูลโครงการ:</h4>
        <p style="margin: 0 0 16px 0; color: #4b5563; font-size: 15px;"><strong>ชื่อผลงาน:</strong> ${projectTitle}</p>

        <h4 style="color: #374151; margin-bottom: 8px;">สถานะสัดส่วนและการยืนยันปัจจุบัน:</h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
          <thead>
            <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left;">
              <th style="padding: 8px 12px;">ผู้ร่วมวิจัย</th>
              <th style="padding: 8px 12px;">บทบาท</th>
              <th style="padding: 8px 12px; text-align: right;">สัดส่วน</th>
              <th style="padding: 8px 12px; text-align: center;">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            ${authorTableHtml}
          </tbody>
        </table>

        <div style="text-align: center; margin: 30px 0 10px 0;">
          <a href="${systemUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            เข้าสู่ระบบเพื่อกรอกสัดส่วน / กดยืนยัน
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
          อีเมลนี้เป็นการแจ้งเตือนอัตโนมัติจากระบบ กรุณาอย่ายื่นตอบกลับอีเมลนี้
        </p>
      </div>
    `,
  };

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('⚠️ [SMTP Microsoft 365] ไม่ได้ระบุ SMTP_USER หรือ SMTP_PASS ใน .env (ข้ามการส่งเมลจริง แต่จำลองการแจ้งเตือนสำเร็จ)');
    console.log(`📧 [จำลองการส่งเมลไปยัง]: ${recipientEmails.join(', ')}`);
    console.log(`📝 [หัวข้อ]: ${mailOptions.subject}`);
    return;
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ ส่งอีเมลแจ้งเตือนสำเร็จ Message ID:', info.messageId);
  } catch (error) {
    console.error('❌ ไม่สามารถส่งอีเมลแจ้งเตือนได้:', error.message);
  }
}

module.exports = {
  sendProportionUpdateNotification,
};
