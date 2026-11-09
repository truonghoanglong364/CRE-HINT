import { useState } from 'react'

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

      alert(role === 'patient'
        ? `Đăng ký thành công! Mã bệnh nhân của bạn là ${data.user.patientCode}. Hãy dùng mã này để đăng nhập.`
        : 'Đăng ký tài khoản thành công!')

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
      <div className="login-card register-card">

        <div className="logo">
          <div className="heart">♥</div>
          <h1>CRE-HINT</h1>
        </div>

        <h2>Tạo tài khoản</h2>

        <p className="subtitle">
          Đăng ký để sử dụng hệ thống quản lý bệnh nhân suy tim
        </p>

        <form onSubmit={handleRegister}>

          <div className="form-group">
            <label>Họ và tên</label>

            <input
              type="text"
              placeholder="Nhập họ và tên"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          {role !== 'patient' && <div className="form-group">
            <label>Email</label>
            <input type="email" placeholder="Nhập địa chỉ email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>}

          {role === 'patient' && <div className="register-info">Mã bệnh nhân sẽ được hệ thống cấp tự động sau khi đăng ký. Bạn dùng mã này để đăng nhập.</div>}

          <div className="form-group">
            <label>Mật khẩu</label>

            <input
              type="password"
              placeholder="Ít nhất 6 ký tự"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Xác nhận mật khẩu</label>

            <input
              type="password"
              placeholder="Nhập lại mật khẩu"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Vai trò</label>

            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            >
              <option value="patient">Bệnh nhân</option>
              <option value="doctor">Bác sĩ</option>
              <option value="receptionist">Nhân viên y tế</option>
            </select>
          </div>

          {message && (
            <div className="register-error">
              {message}
            </div>
          )}

          <button
            className="login-button"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Đang đăng ký...' : 'Đăng ký'}
          </button>

        </form>

        <div className="register-login-link">
          <span>Đã có tài khoản?</span>

          <button type="button" onClick={onBackToLogin}>
            Đăng nhập
          </button>
        </div>

        <p className="footer">
          CRE-HINT · Heart Failure Patient Management System
        </p>

      </div>
    </div>
  )
}

export default Register
