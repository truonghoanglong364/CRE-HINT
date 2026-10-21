import { useState } from 'react'

function Profile({ user, onBack }) {
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()

    try {
      setLoading(true)

      const response = await fetch(
        `http://localhost:3000/api/patients/${user.id}/profile`,
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
        alert(data.message || 'Không thể cập nhật hồ sơ!')
        return
      }

      alert('Cập nhật hồ sơ thành công!')
    } catch (error) {
      console.error(error)
      alert('Không thể kết nối tới server!')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="profile-page">
      <div className="profile-container">

        <button className="back-button" onClick={onBack}>
          ← Quay lại tổng quan
        </button>

        <div className="profile-header">
          <div>
            <h1>Hồ sơ cá nhân</h1>
            <p>Cập nhật thông tin cá nhân của bạn.</p>
          </div>

          <div className="profile-avatar">
            {user?.fullName
              ?.split(' ')
              .slice(-2)
              .map((word) => word[0])
              .join('')
              .toUpperCase()}
          </div>
        </div>

        <form className="profile-card" onSubmit={handleSave}>

          <div className="profile-section">
            <h2>Thông tin tài khoản</h2>

            <div className="profile-grid">

              <div className="form-group">
                <label>Họ và tên</label>
                <input
                  type="text"
                  value={user?.fullName || ''}
                  disabled
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                />
              </div>

            </div>
          </div>

          <div className="profile-section">
            <h2>Thông tin bệnh nhân</h2>

            <div className="profile-grid">

              <div className="form-group">
                <label>Ngày sinh</label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Giới tính</label>

                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="">Chọn giới tính</option>
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              <div className="form-group">
                <label>Số điện thoại</label>
                <input
                  type="tel"
                  placeholder="Nhập số điện thoại"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Địa chỉ</label>
                <input
                  type="text"
                  placeholder="Nhập địa chỉ"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

            </div>
          </div>

          <button
            className="login-button profile-save-button"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>

        </form>

      </div>
    </div>
  )
}

export default Profile