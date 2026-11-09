import { useState } from 'react'

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
        <button className="back-button" onClick={onBack}>← Quay lại tổng quan</button>
        <div className="feature-header">
          <div>
            <h1>Đăng ký khám</h1>
            <p>Gửi yêu cầu khám và theo dõi trạng thái tiếp nhận.</p>
          </div>
        </div>
        <form className="feature-card booking-form" onSubmit={submit}>
          <div className="form-grid">
            <label>Ngày khám<input type="date" name="visitDate" value={form.visitDate} onChange={update} required /></label>
            <label>Chuyên khoa<select name="specialty" value={form.specialty} onChange={update}><option>Tim mạch</option><option>Nội tổng quát</option><option>Khám suy tim</option></select></label>
            <label>Bác sĩ mong muốn<select name="doctorId" value={form.doctorId} onChange={update}><option value="">Bất kỳ bác sĩ phụ trách</option></select></label>
          </div>
          <label>Lý do khám<textarea name="reason" value={form.reason} onChange={update} placeholder="Mô tả ngắn lý do khám" required /></label>
          {message && <div className="register-error">{message}</div>}
          <div className="form-actions"><button type="button" className="cancel-button" onClick={onBack}>Hủy</button><button className="save-button" disabled={saving}>{saving ? 'Đang gửi...' : 'Gửi đăng ký khám'}</button></div>
        </form>
      </div>
    </div>
  )
}

export default VisitBooking
