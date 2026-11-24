import { useState } from 'react'
import {
  HeartIcon,
  UserIcon,
  StethoscopeIcon,
  FileTextIcon
} from '../components/Icons'

function Register({ onBackToLogin }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState('patient')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e) => {
    e.preventDefault()
    setMessage('')

    if (password !== confirmPassword) {
      setMessage('Mật khẩu xác nhận không khớp!')
      return
    }

    if (password.length < 6) {
      setMessage('Mật khẩu phải có ít nhất 6 ký tự!')
      return
    }

    try {
      setLoading(true)

      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName,
          ...(role === 'patient' ? {} : { email }),
          password,
          role,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage(data.message || 'Đăng ký thất bại!')
        return
      }

      alert(
        role === 'patient'
          ? `Đăng ký thành công! Mã bệnh nhân của bạn là: ${data.user.patientCode}. Hãy dùng mã này để đăng nhập hệ thống.`
          : 'Đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay.'
      )

      onBackToLogin()
    } catch (error) {
      console.error(error)
      setMessage('Không thể kết nối tới server!')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: '520px' }}>
        <div className="logo">
          <div className="heart">
            <HeartIcon size={24} />
          </div>
          <h1>CRE-HINT</h1>
        </div>

        <h2>Đăng ký tài khoản mới</h2>
        <p className="subtitle">
          Tạo tài khoản quản lý theo dõi suy tim hoặc nhân sự y tế
        </p>

        {message && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--danger-50)',
              border: '1px solid var(--danger-200)',
              color: 'var(--danger-700)',
              fontSize: '13.5px',
              fontWeight: '600',
              marginBottom: '18px'
            }}
          >
            ⚠ {message}
          </div>
        )}

        {/* Role Selector Tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            background: 'var(--slate-100)',
            padding: '4px',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '20px'
          }}
        >
          <button
            type="button"
            onClick={() => setRole('patient')}
            style={{
              padding: '8px',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              background: role === 'patient' ? 'white' : 'transparent',
              color: role === 'patient' ? 'var(--primary)' : 'var(--slate-600)',
              fontWeight: 'bold',
              fontSize: '13px',
              boxShadow: role === 'patient' ? 'var(--shadow-xs)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <UserIcon size={14} />
            <span>Bệnh nhân</span>
          </button>

          <button
            type="button"
            onClick={() => setRole('doctor')}
            style={{
              padding: '8px',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              background: role === 'doctor' ? 'white' : 'transparent',
              color: role === 'doctor' ? 'var(--primary)' : 'var(--slate-600)',
              fontWeight: 'bold',
              fontSize: '13px',
              boxShadow: role === 'doctor' ? 'var(--shadow-xs)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <StethoscopeIcon size={14} />
            <span>Bác sĩ</span>
          </button>

          <button
            type="button"
            onClick={() => setRole('receptionist')}
            style={{
              padding: '8px',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              background: role === 'receptionist' ? 'white' : 'transparent',
              color: role === 'receptionist' ? 'var(--primary)' : 'var(--slate-600)',
              fontWeight: 'bold',
              fontSize: '13px',
              boxShadow: role === 'receptionist' ? 'var(--shadow-xs)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <FileTextIcon size={14} />
            <span>Tiếp đón</span>
          </button>
        </div>

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label>Họ và tên đầy đủ</label>
            <input
              type="text"
              placeholder="Ví dụ: Nguyễn Văn An"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          {role !== 'patient' && (
            <div className="form-group">
              <label>Địa chỉ email công vụ</label>
              <input
                type="email"
                placeholder="bacsi@bvtim.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>Mật khẩu khởi tạo</label>
            <input
              type="password"
              placeholder="Tối thiểu 6 ký tự"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Xác nhận lại mật khẩu</label>
            <input
              type="password"
              placeholder="Nhập lại mật khẩu vừa tạo"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button className="login-button" type="submit" disabled={loading} style={{ marginTop: '12px' }}>
            {loading ? 'Đang tạo tài khoản...' : 'Hoàn tất đăng ký'}
          </button>
        </form>

        <div className="register-login-link">
          <span>Đã có tài khoản?</span>
          <button type="button" onClick={onBackToLogin}>
            Đăng nhập ngay
          </button>
        </div>
      </div>
    </div>
  )
}

export default Register
