const express = require("express");
const cors = require("cors");
const db = require("./db");
const authRoutes = require("./authRoutes");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// เส้นทางสำหรับ Authentication (Microsoft Login & User Management)
app.use("/api/auth", authRoutes);


/* ==========================================
   ข้อมูลอ้างอิงและ Business Logic (อยู่ฝั่ง Backend ทั้งหมด)
   ========================================== */
const NO_DB = "ไม่มีฐานข้อมูล";

const LOOKUP_TABLE = [
  { type: "การประชุมวิชาการระดับชาติ (สายสนับสนุน)", db: NO_DB, code: "2.1.4", hours: 20, quality: 0.2, faculty: 0, uni: 0 },
  { type: "การประชุมวิชาการระดับชาติ (สายวิชาการ)", db: NO_DB, code: "2.1.4", hours: 20, quality: 0.2, faculty: 0, uni: 0 },
  { type: "การประชุมวิชาการระดับนานาชาติ", db: NO_DB, code: "2.1.5", hours: 40, quality: 0.4, faculty: 0, uni: 0 },
  { type: "วารสารระดับชาติ", db: NO_DB, code: "2.1.5", hours: 40, quality: 0.4, faculty: 0, uni: 0 },
  { type: "วารสารระดับชาติ", db: "TCI กลุ่ม 2", code: "2.1.6", hours: 80, quality: 0.6, faculty: 2500, uni: 0 },
  { type: "วารสารระดับชาติ", db: "TCI กลุ่ม 1", code: "2.1.7", hours: 120, quality: 0.8, faculty: 2500, uni: 0 },
  { type: "วารสารระดับนานาชาติ", db: NO_DB, code: "2.1.7", hours: 120, quality: 0.8, faculty: 10000, uni: 0 },
  { type: "วารสารระดับนานาชาติ", db: "Scopus Q1", code: "2.1.8", hours: 150, quality: 1, faculty: 10000, facultyNote: "ไม่เกิน 10,000 บาท (จ่ายตามจริง)", uni: 40000 },
  { type: "วารสารระดับนานาชาติ", db: "Scopus Q2", code: "2.1.8", hours: 150, quality: 1, faculty: 10000, facultyNote: "ไม่เกิน 10,000 บาท (จ่ายตามจริง)", uni: 30000 },
  { type: "วารสารระดับนานาชาติ", db: "Scopus Q3", code: "2.1.8", hours: 150, quality: 1, faculty: 10000, facultyNote: "ไม่เกิน 10,000 บาท (จ่ายตามจริง)", uni: 20000 },
  { type: "วารสารระดับนานาชาติ", db: "Scopus Q4", code: "2.1.8", hours: 150, quality: 1, faculty: 10000, facultyNote: "ไม่เกิน 10,000 บาท (จ่ายตามจริง)", uni: 10000 },
  { type: "จดทะเบียนทรัพย์สินทางปัญหาอื่นๆ", db: NO_DB, code: "2.1.9", hours: 150, quality: 0, faculty: 0, uni: 1000 },
  { type: "จดทะเบียนอนุสิทธิบัตร", db: NO_DB, code: "2.1.10", hours: 150, quality: 0.4, faculty: 0, uni: 3000 },
  { type: "จดทะเบียนสิทธิบัตร", db: NO_DB, code: "2.1.11", hours: 300, quality: 1, faculty: 0, uni: 5000 },
  { type: "งานสร้างสรรค์ที่มีการเผยแพร่สู่สาธารณะ (สื่ออิเล็กทรอนิกส์ online)", db: NO_DB, code: "2.2.1", hours: 20, quality: 0.2, faculty: 0, uni: 0 },
  { type: "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับสถาบัน", db: NO_DB, code: "2.2.2", hours: 40, quality: 0.4, faculty: 0, uni: 0 },
  { type: "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับชาติ", db: NO_DB, code: "2.2.3", hours: 80, quality: 0.6, faculty: 0, uni: 0 },
  { type: "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับความร่วมมือระหว่างประเทศ", db: NO_DB, code: "2.2.4", hours: 120, quality: 0.8, faculty: 0, uni: 0 },
  { type: "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับภูมิภาคอาเซียน/นานาชาติ", db: NO_DB, code: "2.2.5", hours: 150, quality: 1, faculty: 0, uni: 0 },
];

function calculateFacultyFunding(type, author, baseFaculty) {
  if (type === "การประชุมวิชาการระดับชาติ (สายสนับสนุน)") {
    return author === "First author" ? 2500 : 0;
  }
  if (type === "การประชุมวิชาการระดับชาติ (สายวิชาการ)") {
    if (author === "First author") return 1000;
    if (author === "Corresponding author") return 500;
    return 0;
  }
  if (type === "การประชุมวิชาการระดับนานาชาติ") {
    if (author === "First author" || author === "Corresponding author") return 9000;
    if (author === "Co author") return 2500;
    return 0;
  }
  return baseFaculty;
}

function computeDateInfo(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  
  const beYear = y + 543;
  const juneStart = new Date(y, 5, 15);
  const acadGregorian = d >= juneStart ? y : y - 1;
  
  const julyStart = new Date(y, 6, 1);
  const fiscalEndGregorian = d >= julyStart ? y + 1 : y;

  return {
    beLabel: `ปี พ.ศ. ${beYear}`,
    acadLabel: `ปีการศึกษา ${acadGregorian + 543}`,
    fiscalLabel: `ปีงบประมาณ ${fiscalEndGregorian + 543}`,
    workloadLabel: `ปีภาระงาน ${acadGregorian + 543}`,
  };
}

// ฟังก์ชันแปลงรูปแบบแถวจาก MySQL เป็น Format ที่ Frontend คาดหวัง
function formatEntry(row) {
  let dateInfo = row.date_info;
  if (typeof dateInfo === "string") {
    try {
      dateInfo = JSON.parse(dateInfo);
    } catch {
      dateInfo = null;
    }
  }

  return {
    id: row.id,
    title: row.title || "",
    authors: row.authors || "",
    author: row.author,
    authorName: row.author_name || "",
    affiliations: row.affiliations || "",
    correspondingAuthor: row.corresponding_author || "",
    publicationDate: row.publication_date || row.date || "",
    doi: row.doi || "",
    journal: row.journal || "",
    volume: row.volume || "",
    issue: row.issue || "",
    abstract: row.abstract || "",
    keywords: row.keywords || "",
    type: row.type,
    db: row.db,
    proportion: Number(row.proportion),
    date: row.publication_date || row.date,
    code: row.code,
    baseHours: Number(row.base_hours),
    hours: Number(row.base_hours),
    quality: Number(row.quality),
    actualHours: Number(row.actual_hours),
    faculty: Number(row.faculty),
    facultyNote: row.faculty_note,
    uni: Number(row.uni),
    dateInfo: dateInfo,
    savedAt: row.created_at,
  };
}

/* --- API Endpoints --- */

// 1. API สำหรับคำนวณผลลัพธ์ (Live Preview)
app.post("/api/calculate", (req, res) => {
  const { author, type, db: selectedDb, proportion, date, publicationDate } = req.body;
  const lookup = LOOKUP_TABLE.find((r) => r.type === type && r.db === selectedDb);
  
  if (!lookup) {
    return res.json({ success: false, message: "No match found" });
  }

  const actualHours = Math.round(((Number(proportion) || 0) * lookup.hours) / 100 * 100) / 100;
  const dateInfo = computeDateInfo(publicationDate || date);
  const faculty = calculateFacultyFunding(type, author, lookup.faculty);

  res.json({ success: true, data: { ...lookup, faculty, actualHours, dateInfo } });
});

// 2. API สำหรับดึงข้อมูลทั้งหมดจาก MySQL
app.get("/api/entries", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM entries ORDER BY created_at DESC, id DESC");
    res.json({ success: true, data: rows.map(formatEntry) });
  } catch (error) {
    console.error("Error fetching entries:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. API สำหรับบันทึกข้อมูลลง MySQL
app.post("/api/entries", async (req, res) => {
  try {
    const id = req.body.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const {
      title,
      authors,
      author,
      authorName,
      affiliations,
      correspondingAuthor,
      publicationDate,
      doi,
      journal,
      volume,
      issue,
      abstract,
      keywords,
      type,
      db: selectedDb,
      proportion,
      date,
      code,
      baseHours,
      quality,
      actualHours,
      faculty,
      facultyNote,
      uni,
      dateInfo
    } = req.body;

    const pubDate = publicationDate || date || null;

    const sql = `
      INSERT INTO entries (
        id, title, authors, author, author_name, affiliations, corresponding_author,
        publication_date, doi, journal, volume, issue, abstract, keywords,
        type, db, proportion, date, code,
        base_hours, quality, actual_hours, faculty, faculty_note, uni, date_info
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.query(sql, [
      id,
      title || null,
      authors || null,
      author || null,
      authorName || null,
      affiliations || null,
      correspondingAuthor || null,
      pubDate,
      doi || null,
      journal || null,
      volume || null,
      issue || null,
      abstract || null,
      keywords || null,
      type || "",
      selectedDb || "",
      proportion !== undefined ? Number(proportion) : 100,
      pubDate,
      code || "",
      baseHours !== undefined ? Number(baseHours) : 0,
      quality !== undefined ? Number(quality) : 0,
      actualHours !== undefined ? Number(actualHours) : 0,
      faculty !== undefined ? Number(faculty) : 0,
      facultyNote || "",
      uni !== undefined ? Number(uni) : 0,
      dateInfo ? JSON.stringify(dateInfo) : null
    ]);

    const [rows] = await db.query("SELECT * FROM entries ORDER BY created_at DESC, id DESC");
    res.json({ success: true, data: rows.map(formatEntry) });
  } catch (error) {
    console.error("Error saving entry:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. API สำหรับลบข้อมูลใน MySQL
app.delete("/api/entries/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM entries WHERE id = ?", [id]);

    const [rows] = await db.query("SELECT * FROM entries ORDER BY created_at DESC, id DESC");
    res.json({ success: true, data: rows.map(formatEntry) });
  } catch (error) {
    console.error("Error deleting entry:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend Server is running on http://localhost:${PORT}`);
});