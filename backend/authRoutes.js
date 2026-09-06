const express = require('express');
const router = express.Router();
const authController = require('./authController');
const { authenticateToken, authorizeRoles } = require('./authMiddleware');

// 1. ขอ URL สำหรับไปยังหน้า Login ของ Microsoft
router.get('/microsoft', authController.getMicrosoftAuthUrl);

// 2. Callback URL ที่ Microsoft Redirect กลับมาพร้อม auth code
router.get('/microsoft/callback', authController.handleMicrosoftCallback);

// 3. ดึงข้อมูล Profile ของผู้ใช้ปัจจุบัน
router.get('/me', authenticateToken, authController.getCurrentUserProfile);

// 4. ดูรายชื่อ User ทั้งหมด (เฉพาะ Admin)
router.get('/users', authenticateToken, authorizeRoles('admin'), authController.getAllUsers);

// 5. อัปเดต Role และ Program ของ User (เฉพาะ Admin)
router.put('/users/:id/role', authenticateToken, authorizeRoles('admin'), authController.updateUserRole);

// 6. ดึงรายชื่อหลักสูตรทั้งหมด
router.get('/programs', authController.getPrograms);

module.exports = router;
