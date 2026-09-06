const db = require('./db');
const { sendProportionUpdateNotification } = require('./emailService');

// กฎลำดับความสำคัญของบทบาท
const ROLE_ORDER_MAP = {
  'First author': 1,
  'Corresponding author': 2,
  'Co-author': 3,
};

/**
 * 1. ดึงรายชื่อผู้ใช้ทั้งหมดในระบบ เพื่อนำไปเลือกเป็นผู้ร่วมวิจัย (Dropdown)
 */
exports.getCollaboratorUsers = async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT id, email, full_name, role FROM users ORDER BY full_name ASC`
    );
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. สร้างโครงการวิจัยร่วมใหม่ (พร้อมกำหนดผู้ร่วมวิจัยและบทบาท)
 */
exports.createProject = async (req, res) => {
  try {
    const {
      title,
      type,
      db: selectedDb,
      date,
      code,
      baseHours,
      quality,
      faculty,
      facultyNote,
      uni,
      dateInfo,
      authors, // Array of { userId, roleName, proportion }
    } = req.body;

    if (!title || !type) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อเรื่องและประเภทผลงาน' });
    }

    if (!authors || !Array.isArray(authors) || authors.length === 0) {
      return res.status(400).json({ success: false, message: 'ต้องมีผู้ร่วมวิจัยอย่างน้อย 1 คน' });
    }

    // ตรวจสอบความถูกต้องของสัดส่วนรวม
    const totalProp = authors.reduce((sum, a) => sum + (Number(a.proportion) || 0), 0);
    if (totalProp > 100) {
      return res.status(400).json({
        success: false,
        message: `สัดส่วนรวมกันเกิน 100% (ปัจจุบัน: ${totalProp}%)`,
      });
    }

    // ตรวจสอบเงื่อนไขลำดับบทบาท: First author >= Corresponding author >= Co-author
    const sortedAuthors = [...authors].sort((a, b) => {
      const orderA = ROLE_ORDER_MAP[a.roleName] || 99;
      const orderB = ROLE_ORDER_MAP[b.roleName] || 99;
      return orderA - orderB;
    });

    for (let i = 0; i < sortedAuthors.length - 1; i++) {
      const current = sortedAuthors[i];
      const next = sortedAuthors[i + 1];
      const propCurrent = Number(current.proportion) || 0;
      const propNext = Number(next.proportion) || 0;

      // ถ้าทั้งสองคนมีการกรอกสัดส่วนแล้ว และลำดับสูงกว่าได้น้อยกว่าลำดับรอง
      if (propNext > 0 && propCurrent > 0 && propCurrent < propNext) {
        return res.status(400).json({
          success: false,
          message: `ลำดับหน้าที่ไม่ถูกต้อง: ${current.roleName} (${propCurrent}%) ต้องได้สัดส่วนไม่น้อยกว่า ${next.roleName} (${propNext}%)`,
        });
      }
    }

    const projectId = `proj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const createdBy = req.user ? req.user.id : authors[0].userId;

    // บันทึกโครงการ
    await db.query(
      `INSERT INTO research_projects (
        id, title, type, db, date, code, base_hours, quality,
        faculty, faculty_note, uni, date_info, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        projectId,
        title,
        type,
        selectedDb || null,
        date || '',
        code || '',
        Number(baseHours) || 0,
        Number(quality) || 0,
        Number(faculty) || 0,
        facultyNote || '',
        Number(uni) || 0,
        dateInfo ? JSON.stringify(dateInfo) : null,
        createdBy,
      ]
    );

    // บันทึกผู้ร่วมวิจัย
    for (const a of authors) {
      const roleOrder = ROLE_ORDER_MAP[a.roleName] || 3;
      await db.query(
        `INSERT INTO project_authors (
          project_id, user_id, role_order, role_name, proportion, is_confirmed
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          projectId,
          a.userId,
          roleOrder,
          a.roleName,
          Number(a.proportion) || 0,
          false,
        ]
      );
    }

    res.json({
      success: true,
      message: 'สร้างโครงการวิจัยร่วมสำเร็จ',
      projectId,
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3. ดึงรายการโครงการวิจัยทั้งหมด หรือโครงการของผู้ใช้ปัจจุบัน
 */
exports.getProjects = async (req, res) => {
  try {
    const currentUserId = req.user?.id;

    const [projects] = await db.query(`
      SELECT 
        p.*,
        u.full_name AS creator_name,
        u.email AS creator_email
      FROM research_projects p
      LEFT JOIN users u ON p.created_by = u.id
      ORDER BY p.created_at DESC
    `);

    // ดึงผู้ร่วมวิจัยของแต่ละโครงการ
    const projectList = [];
    for (const p of projects) {
      const [authors] = await db.query(
        `SELECT 
          pa.id, pa.project_id, pa.user_id, pa.role_order, pa.role_name, 
          pa.proportion, pa.is_confirmed, pa.confirmed_at,
          u.full_name, u.email
         FROM project_authors pa
         JOIN users u ON pa.user_id = u.id
         WHERE pa.project_id = ?
         ORDER BY pa.role_order ASC, pa.id ASC`,
        [p.id]
      );

      let dateInfo = p.date_info;
      if (typeof dateInfo === 'string') {
        try { dateInfo = JSON.parse(dateInfo); } catch { dateInfo = null; }
      }

      projectList.push({
        ...p,
        date_info: dateInfo,
        authors: authors.map(a => ({
          ...a,
          proportion: Number(a.proportion),
          is_confirmed: Boolean(a.is_confirmed),
        })),
      });
    }

    res.json({ success: true, data: projectList });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. ดึงข้อมูลโครงการวิจัยระบุ ID
 */
exports.getProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    const [projects] = await db.query(
      `SELECT p.*, u.full_name AS creator_name FROM research_projects p 
       LEFT JOIN users u ON p.created_by = u.id 
       WHERE p.id = ?`,
      [id]
    );

    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบโครงการวิจัยนี้' });
    }

    const project = projects[0];
    const [authors] = await db.query(
      `SELECT 
        pa.id, pa.project_id, pa.user_id, pa.role_order, pa.role_name, 
        pa.proportion, pa.is_confirmed, pa.confirmed_at,
        u.full_name, u.email
       FROM project_authors pa
       JOIN users u ON pa.user_id = u.id
       WHERE pa.project_id = ?
       ORDER BY pa.role_order ASC, pa.id ASC`,
      [id]
    );

    let dateInfo = project.date_info;
    if (typeof dateInfo === 'string') {
      try { dateInfo = JSON.parse(dateInfo); } catch { dateInfo = null; }
    }

    res.json({
      success: true,
      data: {
        ...project,
        date_info: dateInfo,
        authors: authors.map(a => ({
          ...a,
          proportion: Number(a.proportion),
          is_confirmed: Boolean(a.is_confirmed),
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching project by id:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. อัปเดตสัดส่วนของผู้ร่วมวิจัย (Update Proportion + Role Check + Send Email)
 */
exports.updateProportion = async (req, res) => {
  try {
    const { id } = req.params;
    const { proportion } = req.body;
    const userId = req.body.userId || req.user?.id;

    if (proportion === undefined || Number(proportion) < 0 || Number(proportion) > 100) {
      return res.status(400).json({ success: false, message: 'สัดส่วนต้องอยู่ระหว่าง 0 - 100%' });
    }

    // ตรวจสอบโปรเจกต์
    const [projects] = await db.query(`SELECT * FROM research_projects WHERE id = ?`, [id]);
    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบโครงการวิจัย' });
    }
    const project = projects[0];

    if (project.status === 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'โครงการนี้ได้รับการยืนยันครบทุกคนและบันทึกเสร็จสมบูรณ์แล้ว ไม่สามารถแก้ไขได้',
      });
    }

    // ดึงผู้ร่วมวิจัยทั้งหมดในโปรเจกต์
    const [authors] = await db.query(
      `SELECT pa.*, u.full_name, u.email 
       FROM project_authors pa 
       JOIN users u ON pa.user_id = u.id 
       WHERE pa.project_id = ?
       ORDER BY pa.role_order ASC, pa.id ASC`,
      [id]
    );

    const currentAuthor = authors.find(a => a.user_id == userId);
    if (!currentAuthor) {
      return res.status(403).json({ success: false, message: 'คุณไม่ได้เป็นผู้ร่วมวิจัยในโครงการนี้' });
    }

    const newProp = Number(proportion);

    // จำลองผลรวมสัดส่วนใหม่
    const updatedAuthors = authors.map(a => {
      if (a.user_id == userId) {
        return { ...a, proportion: newProp };
      }
      return { ...a, proportion: Number(a.proportion) };
    });

    // 1. ตรวจสอบผลรวมว่าเกิน 100% หรือไม่
    const totalSum = updatedAuthors.reduce((s, a) => s + a.proportion, 0);
    if (totalSum > 100) {
      const otherSum = totalSum - newProp;
      const maxAllowed = 100 - otherSum;
      return res.status(400).json({
        success: false,
        message: `สัดส่วนรวมเกิน 100% (ผลรวมจะเป็น ${totalSum}%) คุณสามารถกรอกได้สูงสุดไม่เกิน ${maxAllowed}%`,
      });
    }

    // 2. ตรวจสอบเงื่อนไขลำดับบทบาท: First author >= Corresponding author >= Co-author
    // เรียงตาม role_order (1 -> 2 -> 3)
    const sortedAuthors = [...updatedAuthors].sort((a, b) => a.role_order - b.role_order);
    for (let i = 0; i < sortedAuthors.length - 1; i++) {
      const higherRole = sortedAuthors[i];
      const lowerRole = sortedAuthors[i + 1];

      // ถ้าทั้งสองคนกรอกสัดส่วน > 0 แล้ว และบทบาทสูงกว่าได้สัดส่วนน้อยกว่าบทบาทรอง
      if (higherRole.proportion > 0 && lowerRole.proportion > 0 && higherRole.proportion < lowerRole.proportion) {
        return res.status(400).json({
          success: false,
          message: `ผิดเงื่อนไขลำดับบทบาท: ${higherRole.role_name} (${higherRole.proportion}%) ต้องได้สัดส่วนไม่น้อยกว่า ${lowerRole.role_name} (${lowerRole.proportion}%)`,
        });
      }
    }

    // บันทึกสัดส่วนใหม่ และรีเซ็ตการยืนยัน (เนื่องจากสัดส่วนเปลี่ยน ทุกคนต้องยืนยันใหม่)
    await db.query(
      `UPDATE project_authors 
       SET proportion = ?, is_confirmed = FALSE, confirmed_at = NULL 
       WHERE project_id = ? AND user_id = ?`,
      [newProp, id, userId]
    );

    // รีเซ็ตการยืนยันของคนอื่นด้วย เพราะตัวเลขเปลี่ยน
    await db.query(
      `UPDATE project_authors 
       SET is_confirmed = FALSE, confirmed_at = NULL 
       WHERE project_id = ?`,
      [id]
    );

    // ส่งอีเมลแจ้งเตือนไปยังผู้ร่วมวิจัยคนอื่น ๆ
    const otherEmails = authors
      .filter(a => a.user_id != userId && a.email)
      .map(a => a.email);

    const remainingProportion = 100 - totalSum;

    // Trigger การส่งอีเมลแบบ Non-blocking (async)
    sendProportionUpdateNotification(otherEmails, {
      senderName: currentAuthor.full_name || currentAuthor.email,
      roleName: currentAuthor.role_name,
      projectTitle: project.title,
      updatedProportion: newProp,
      remainingProportion: remainingProportion >= 0 ? remainingProportion : 0,
      allAuthorsList: updatedAuthors,
    }).catch(err => console.error('Error in sendProportionUpdateNotification:', err));

    res.json({
      success: true,
      message: 'อัปเดตสัดส่วนและส่งอีเมลแจ้งเตือนผู้ร่วมวิจัยเรียบร้อยแล้ว',
      totalProportion: totalSum,
      remainingProportion: 100 - totalSum,
    });
  } catch (error) {
    console.error('Error updating proportion:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6. กดยืนยันสัดส่วน (Confirm Proportion)
 * หากทุกคนกดยืนยันครบ 100% -> บันทึกลงตาราง entries หลักอย่างเป็นทางการ
 */
exports.confirmProportion = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.body.userId || req.user?.id;

    // ตรวจสอบโปรเจกต์
    const [projects] = await db.query(`SELECT * FROM research_projects WHERE id = ?`, [id]);
    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบโครงการวิจัย' });
    }
    const project = projects[0];

    if (project.status === 'confirmed') {
      return res.json({ success: true, message: 'โครงการนี้ได้รับการยืนยันเสร็จสมบูรณ์แล้ว' });
    }

    // ดึงผู้ร่วมวิจัย
    const [authors] = await db.query(
      `SELECT pa.*, u.full_name, u.email 
       FROM project_authors pa 
       JOIN users u ON pa.user_id = u.id 
       WHERE pa.project_id = ?
       ORDER BY pa.role_order ASC, pa.id ASC`,
      [id]
    );

    const currentAuthor = authors.find(a => a.user_id == userId);
    if (!currentAuthor) {
      return res.status(403).json({ success: false, message: 'คุณไม่ได้เป็นผู้ร่วมวิจัยในโครงการนี้' });
    }

    // ตรวจสอบว่าตนเองมีสัดส่วนถูกต้องหรือไม่
    if (Number(currentAuthor.proportion) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกสัดส่วนของคุณก่อนกดยืนยัน',
      });
    }

    // บันทึกการยืนยันของผู้ใช้คนนี้
    await db.query(
      `UPDATE project_authors 
       SET is_confirmed = TRUE, confirmed_at = NOW() 
       WHERE project_id = ? AND user_id = ?`,
      [id, userId]
    );

    // ดึงสถานะล่าสุดของทุกคนหลังการยืนยัน
    const [updatedAuthors] = await db.query(
      `SELECT pa.*, u.full_name, u.email 
       FROM project_authors pa 
       JOIN users u ON pa.user_id = u.id 
       WHERE pa.project_id = ?
       ORDER BY pa.role_order ASC, pa.id ASC`,
      [id]
    );

    const allConfirmed = updatedAuthors.every(a => Boolean(a.is_confirmed));
    const totalProp = updatedAuthors.reduce((sum, a) => sum + Number(a.proportion), 0);

    // ถ้าทุกคนกดยืนยันครบแล้ว
    if (allConfirmed) {
      // ตรวจสอบว่าผลรวมเท่ากับ 100% พอดีหรือไม่
      if (Math.round(totalProp) !== 100) {
        return res.json({
          success: true,
          message: `ยืนยันเรียบร้อยแล้ว แต่สัดส่วนรวมยังไม่ครบ 100% (ปัจจุบัน: ${totalProp}%) ระบบจะยังไม่บันทึกขั้นสุดท้ายจนกว่าสัดส่วนจะครบ 100%`,
          isAllConfirmed: false,
        });
      }

      // ตรวจสอบลำดับบทบาทขั้นสุดท้าย: First author >= Corresponding author >= Co-author
      const sortedAuthors = [...updatedAuthors].sort((a, b) => a.role_order - b.role_order);
      for (let i = 0; i < sortedAuthors.length - 1; i++) {
        const higherRole = sortedAuthors[i];
        const lowerRole = sortedAuthors[i + 1];
        if (Number(higherRole.proportion) < Number(lowerRole.proportion)) {
          return res.status(400).json({
            success: false,
            message: `ไม่สามารถบันทึกได้เนื่องจากผิดกฎบทบาท: ${higherRole.role_name} (${higherRole.proportion}%) ต้องได้สัดส่วนไม่น้อยกว่า ${lowerRole.role_name} (${lowerRole.proportion}%)`,
          });
        }
      }

      // อัปเดตสถานะโครงการเป็น confirmed
      await db.query(
        `UPDATE research_projects SET status = 'confirmed' WHERE id = ?`,
        [id]
      );

      // บันทึกเข้าตาราง entries หลัก สำหรับแต่ละคนเพื่อคำนวณภาระงาน
      for (const author of updatedAuthors) {
        const entryId = `${id}-usr-${author.user_id}`;
        const actualHours = Math.round(((Number(author.proportion) * Number(project.base_hours)) / 100) * 100) / 100;
        const authorFaculty = Math.round(((Number(author.proportion) * Number(project.faculty)) / 100) * 100) / 100;
        const authorUni = Math.round(((Number(author.proportion) * Number(project.uni)) / 100) * 100) / 100;

        await db.query(
          `INSERT INTO entries (
            id, user_id, author, type, db, proportion, date, code,
            base_hours, quality, actual_hours, faculty, faculty_note, uni, date_info
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            proportion = VALUES(proportion),
            actual_hours = VALUES(actual_hours),
            faculty = VALUES(faculty),
            uni = VALUES(uni)`,
          [
            entryId,
            author.user_id,
            `${author.full_name} (${author.role_name})`,
            project.type,
            project.db,
            author.proportion,
            project.date,
            project.code,
            project.base_hours,
            project.quality,
            actualHours,
            authorFaculty,
            project.faculty_note,
            authorUni,
            project.date_info ? JSON.stringify(project.date_info) : null,
          ]
        );
      }

      return res.json({
        success: true,
        message: '🎉 ยืนยันครบทุกคนแล้ว! บันทึกผลงานเข้าฐานข้อมูลหลักอย่างเป็นทางการเรียบร้อยแล้ว',
        isAllConfirmed: true,
        projectStatus: 'confirmed',
      });
    }

    res.json({
      success: true,
      message: 'ยืนยันสัดส่วนของคุณเรียบร้อยแล้ว (รอผู้ร่วมวิจัยท่านอื่นยืนยันให้ครบ)',
      isAllConfirmed: false,
    });
  } catch (error) {
    console.error('Error confirming proportion:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
