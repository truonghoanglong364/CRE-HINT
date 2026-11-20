import { useState } from 'react'
import { ArrowLeftIcon } from '../components/Icons'

function Profile({ user, onBack }) {
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState('Nam')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSave = async (e) => {
    e.preventDefault()
    setMessage('')

    try {
      setLoading(true)
      const response = await fetch(
        `/api/patients/${user.id}/profile`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dateOfBirth,
            gender,
            phone,
            address,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setMessage(data.message || 'Không thể cập nhật hồ sơ!')
        return
      }

      setMessage('Cập nhật hồ sơ bệnh nhân thành công!')
    } catch (error) {
      console.error(error)
      setMessage('Không thể kết nối tới server!')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="profile-page">
      <div className="profile-container narrow-container">
        <button className="back-button" onClick={onBack}>
          <ArrowLeftIcon size={16} />
          <span>Quay lại trang tổng quan</span>
        </button>

        <div className="profile-header">
          <div>
            <h1>Hồ sơ thông tin cá nhân</h1>
            <p>Cập nhật thông tin định danh, ngày sinh và số điện thoại liên lạc khẩn cấp.</p>
          </div>

          <div className="patient-avatar" style={{ width: '48px', height: '48px' }}>
            {user?.fullName?.slice(0, 2).toUpperCase() || 'BN'}
          </div>
        </div>

        {message && (
          <div
            style={{
              padding: '12px 18px',
              borderRadius: 'var(--radius-md)',
              background: message.includes('thành công') ? 'var(--success-50)' : 'var(--danger-50)',
              border: `1px solid ${message.includes('thành công') ? 'var(--success-200)' : 'var(--danger-200)'}`,
              color: message.includes('thành công') ? 'var(--success-700)' : 'var(--danger-700)',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '20px'
            }}
          >
            {message}
          </div>
        )}

        <form className="feature-card" onSubmit={handleSave}>
          <div style={{ padding: '16px', background: 'var(--slate-50)', borderRadius: 'var(--radius-lg)', marginBottom: '20px' }}>
            <strong style={{ fontSize: '15px', color: 'var(--slate-900)', display: 'block' }}>{user?.fullName}</strong>
            <span style={{ fontSize: '13px', color: 'var(--slate-500)' }}>
              Mã bệnh nhân: <strong>{user?.patientCode || 'Chưa cấp'}</strong> · Email: {user?.email || 'Chưa thiết lập'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <div className="form-group">
              <label>Ngày tháng năm sinh</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Giới tính</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Khác">Khác</option>
              </select>
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Số điện thoại liên hệ (Khẩn cấp)</label>
              <input
                type="tel"
                placeholder="Ví dụ: 0912 345 678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Địa chỉ nơi cư trú</label>
              <input
                type="text"
                placeholder="Ví dụ: Số 12 Đường Giải Phóng, Hai Bà Trưng, Hà Nội"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onBack}>
              Hủy
            </button>
            <button className="save-button" disabled={loading} type="submit">
              {loading ? 'Đang lưu...' : 'Lưu thay đổi hồ sơ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Profile
