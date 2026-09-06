import { useState, useEffect, useCallback } from "react";

const API_BASE = "http://localhost:5000/api";

const ROLES = ["First author", "Corresponding author", "Co-author"];

const ROLE_BADGE = {
  "First author": { bg: "#fef9c3", color: "#854d0e", label: "First Author" },
  "Corresponding author": { bg: "#dbeafe", color: "#1e40af", label: "Corresponding Author" },
  "Co-author": { bg: "#f0fdf4", color: "#15803d", label: "Co-Author" },
};

function getToken() {
  return localStorage.getItem("token") || "";
}

function authHeaders() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` };
}

/* ─── Badge แสดงบทบาท ─── */
function RoleBadge({ role }) {
  const style = ROLE_BADGE[role] || { bg: "#f3f4f6", color: "#374151", label: role };
  return (
    <span style={{
      background: style.bg, color: style.color, fontWeight: 600,
      fontSize: 12, padding: "2px 10px", borderRadius: 20, display: "inline-block"
    }}>
      {style.label}
    </span>
  );
}

/* ─── Progress Bar สัดส่วนรวม ─── */
function ProportionBar({ authors }) {
  const total = authors.reduce((s, a) => s + (Number(a.proportion) || 0), 0);
  const barColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
  let offset = 0;
  return (
    <div style={{ marginTop: 12, marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
        <span style={{ fontWeight: 600 }}>สัดส่วนรวม: {total.toFixed(1)}%</span>
        <span style={{ color: total > 100 ? "#ef4444" : total === 100 ? "#10b981" : "#6b7280" }}>
          {total > 100 ? "❌ เกิน 100%!" : total === 100 ? "✅ ครบ 100%" : `เหลือ ${(100 - total).toFixed(1)}%`}
        </span>
      </div>
      <div style={{ background: "#e5e7eb", borderRadius: 8, height: 14, overflow: "hidden", display: "flex" }}>
        {authors.map((a, i) => {
          const w = Math.min((Number(a.proportion) || 0), 100 - offset);
          offset += w;
          return w > 0 ? (
            <div key={a.user_id || i} style={{ width: `${w}%`, background: barColors[i % barColors.length], transition: "width .3s" }}
              title={`${a.full_name || "?"}: ${a.proportion}%`} />
          ) : null;
        })}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
        {authors.map((a, i) => (
          <div key={a.user_id || i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#374151" }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: barColors[i % barColors.length] }} />
            {a.full_name || a.email}: {a.proportion || 0}%
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Card โครงการ ─── */
function ProjectCard({ project, currentUserId, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [proportionInputs, setProportionInputs] = useState({});
  const [msg, setMsg] = useState(null);

  const myAuthor = project.authors?.find(a => a.user_id == currentUserId);
  const isConfirmed = project.status === "confirmed";
  const allConfirmed = project.authors?.every(a => a.is_confirmed);

  const totalNow = project.authors?.reduce((s, a) => s + (Number(a.proportion) || 0), 0) || 0;
  const myProportion = Number(myAuthor?.proportion || 0);
  const remainingForMe = 100 - (totalNow - myProportion);

  const handleProportionChange = (userId, val) => {
    setProportionInputs(p => ({ ...p, [userId]: val }));
  };

  const handleUpdateProportion = async (userId) => {
    const val = proportionInputs[userId];
    if (val === undefined || val === "") return;
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`${API_BASE}/projects/${project.id}/proportion`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ userId, proportion: Number(val) }),
      });
      const data = await res.json();
      setMsg({ type: data.success ? "success" : "error", text: data.message });
      if (data.success) { setProportionInputs(p => ({ ...p, [userId]: "" })); onRefresh(); }
    } catch {
      setMsg({ type: "error", text: "เกิดข้อผิดพลาดในการเชื่อมต่อ" });
    } finally { setLoading(false); }
  };

  const handleConfirm = async () => {
    if (!window.confirm("ยืนยันสัดส่วนของคุณใช่หรือไม่? หลังกดยืนยันแล้ว จะต้องรอให้ผู้อื่นยืนยันก่อนแก้ไขใหม่")) return;
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`${API_BASE}/projects/${project.id}/confirm`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ userId: currentUserId }),
      });
      const data = await res.json();
      setMsg({ type: data.success ? "success" : "error", text: data.message });
      if (data.success) onRefresh();
    } catch {
      setMsg({ type: "error", text: "เกิดข้อผิดพลาดในการเชื่อมต่อ" });
    } finally { setLoading(false); }
  };

  const statusColor = isConfirmed ? "#10b981" : "#f59e0b";
  const statusLabel = isConfirmed ? "✅ ยืนยันครบทุกคน - บันทึกแล้ว" : "⏳ รอการยืนยัน";

  return (
    <div style={{
      border: `2px solid ${isConfirmed ? "#10b981" : "#e5e7eb"}`,
      borderRadius: 12, padding: 20, marginBottom: 20,
      background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,.07)"
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#1e3a8a" }}>{project.title}</div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{project.type} {project.db ? `· ${project.db}` : ""}</div>
        </div>
        <span style={{
          background: isConfirmed ? "#d1fae5" : "#fef3c7", color: statusColor,
          fontWeight: 600, fontSize: 12, padding: "4px 12px", borderRadius: 20
        }}>{statusLabel}</span>
      </div>

      {/* Progress Bar */}
      <ProportionBar authors={project.authors || []} />

      {/* รายชื่อผู้ร่วมวิจัย */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12, fontSize: 14 }}>
        <thead>
          <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
            <th style={{ padding: "6px 10px" }}>ผู้ร่วมวิจัย</th>
            <th style={{ padding: "6px 10px" }}>บทบาท</th>
            <th style={{ padding: "6px 10px", textAlign: "right" }}>สัดส่วน</th>
            <th style={{ padding: "6px 10px", textAlign: "center" }}>สถานะ</th>
            {!isConfirmed && myAuthor && <th style={{ padding: "6px 10px" }}>แก้ไข</th>}
          </tr>
        </thead>
        <tbody>
          {project.authors?.map(a => (
            <tr key={a.id} style={{ borderBottom: "1px solid #f3f4f6", background: a.user_id == currentUserId ? "#eff6ff" : "transparent" }}>
              <td style={{ padding: "8px 10px", fontWeight: a.user_id == currentUserId ? 700 : 400 }}>
                {a.full_name || a.email}
                {a.user_id == currentUserId && <span style={{ fontSize: 11, color: "#3b82f6", marginLeft: 4 }}>(คุณ)</span>}
              </td>
              <td style={{ padding: "8px 10px" }}><RoleBadge role={a.role_name} /></td>
              <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: Number(a.proportion) > 0 ? "#1e40af" : "#9ca3af" }}>
                {Number(a.proportion).toFixed(1)}%
              </td>
              <td style={{ padding: "8px 10px", textAlign: "center" }}>
                {a.is_confirmed
                  ? <span style={{ color: "#059669", fontWeight: 600 }}>✅ ยืนยันแล้ว</span>
                  : <span style={{ color: "#d97706" }}>⏳ รอยืนยัน</span>}
              </td>
              {/* ช่องกรอกสัดส่วน (เฉพาะของตัวเองและโปรเจกต์ยังไม่ finalized) */}
              {!isConfirmed && myAuthor && (
                <td style={{ padding: "8px 10px" }}>
                  {a.user_id == currentUserId ? (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        type="number" min={0} max={remainingForMe}
                        placeholder={`0 - ${remainingForMe.toFixed(0)}%`}
                        value={proportionInputs[a.user_id] ?? ""}
                        onChange={e => handleProportionChange(a.user_id, e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleUpdateProportion(a.user_id)}
                        style={{
                          width: 80, padding: "4px 8px", border: "1px solid #d1d5db",
                          borderRadius: 6, fontSize: 13
                        }}
                      />
                      <button onClick={() => handleUpdateProportion(a.user_id)} disabled={loading}
                        style={{
                          background: "#3b82f6", color: "#fff", border: "none",
                          borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12
                        }}>
                        บันทึก
                      </button>
                    </div>
                  ) : <span style={{ color: "#9ca3af", fontSize: 12 }}>—</span>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* ข้อความแจ้งเตือน */}
      {msg && (
        <div style={{
          marginTop: 10, padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
          background: msg.type === "success" ? "#d1fae5" : "#fee2e2",
          color: msg.type === "success" ? "#065f46" : "#991b1b"
        }}>
          {msg.type === "success" ? "✅" : "❌"} {msg.text}
        </div>
      )}

      {/* ปุ่มยืนยัน */}
      {!isConfirmed && myAuthor && !myAuthor.is_confirmed && Number(myAuthor.proportion) > 0 && (
        <button onClick={handleConfirm} disabled={loading}
          style={{
            marginTop: 14, width: "100%", padding: "10px 0", background: "#10b981",
            color: "#fff", fontWeight: 700, fontSize: 14, border: "none", borderRadius: 8, cursor: "pointer"
          }}>
          {loading ? "กำลังดำเนินการ..." : "✅ กดยืนยันสัดส่วนของฉัน"}
        </button>
      )}

      {myAuthor?.is_confirmed && !isConfirmed && (
        <div style={{
          marginTop: 14, padding: "10px", background: "#f0fdf4", borderRadius: 8,
          textAlign: "center", color: "#15803d", fontWeight: 600, fontSize: 13
        }}>
          ✅ คุณยืนยันแล้ว — รอผู้ร่วมวิจัยท่านอื่นยืนยันให้ครบ ({project.authors?.filter(a => a.is_confirmed).length}/{project.authors?.length} คน)
        </div>
      )}
    </div>
  );
}

/* ─── Modal สร้างโครงการใหม่ ─── */
function CreateProjectModal({ onClose, onCreated, allUsers, currentUserId, lookupTable }) {
  const [form, setForm] = useState({ title: "", type: "", db: "" });
  const [selectedAuthors, setSelectedAuthors] = useState([
    { userId: currentUserId, roleName: "First author", proportion: "" }
  ]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const availableTypes = [...new Set(lookupTable.map(r => r.type))];
  const availableDbs = (t) => lookupTable.filter(r => r.type === t).map(r => r.db);

  const addAuthor = () => {
    setSelectedAuthors(p => [...p, { userId: "", roleName: "Co-author", proportion: "" }]);
  };

  const removeAuthor = (i) => {
    setSelectedAuthors(p => p.filter((_, idx) => idx !== i));
  };

  const updateAuthor = (i, key, val) => {
    setSelectedAuthors(p => p.map((a, idx) => idx === i ? { ...a, [key]: val } : a));
  };

  const totalProp = selectedAuthors.reduce((s, a) => s + (Number(a.proportion) || 0), 0);

  const handleSubmit = async () => {
    if (!form.title.trim()) { setMsg({ type: "error", text: "กรุณากรอกชื่อผลงาน" }); return; }
    if (!form.type) { setMsg({ type: "error", text: "กรุณาเลือกประเภทผลงาน" }); return; }
    if (selectedAuthors.some(a => !a.userId)) { setMsg({ type: "error", text: "กรุณาเลือกผู้ร่วมวิจัยให้ครบทุกคน" }); return; }
    if (totalProp > 100) { setMsg({ type: "error", text: `สัดส่วนรวมเกิน 100% (${totalProp}%)` }); return; }

    // ตรวจสอบลำดับบทบาทว่าถูกต้อง
    const roleOrderMap = { "First author": 1, "Corresponding author": 2, "Co-author": 3 };
    const sorted = [...selectedAuthors].sort((a, b) => roleOrderMap[a.roleName] - roleOrderMap[b.roleName]);
    for (let i = 0; i < sorted.length - 1; i++) {
      const p1 = Number(sorted[i].proportion) || 0;
      const p2 = Number(sorted[i + 1].proportion) || 0;
      if (p1 > 0 && p2 > 0 && p1 < p2) {
        setMsg({ type: "error", text: `ลำดับบทบาทไม่ถูกต้อง: ${sorted[i].roleName} (${p1}%) ต้องได้สัดส่วน ≥ ${sorted[i + 1].roleName} (${p2}%)` });
        return;
      }
    }

    setLoading(true);
    try {
      const matchedLookup = lookupTable.find(r => r.type === form.type && r.db === form.db);
      const res = await fetch(`${API_BASE}/projects`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          title: form.title,
          type: form.type,
          db: form.db || null,
          code: matchedLookup?.code || "",
          baseHours: matchedLookup?.hours || 0,
          quality: matchedLookup?.quality || 0,
          faculty: matchedLookup?.faculty || 0,
          facultyNote: matchedLookup?.facultyNote || "",
          uni: matchedLookup?.uni || 0,
          authors: selectedAuthors.map(a => ({
            userId: a.userId,
            roleName: a.roleName,
            proportion: Number(a.proportion) || 0
          }))
        })
      });
      const data = await res.json();
      if (data.success) { onCreated(); onClose(); }
      else setMsg({ type: "error", text: data.message });
    } catch {
      setMsg({ type: "error", text: "เกิดข้อผิดพลาดในการเชื่อมต่อ" });
    } finally { setLoading(false); }
  };

  const usedIds = selectedAuthors.map(a => a.userId);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16
    }}>
      <div style={{
        background: "#fff", borderRadius: 14, padding: 28, maxWidth: 600,
        width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.2)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, color: "#1e3a8a", fontSize: 18 }}>➕ สร้างโครงการวิจัยร่วม</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#6b7280" }}>✕</button>
        </div>

        {/* ชื่อผลงาน */}
        <label style={{ display: "block", fontWeight: 600, fontSize: 14, marginBottom: 4 }}>ชื่อผลงาน *</label>
        <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="ชื่อบทความ / ผลงานวิจัย"
          style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box", marginBottom: 14 }} />

        {/* ประเภท */}
        <label style={{ display: "block", fontWeight: 600, fontSize: 14, marginBottom: 4 }}>ประเภทผลงาน *</label>
        <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, db: "" }))}
          style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, marginBottom: 14 }}>
          <option value="">-- เลือกประเภท --</option>
          {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {/* ฐานข้อมูล */}
        {form.type && (
          <>
            <label style={{ display: "block", fontWeight: 600, fontSize: 14, marginBottom: 4 }}>ฐานข้อมูล</label>
            <select value={form.db} onChange={e => setForm(f => ({ ...f, db: e.target.value }))}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, marginBottom: 20 }}>
              <option value="">-- เลือกฐานข้อมูล --</option>
              {availableDbs(form.type).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </>
        )}

        {/* ผู้ร่วมวิจัย */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <label style={{ fontWeight: 700, fontSize: 14 }}>👥 ผู้ร่วมวิจัย</label>
          <button onClick={addAuthor} style={{
            background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe",
            borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600
          }}>+ เพิ่มผู้ร่วมวิจัย</button>
        </div>

        {/* Progress total */}
        <div style={{
          textAlign: "right", fontSize: 13, marginBottom: 8,
          color: totalProp > 100 ? "#ef4444" : totalProp === 100 ? "#10b981" : "#6b7280", fontWeight: 600
        }}>
          รวม: {totalProp.toFixed(1)}% {totalProp > 100 ? "❌ เกิน!" : totalProp === 100 ? "✅" : ""}
        </div>

        {selectedAuthors.map((a, i) => (
          <div key={i} style={{
            display: "flex", gap: 8, alignItems: "center", marginBottom: 10,
            background: "#f8fafc", padding: "10px 12px", borderRadius: 8, flexWrap: "wrap"
          }}>
            <select value={a.userId} onChange={e => updateAuthor(i, "userId", Number(e.target.value))}
              style={{ flex: 2, minWidth: 140, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}>
              <option value="">-- เลือกผู้ร่วมวิจัย --</option>
              {allUsers.filter(u => u.id == a.userId || !usedIds.includes(u.id))
                .map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
            </select>

            <select value={a.roleName} onChange={e => updateAuthor(i, "roleName", e.target.value)}
              style={{ flex: 2, minWidth: 140, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>

            <input type="number" min={0} max={100} placeholder="%" value={a.proportion}
              onChange={e => updateAuthor(i, "proportion", e.target.value)}
              style={{ width: 72, padding: "6px 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }} />

            {selectedAuthors.length > 1 && (
              <button onClick={() => removeAuthor(i)}
                style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 13 }}>
                ✕
              </button>
            )}
          </div>
        ))}

        {/* กฎเงื่อนไข */}
        <div style={{ background: "#fefce8", border: "1px solid #fde68a", borderRadius: 8, padding: 12, fontSize: 12, color: "#78350f", marginTop: 8, marginBottom: 16 }}>
          <strong>📌 กฎสัดส่วน:</strong> ผลรวมต้องไม่เกิน 100% และ First Author ≥ Corresponding Author ≥ Co-Author
        </div>

        {msg && (
          <div style={{
            marginBottom: 12, padding: "8px 14px", borderRadius: 8, fontSize: 13,
            background: msg.type === "success" ? "#d1fae5" : "#fee2e2",
            color: msg.type === "success" ? "#065f46" : "#991b1b"
          }}>
            {msg.type === "success" ? "✅" : "❌"} {msg.text}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "10px 0", background: "#f3f4f6", color: "#374151",
            fontWeight: 600, fontSize: 14, border: "none", borderRadius: 8, cursor: "pointer"
          }}>ยกเลิก</button>
          <button onClick={handleSubmit} disabled={loading} style={{
            flex: 2, padding: "10px 0", background: "#2563eb", color: "#fff",
            fontWeight: 700, fontSize: 14, border: "none", borderRadius: 8, cursor: "pointer"
          }}>
            {loading ? "กำลังสร้าง..." : "✅ สร้างโครงการ"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Component หลัก ─── */
export default function CollaborativeResearch({ currentUser, lookupTable = [] }) {
  const [projects, setProjects] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState("all"); // all | mine | pending

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/projects`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setProjects(data.data);
    } catch (e) {
      console.error("fetch projects error", e);
    } finally { setLoading(false); }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/projects/collaborators`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setAllUsers(data.data);
    } catch (e) {
      console.error("fetch users error", e);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchUsers();
  }, [fetchProjects, fetchUsers]);

  const currentUserId = currentUser?.id;

  const filteredProjects = projects.filter(p => {
    const isMyProject = p.authors?.some(a => a.user_id == currentUserId);
    if (filter === "mine") return isMyProject;
    if (filter === "pending") return isMyProject && p.status === "pending";
    return true;
  });

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "24px 16px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, color: "#1e3a8a", fontSize: 22 }}>🔬 โครงการวิจัยร่วม</h2>
          <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 14 }}>
            จัดการสัดส่วนผลงานวิจัยร่วมกับทีม พร้อมแจ้งเตือนทางอีเมลอัตโนมัติ
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{
          background: "#2563eb", color: "#fff", fontWeight: 700, fontSize: 14,
          border: "none", borderRadius: 8, padding: "10px 20px", cursor: "pointer"
        }}>
          ➕ สร้างโครงการใหม่
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[["all", "ทั้งหมด"], ["mine", "ของฉัน"], ["pending", "รอการยืนยัน"]].map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)} style={{
            padding: "6px 16px", borderRadius: 20, fontWeight: 600, fontSize: 13, cursor: "pointer",
            border: "1px solid",
            background: filter === key ? "#2563eb" : "#f9fafb",
            color: filter === key ? "#fff" : "#374151",
            borderColor: filter === key ? "#2563eb" : "#e5e7eb",
          }}>{label}</button>
        ))}
      </div>

      {/* รายการโครงการ */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>กำลังโหลด...</div>
      ) : filteredProjects.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af", background: "#f9fafb", borderRadius: 12 }}>
          ยังไม่มีโครงการวิจัยร่วม กดปุ่ม "สร้างโครงการใหม่" เพื่อเริ่มต้น
        </div>
      ) : (
        filteredProjects.map(p => (
          <ProjectCard key={p.id} project={p} currentUserId={currentUserId} onRefresh={fetchProjects} />
        ))
      )}

      {/* Modal สร้างโครงการ */}
      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={fetchProjects}
          allUsers={allUsers}
          currentUserId={currentUserId}
          lookupTable={lookupTable}
        />
      )}
    </div>
  );
}
