// frontend/src/App.jsx
import React, { useState, useEffect, useMemo } from "react";
import { 
  BookMarked, 
  Trash2, 
  Plus, 
  Coins, 
  Clock, 
  CalendarDays, 
  CheckCircle2,
  FileText,
  Layers
} from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./components/LoginPage";
import Header from "./components/Header";
import "./App.css";

const API_URL = "http://localhost:5000/api";

const TYPE_GROUPS = [
  {
    label: "การประชุมวิชาการ",
    types: [
      "การประชุมวิชาการระดับชาติ (สายสนับสนุน)",
      "การประชุมวิชาการระดับชาติ (สายวิชาการ)",
      "การประชุมวิชาการระดับนานาชาติ"
    ]
  },
  { label: "วารสารวิชาการ", types: ["วารสารระดับชาติ", "วารสารระดับนานาชาติ"] },
  { label: "ทรัพย์สินทางปัญญา", types: ["จดทะเบียนทรัพย์สินทางปัญหาอื่นๆ", "จดทะเบียนอนุสิทธิบัตร", "จดทะเบียนสิทธิบัตร"] },
  {
    label: "งานสร้างสรรค์",
    types: [
      "งานสร้างสรรค์ที่มีการเผยแพร่สู่สาธารณะ (สื่ออิเล็กทรอนิกส์ online)",
      "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับสถาบัน",
      "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับชาติ",
      "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับความร่วมมือระหว่างประเทศ",
      "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับภูมิภาคอาเซียน/นานาชาติ",
    ],
  },
];
const AUTHOR_OPTIONS = ["First author", "Corresponding author", "Co author"];
const DB_OPTIONS = ["ไม่มีฐานข้อมูล", "TCI กลุ่ม 2", "TCI กลุ่ม 1", "Scopus Q1", "Scopus Q2", "Scopus Q3", "Scopus Q4"];

const emptyForm = { author: AUTHOR_OPTIONS[0], type: TYPE_GROUPS[0].types[0], db: DB_OPTIONS[0], proportion: 100, date: "" };

function AcademicWorkloadMain() {
  const { user, authLoading, token, toast, setToast } = useAuth();

  const [tab, setTab] = useState("form");
  const [form, setForm] = useState(emptyForm);
  const [entries, setEntries] = useState([]);
  
  // สถานะผลการคำนวณจาก Backend
  const [previewData, setPreviewData] = useState(null);

  // 1. ดึงข้อมูลรายการที่เคยบันทึกไว้เมื่อโหลดและล็อกอินแล้ว
  useEffect(() => {
    if (!user) return;
    fetch(`${API_URL}/entries`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(data => { if (data.success) setEntries(data.data); })
      .catch(err => console.error("Error fetching entries:", err));
  }, [user, token]);

  // 2. ขอให้ Backend คำนวณผลลัพธ์แบบ Live Preview เมื่อมีการเปลี่ยนค่าในฟอร์ม
  useEffect(() => {
    if (!user) return;
    const fetchCalculation = async () => {
      try {
        const res = await fetch(`${API_URL}/calculate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form)
        });
        const data = await res.json();
        setPreviewData(data.success ? data.data : null);
      } catch (err) {
        setPreviewData(null);
      }
    };
    fetchCalculation();
  }, [form, user]);

  // ฟังก์ชันบันทึกข้อมูลไปยัง Backend
  const handleSave = async () => {
    if (!previewData) return;
    
    const payload = {
      ...form,
      code: previewData.code,
      baseHours: previewData.hours,
      quality: previewData.quality,
      actualHours: previewData.actualHours,
      faculty: previewData.faculty,
      facultyNote: previewData.facultyNote,
      uni: previewData.uni,
      dateInfo: previewData.dateInfo
    };

    try {
      const res = await fetch(`${API_URL}/entries`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setEntries(data.data);
        setToast("บันทึกผลงานเรียบร้อยแล้ว");
        setForm(emptyForm);
        setTab("dashboard");
      }
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  // ฟังก์ชันลบข้อมูล
  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API_URL}/entries/${id}`, { 
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.success) {
        setEntries(data.data);
        setToast("ลบรายการเรียบร้อยแล้ว");
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const totals = useMemo(() => {
    let hours = 0, faculty = 0, uni = 0, count = entries.length;
    entries.forEach(e => {
      hours += e.actualHours || 0;
      faculty += e.faculty || 0;
      uni += e.uni || 0;
    });
    return { hours: Math.round(hours * 100) / 100, faculty, uni, count };
  }, [entries]);

  // แสดงหน้าจอโหลดขณะตรวจสอบสถานะการเข้าสู่ระบบ
  if (authLoading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-spinner"></div>
        <p>กำลังตรวจสอบข้อมูลผู้ใช้งาน...</p>
      </div>
    );
  }

  // หากยังไม่ได้เข้าสู่ระบบ แสดงหน้า Login
// พักไว้จนกว่าจะแก้ไมโครซอฟท์ได้
  if (!user) {
    return <LoginPage />;
  }   


  return (
    <div className="app-container">
      {/* Top Header */}
      <Header tab={tab} setTab={setTab} entriesCount={entries.length} />

      {/* Main Content Area */}
      <main className="app-main">
        {tab === "form" && (
          <div className="form-grid-layout">
            {/* Form Card */}
            <div className="card">
              <div className="card-header">
                <div className="card-title-group">
                  <FileText size={20} color="#0f172a" />
                  <h2 className="card-title">ข้อมูลผลงาน</h2>
                </div>
              </div>

              {/* ประเภทผลงาน */}
              <div className="form-group">
                <label className="form-label">ประเภทผลงานวิชาการ</label>
                <select
                  className="form-control"
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                >
                  {TYPE_GROUPS.map(g => (
                    <optgroup key={g.label} label={g.label}>
                      {g.types.map(t => <option key={t} value={t}>{t}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* ฐานข้อมูล */}
              <div className="form-group">
                <label className="form-label">ฐานข้อมูล / การรับรอง</label>
                <select
                  className="form-control"
                  value={form.db}
                  onChange={e => setForm({ ...form, db: e.target.value })}
                >
                  {DB_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* สัดส่วน (0-100%) */}
              <div className="form-group">
                <div className="form-label-row">
                  <label className="form-label" style={{ margin: 0 }}>สัดส่วนการมีส่วนร่วม (%)</label>
                  <span className="badge-value">
                    {form.proportion !== "" ? `${form.proportion}%` : "0%"}
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.proportion}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === "") {
                      setForm({ ...form, proportion: "" });
                    } else {
                      const num = Number(val);
                      if (num >= 0 && num <= 100) {
                        setForm({ ...form, proportion: num });
                      }
                    }
                  }}
                  placeholder="กรอกตัวเลข 0 - 100"
                  className="form-control"
                />
                {/* Fast Preset Buttons */}
                <div className="preset-buttons">
                  {[100, 50, 33.3, 25].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setForm({ ...form, proportion: pct })}
                      className={`preset-btn ${form.proportion === pct ? "active" : ""}`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* ตำแหน่งผู้ประพันธ์ */}
              <div className="form-group">
                <label className="form-label">ตำแหน่งผู้ประพันธ์</label>
                <select
                  className="form-control"
                  value={form.author}
                  onChange={e => setForm({ ...form, author: e.target.value })}
                >
                  {AUTHOR_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              {/* วันที่ตีพิมพ์ */}
              <div className="form-group">
                <label className="form-label">วันที่ตีพิมพ์ / เผยแพร่</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                />
              </div>
            </div>

            {/* Live Calculation Preview Card */}
            <div className="card preview-card-sticky">
              <div className="card-header">
                <div className="card-title-group">
                  <Layers size={20} color="#2563eb" />
                  <h2 className="card-title">ผลการคำนวณแบบสด</h2>
                </div>
                <span className="live-pill">Live API</span>
              </div>

              {!previewData ? (
                <div className="preview-empty">
                  <Clock size={32} className="preview-empty-icon" />
                  <p className="preview-empty-title">กำลังคำนวณข้อมูล...</p>
                </div>
              ) : (
                <>
                  <div className="formula-box">
                    <div className="formula-header">
                      <span className="formula-title">เกณฑ์ภาระงานตามประกาศ</span>
                      <span className="formula-code">รหัส {previewData.code}</span>
                    </div>
                    <div className="formula-metrics">
                      <div>
                        <div className="metric-label">ชั่วโมงฐาน</div>
                        <div className="metric-val">{previewData.hours} ชม.</div>
                      </div>
                      <div>
                        <div className="metric-label">ค่าน้ำหนัก (Q)</div>
                        <div className="metric-val">{previewData.quality}</div>
                      </div>
                      <div>
                        <div className="metric-label">สัดส่วน</div>
                        <div className="metric-val">{form.proportion || 0}%</div>
                      </div>
                    </div>
                  </div>

                  <div className="highlight-stat-box">
                    <span className="highlight-label">ชั่วโมงภาระงานที่ได้รับจริง</span>
                    <div className="highlight-value">
                      {previewData.actualHours}
                      <span className="highlight-unit">ชม.</span>
                    </div>
                    <div className="highlight-sub">
                      = {previewData.hours} ชม. × {form.proportion || 0}%
                    </div>
                  </div>

                  <div className="finance-grid">
                    <div className="finance-card">
                      <div className="finance-title">
                        <Coins size={15} color="#2563eb" />
                        <span>เงินสนับสนุนคณะ</span>
                      </div>
                      <div className="finance-amount">
                        {previewData.faculty > 0 ? `${previewData.faculty.toLocaleString()} ฿` : "-"}
                      </div>
                      {previewData.facultyNote && (
                        <div className="finance-note">{previewData.facultyNote}</div>
                      )}
                    </div>

                    <div className="finance-card">
                      <div className="finance-title">
                        <Coins size={15} color="#10b981" />
                        <span>เงินสนับสนุน มหาวิทยาลัย</span>
                      </div>
                      <div className="finance-amount">
                        {previewData.uni > 0 ? `${previewData.uni.toLocaleString()} ฿` : "-"}
                      </div>
                    </div>
                  </div>

                  {previewData.dateInfo && (
                    <div className="calendar-tags">
                      <div className="calendar-tag">
                        <CalendarDays size={13} color="#2563eb" />
                        <span>{previewData.dateInfo.beLabel}</span>
                      </div>
                      <div className="calendar-tag">
                        <span>{previewData.dateInfo.acadLabel}</span>
                      </div>
                      <div className="calendar-tag">
                        <span>{previewData.dateInfo.workloadLabel || previewData.dateInfo.fiscalLabel}</span>
                      </div>
                      <div className="calendar-tag">
                        <span>{previewData.dateInfo.fiscalLabel}</span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleSave}
                    className="btn-primary-action"
                  >
                    <Plus size={18} />
                    บันทึกผลงานลงระบบ
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Dashboard Tab */}
        {tab === "dashboard" && (
          <div className="dashboard-container">
            {/* 4 Stat Cards */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon-wrapper stat-icon-primary">
                  <BookMarked size={24} />
                </div>
                <div>
                  <div className="stat-label">ผลงานทั้งหมด</div>
                  <div className="stat-value">{totals.count} <span className="stat-unit">รายการ</span></div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon-wrapper stat-icon-blue">
                  <Clock size={24} />
                </div>
                <div>
                  <div className="stat-label">ชั่วโมงภาระงานรวม</div>
                  <div className="stat-value">{totals.hours} <span className="stat-unit">ชม.</span></div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon-wrapper stat-icon-success">
                  <Coins size={24} />
                </div>
                <div>
                  <div className="stat-label">งบประมาณรวม</div>
                  <div className="stat-value">{(totals.faculty + totals.uni).toLocaleString()} <span className="stat-unit">บาท</span></div>
                </div>
              </div>
            </div>

            {/* List of Entries */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">รายการผลงานวิชาการที่บันทึก</h3>
                <span style={{ fontSize: 12, color: "#64748b" }}>{entries.length} รายการ</span>
              </div>

              {entries.length === 0 ? (
                <div className="preview-empty">
                  <BookMarked size={32} className="preview-empty-icon" />
                  <p className="preview-empty-title">ยังไม่มีข้อมูลผลงานที่ถูกบันทึก</p>
                </div>
              ) : (
                <div className="entries-list">
                  {entries.map(e => (
                    <div key={e.id} className="entry-card">
                      <div>
                        <div className="entry-heading">
                          <span className="entry-code-badge">{e.code}</span>
                          <h4 className="entry-type-title">{e.type}</h4>
                        </div>
                        <div className="entry-meta-row">
                          <span>ฐานข้อมูล: <b>{e.db}</b></span>
                          <span>สัดส่วน: <b>{e.proportion}%</b></span>
                          <span>ชั่วโมงภาระงาน: <b style={{ color: "#2563eb" }}>{e.actualHours} ชม.</b></span>
                          {e.date && <span>วันที่: {e.date}</span>}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(e.id)}
                        title="ลบรายการ"
                        className="btn-delete"
                      >
                        <Trash2 size={15} />
                        ลบ
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Floating Toast Notification */}
      {toast && (
        <div className="toast-pill">
          <CheckCircle2 size={16} color="#4ade80" />
          {toast}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AcademicWorkloadMain />
    </AuthProvider>
  );
}