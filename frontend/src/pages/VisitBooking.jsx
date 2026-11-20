import { useState } from 'react'
import { ArrowLeftIcon } from '../components/Icons'

function VisitBooking({ user, onBack, onCreated }) {
  const [today] = useState(() => new Date().toISOString().slice(0, 10))
  const [form, setForm] = useState({
    visitDate: today,
    specialty: 'Tim mạch',
    doctorId: '',
    reason: '',
  })
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value })

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const response = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({ ...form, doctorId: form.doctorId || null }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Không thể đăng ký khám')
      onCreated(data.visit)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="feature-page">
      <div className="feature-container narrow-container">
        <button className="back-button" onClick={onBack}>
          <ArrowLeftIcon size={16} />
          <span>Quay lại trang tổng quan</span>
        </button>

        <div className="feature-header">
          <div>
            <h1>Đăng ký khám chuyên khoa tim mạch</h1>
            <p>Chọn ngày khám mong muốn và gửi lý do để bệnh viện chuẩn bị tiếp đón.</p>
          </div>
        </div>

        {message && (
          <div
            style={{
              padding: '12px 18px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--danger-50)',
              border: '1px solid var(--danger-200)',
              color: 'var(--danger-700)',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '20px'
            }}
          >
            ⚠ {message}
          </div>
        )}

        <form className="feature-card" onSubmit={submit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group">
              <label>Ngày bạn muốn đến khám</label>
              <input
                type="date"
                name="visitDate"
                value={form.visitDate}
                min={today}
                onChange={update}
                required
              />
            </div>

            <div className="form-group">
              <label>Chuyên khoa khám bệnh</label>
              <select name="specialty" value={form.specialty} onChange={update}>
                <option>Tim mạch</option>
                <option>Nội tổng quát</option>
                <option>Khám suy tim chuyên sâu</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Bác sĩ mong muốn (Tùy chọn)</label>
            <select name="doctorId" value={form.doctorId} onChange={update}>
              <option value="">Bác sĩ chuyên khoa phụ trách theo ca</option>
              <option value="2">BS. Nguyễn Minh Tuấn (Chuyên gia Suy tim)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Lý do khám hoặc triệu chứng khó chịu gần đây</label>
            <textarea
              name="reason"
              value={form.reason}
              onChange={update}
              placeholder="Ví dụ: Tái khám định kỳ, khó thở tăng khi nằm, phù 2 cẳng chân 3 ngày nay..."
              required
            />
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onBack}>
              Hủy bỏ
            </button>
            <button className="save-button" disabled={saving} type="submit">
              {saving ? 'Đang gửi đăng ký...' : 'Xác nhận đăng ký khám'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default VisitBooking
