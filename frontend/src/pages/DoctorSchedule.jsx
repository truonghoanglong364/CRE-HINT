import { useEffect, useState } from 'react'

const DAY_NAMES = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy']

function DoctorSchedule({ user, onBack }) {
  const [schedules, setSchedules] = useState([])
  const [overrides, setOverrides] = useState([])
  const [form, setForm] = useState({ dayOfWeek: 1, startTime: '07:30', endTime: '11:30', maxPatients: 20 })
  const [overrideForm, setOverrideForm] = useState({ overrideDate: '', reason: '' })
  const [message, setMessage] = useState('')

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` }

  const load = async () => {
    try {
      const res = await fetch('/api/doctor-schedules', { headers })
      const data = await res.json()
      if (res.ok) { setSchedules(data.schedules); setOverrides(data.overrides) }
    } catch (e) { console.error(e) }
  }

  useEffect(() => { load() }, [])

  const saveSlot = async (e) => {
    e.preventDefault()
    const res = await fetch('/api/doctor-schedules', { method: 'POST', headers, body: JSON.stringify(form) })
    if (res.ok) { setMessage('Đã cập nhật lịch làm việc.'); await load() }
  }

  const toggleActive = async (s) => {
    await fetch(`/api/doctor-schedules/${s.id}`, { method: 'PUT', headers, body: JSON.stringify({ startTime: s.start_time, endTime: s.end_time, maxPatients: s.max_patients, isActive: !s.is_active }) })
    await load()
  }

  const deleteSlot = async (id) => {
    await fetch(`/api/doctor-schedules/${id}`, { method: 'DELETE', headers })
    await load()
  }

  const addOverride = async (e) => {
    e.preventDefault()
    if (!overrideForm.overrideDate) return
    const res = await fetch('/api/schedule-overrides', { method: 'POST', headers, body: JSON.stringify({ ...overrideForm, isAvailable: false }) })
    if (res.ok) { setMessage('Đã thêm ngày nghỉ.'); setOverrideForm({ overrideDate: '', reason: '' }); await load() }
  }

  const deleteOverride = async (id) => {
    await fetch(`/api/schedule-overrides/${id}`, { method: 'DELETE', headers })
    await load()
  }

  return (
    <div className="feature-page">
      <div className="feature-container">
        <button className="back-button" onClick={onBack}>← Quay lại tổng quan</button>
        <div className="feature-header">
          <div>
            <h1>Lịch làm việc</h1>
            <p>Thiết lập lịch khám hàng tuần và quản lý ngày nghỉ.</p>
          </div>
        </div>

        {message && <p className="success-message">{message}</p>}

        <section className="feature-card">
          <h2>Lịch khám hàng tuần</h2>
          <p className="muted">Thiết lập giờ khám và số lượng bệnh nhân tối đa cho mỗi ngày.</p>

          <form className="schedule-form" onSubmit={saveSlot}>
            <div className="schedule-form-row">
              <label>
                Ngày
                <select value={form.dayOfWeek} onChange={(e) => setForm({ ...form, dayOfWeek: Number(e.target.value) })}>
                  {DAY_NAMES.map((name, i) => <option key={i} value={i}>{name}</option>)}
                </select>
              </label>
              <label>
                Bắt đầu
                <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
              </label>
              <label>
                Kết thúc
                <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
              </label>
              <label>
                Tối đa BN
                <input type="number" min="1" max="100" value={form.maxPatients} onChange={(e) => setForm({ ...form, maxPatients: Number(e.target.value) })} />
              </label>
              <button type="submit" className="primary-action">Lưu</button>
            </div>
          </form>

          {schedules.length > 0 ? (
            <div className="schedule-table">
              <div className="schedule-table-header">
                <span>Ngày</span><span>Giờ khám</span><span>Tối đa BN</span><span>Trạng thái</span><span></span>
              </div>
              {schedules.map((s) => (
                <div className={`schedule-row ${!s.is_active ? 'schedule-inactive' : ''}`} key={s.id}>
                  <span className="schedule-day">{DAY_NAMES[s.day_of_week]}</span>
                  <span>{s.start_time} – {s.end_time}</span>
                  <span>{s.max_patients} BN</span>
                  <span>
                    <button className={`toggle-btn ${s.is_active ? 'active' : ''}`} onClick={() => toggleActive(s)}>
                      {s.is_active ? 'Hoạt động' : 'Tạm nghỉ'}
                    </button>
                  </span>
                  <span><button className="delete-btn" onClick={() => deleteSlot(s.id)}>Xóa</button></span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ marginTop: 16 }}>Chưa thiết lập lịch khám. Hãy thêm lịch khám cho các ngày trong tuần.</p>
          )}
        </section>

        <section className="feature-card">
          <h2>Ngày nghỉ / Ngoại lệ</h2>
          <p className="muted">Đánh dấu ngày nghỉ hoặc ngày không khám (lễ, hội nghị, nghỉ phép...).</p>

          <form className="schedule-form" onSubmit={addOverride}>
            <div className="schedule-form-row">
              <label>
                Ngày nghỉ
                <input type="date" value={overrideForm.overrideDate} onChange={(e) => setOverrideForm({ ...overrideForm, overrideDate: e.target.value })} />
              </label>
              <label>
                Lý do
                <input type="text" placeholder="VD: Nghỉ lễ, Hội nghị..." value={overrideForm.reason} onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })} />
              </label>
              <button type="submit" className="primary-action">Thêm ngày nghỉ</button>
            </div>
          </form>

          {overrides.length > 0 ? (
            <div className="override-list">
              {overrides.map((o) => (
                <div className="override-item" key={o.id}>
                  <div>
                    <strong>{o.override_date}</strong>
                    <span className="override-reason">{o.reason || 'Không có lý do'}</span>
                  </div>
                  <button className="delete-btn" onClick={() => deleteOverride(o.id)}>Xóa</button>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ marginTop: 16 }}>Chưa có ngày nghỉ nào được đánh dấu.</p>
          )}
        </section>
      </div>
    </div>
  )
}

export default DoctorSchedule
