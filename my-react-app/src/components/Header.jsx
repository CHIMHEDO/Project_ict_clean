import React from 'react';
import { BookMarked, Calculator, LayoutDashboard, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Header({ tab, setTab, entriesCount }) {
  const { user, logout } = useAuth();

  const getRoleDisplayName = (role, programName) => {
    switch (role) {
      case 'admin':
        return 'ผู้ดูแลระบบ';
      case 'executive':
        return 'ผู้บริหาร';
      case 'chair':
        return 'ประธานหลักสูตร';
      default:
        return programName || role || 'ผู้ใช้งาน';
    }
  };

  return (
    <header className="app-header">
      <div className="header-container">
        {/* Brand section */}
        <div className="brand-section">
          <div className="brand-icon">
            <BookMarked size={22} />
          </div>
          <div>
            <h1 className="brand-title">ระบบบันทึกภาระงานวิชาการ</h1>
            <p className="brand-subtitle">Academic Workload & Output Calculator</p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          {/* Segmented Tab Switcher */}
          <div className="tab-switcher">
            <button
              onClick={() => setTab("form")}
              className={`tab-btn ${tab === "form" ? "active" : ""}`}
            >
              <Calculator size={16} />
              กรอกข้อมูล
            </button>
            <button
              onClick={() => setTab("dashboard")}
              className={`tab-btn ${tab === "dashboard" ? "active" : ""}`}
            >
              <LayoutDashboard size={16} />
              แดชบอร์ด
              <span className="tab-badge">{entriesCount}</span>
            </button>
          </div>

          {/* User Profile & Logout */}
          {user && (
            <div className="user-profile-header">
              <div className="user-info-chip">
                <div className="user-avatar">
                  {user.full_name ? user.full_name.charAt(0) : "U"}
                </div>
                <div className="user-details">
                  <span className="user-name">{user.full_name || user.email}</span>
                  <span className="user-role-badge">
                    {getRoleDisplayName(user.role, user.program_name)}
                  </span>
                </div>
              </div>
              <button onClick={logout} className="btn-logout" title="ออกจากระบบ">
                <LogOut size={15} />
                <span>ออก</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
