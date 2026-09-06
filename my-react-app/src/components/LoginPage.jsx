import React from 'react';
import { GraduationCap, Sparkles, AlertCircle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ไอคอน Microsoft Logo 4 สีทางการ
export function MicrosoftIcon() {
  return (
    <svg className="ms-logo-icon" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

export default function LoginPage() {
  const { loginWithMicrosoft, isLoggingIn, authError, toast } = useAuth();

  return (
    <div className="login-page-wrapper">
      <div className="login-card">
        <div className="login-header-icon">
          <GraduationCap size={28} />
        </div>

        <span className="login-badge">
          <Sparkles size={13} />
          ระบบประเมินภาระงานวิชาการ
        </span>

        <h1 className="login-title">ยินดีต้อนรับเข้าสู่ระบบ</h1>
        <p className="login-description">
          เข้าใช้งานด้วยบัญชีอีเมลสถาบัน (Microsoft 365) ของมหาวิทยาลัย เพื่อคำนวณและบันทึกผลงาน
        </p>

        {authError && (
          <div className="login-error-alert">
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <div>{authError}</div>
          </div>
        )}

        <button 
          onClick={loginWithMicrosoft} 
          disabled={isLoggingIn}
          className="btn-microsoft"
        >
          <MicrosoftIcon />
          {isLoggingIn ? "กำลังเชื่อมต่อไปยัง Microsoft..." : "Sign in with Microsoft"}
        </button>

        <div className="login-footer-note">
          <ShieldCheck size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
          รองรับการยืนยันตัวตนความปลอดภัยระดับองค์กร (SSO)
        </div>
      </div>

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
