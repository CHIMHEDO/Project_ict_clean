const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'workload_db',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ฟังก์ชันสร้างตารางอัตโนมัติหากยังไม่มี
async function initDatabase() {
  try {
    const conn = await pool.getConnection();

    // 1. ตาราง users
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        azure_id VARCHAR(255) NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        full_name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        program_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. ตาราง programs
    await conn.query(`
      CREATE TABLE IF NOT EXISTS programs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        degree VARCHAR(100) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. ตาราง entries
    await conn.query(`
      CREATE TABLE IF NOT EXISTS entries (
        id VARCHAR(100) PRIMARY KEY,
        user_id INT NULL,
        title TEXT NULL,
        authors TEXT NULL,
        author VARCHAR(255) NULL,
        author_name VARCHAR(255) NULL,
        affiliations TEXT NULL,
        corresponding_author VARCHAR(255) NULL,
        publication_date VARCHAR(100) NULL,
        doi VARCHAR(255) NULL,
        journal VARCHAR(255) NULL,
        volume VARCHAR(100) NULL,
        issue VARCHAR(100) NULL,
        abstract TEXT NULL,
        keywords TEXT NULL,
        type VARCHAR(255) NOT NULL,
        db VARCHAR(255) NULL,
        proportion DECIMAL(5,2) DEFAULT 100,
        date VARCHAR(100) NULL,
        code VARCHAR(50) NULL,
        base_hours DECIMAL(10,2) DEFAULT 0,
        quality DECIMAL(10,2) DEFAULT 0,
        actual_hours DECIMAL(10,2) DEFAULT 0,
        faculty DECIMAL(10,2) DEFAULT 0,
        faculty_note TEXT NULL,
        uni DECIMAL(10,2) DEFAULT 0,
        date_info JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Migration เพิ่มคอลัมน์ใหม่ในตาราง entries หากยังไม่มี
    const newColumns = [
      { name: 'authors', type: 'TEXT NULL' },
      { name: 'affiliations', type: 'TEXT NULL' },
      { name: 'corresponding_author', type: 'VARCHAR(255) NULL' },
      { name: 'publication_date', type: 'VARCHAR(100) NULL' },
      { name: 'doi', type: 'VARCHAR(255) NULL' },
      { name: 'journal', type: 'VARCHAR(255) NULL' },
      { name: 'volume', type: 'VARCHAR(100) NULL' },
      { name: 'issue', type: 'VARCHAR(100) NULL' },
      { name: 'abstract', type: 'TEXT NULL' },
      { name: 'keywords', type: 'TEXT NULL' }
    ];

    for (const col of newColumns) {
      try {
        await conn.query(`ALTER TABLE entries ADD COLUMN ${col.name} ${col.type}`);
      } catch (err) {
        // ละเว้นหากมีคอลัมน์อยู่แล้ว (ER_DUP_FIELDNAME)
      }
    }

    // Migration เพิ่ม password_hash ในตาราง users (สำหรับระบบ email+password login)
    try {
      await conn.query(`ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL`);
      console.log('✅ เพิ่มคอลัมน์ password_hash ในตาราง users สำเร็จ');
    } catch (err) {
      // ละเว้นหากมีคอลัมน์อยู่แล้ว
    }


    // ตรวจสอบและสร้างผู้ใช้ตัวอย่างสำหรับการทดสอบระบบวิจัยร่วม
    const [userCount] = await conn.query('SELECT COUNT(*) as count FROM users');
    if (userCount[0].count === 0) {
      await conn.query(`
        INSERT INTO users (email, full_name, role) VALUES
        ('somchai.j@ict.university.ac.th', 'ดร.สมชาย ใจดี (อาจารย์ประจำ)', 'user'),
        ('somying.r@ict.university.ac.th', 'ผศ.ดร.สมหญิง รักเรียน (อาจารย์ประจำ)', 'user'),
        ('kittisak.p@ict.university.ac.th', 'อ.กิตติศักดิ์ พัฒนา (อาจารย์ประจำ)', 'user')
      `);
      console.log('🌱 สร้างข้อมูลผู้ใช้ตัวอย่าง 3 คนสำเร็จ สำหรับทดสอบฟีเจอร์วิจัยร่วม');
    }

    conn.release();
    console.log('✅ ตรวจสอบและเตรียมตารางฐานข้อมูลสำเร็จ');
  } catch (err) {
    console.error('⚠️ ข้อผิดพลาดในการตรวจสอบตารางฐานข้อมูล:', err.message);
  }
}

pool.getConnection()
  .then(conn => {
    console.log('✅ เชื่อมต่อ MySQL Database สำเร็จ!');
    conn.release();
    initDatabase();
  })
  .catch(err => {
    console.error('❌ ไม่สามารถเชื่อมต่อ MySQL ได้:', err.message);
    console.error('💡 ตรวจสอบไฟล์ .env และสถานะ MySQL Server ใน Laragon');
  });

module.exports = pool;
