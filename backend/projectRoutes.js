const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./authMiddleware');
const projectController = require('./projectController');

// 1. ดึงรายชื่อผู้ใช้ทั้งหมด เพื่อเลือกเป็นผู้ร่วมวิจัย
router.get('/collaborators', authenticateToken, projectController.getCollaboratorUsers);

// 2. สร้างโครงการวิจัยร่วมใหม่
router.post('/', authenticateToken, projectController.createProject);

// 3. ดึงรายการโครงการทั้งหมด
router.get('/', authenticateToken, projectController.getProjects);

// 4. ดึงข้อมูลโครงการตาม ID
router.get('/:id', authenticateToken, projectController.getProjectById);

// 5. อัปเดตสัดส่วนของผู้ร่วมวิจัย (ส่งอีเมลแจ้งเตือนอัตโนมัติ)
router.put('/:id/proportion', authenticateToken, projectController.updateProportion);

// 6. กดยืนยันสัดส่วน (ถ้าครบทุกคน = บันทึกลง entries หลัก)
router.post('/:id/confirm', authenticateToken, projectController.confirmProportion);

module.exports = router;
