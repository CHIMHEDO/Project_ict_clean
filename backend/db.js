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

pool.getConnection()
  .then(conn => {
    console.log('✅ เชื่อมต่อ MySQL Database สำเร็จ!');
    conn.release();
  })
  .catch(err => {
    console.error('❌ ไม่สามารถเชื่อมต่อ MySQL ได้:', err.message);
    console.error('💡 ตรวจสอบไฟล์ .env และสถานะ MySQL Server ใน Laragon');
  });

module.exports = pool;
