import { useEffect, useState } from 'react'

const labels = { registered: 'Chờ tiếp nhận', waiting: 'Đã xếp hàng', called: 'Đã gọi', in_progress: 'Đang khám', waiting_result: 'Chờ kết quả', completed: 'Hoàn thành', absent: 'Vắng mặt' }

function ReceptionDashboard({ user, onLogout }) {
  const [visits, setVisits] = useState([])
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [message, setMessage] = useState('')
  const [showDirectVisit, setShowDirectVisit] = useState(false)
  const [form, setForm] = useState({ patientEmail: '', specialty: 'Tim mạch', reason: '', room: 'Phòng khám Tim mạch 01' })

  const load = async () => {
    const response = await fetch(`/api/visits/queue?date=${date}`, { headers: { Authorization: `Bearer ${user.token}` } })
    const data = await response.json()
    setVisits(data.visits || [])
  }

  useEffect(() => { load().catch((error) => setMessage(error.message)) }, [date])

  const checkIn = async (id) => {
    const response = await fetch(`/api/visits/${id}/check-in`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` }, body: JSON.stringify({ room: form.room }) })
    if (!response.ok) { const data = await response.json(); setMessage(data.message || 'Không thể tiếp nhận lượt khám'); return }
    await load()
  }

  const createDirectVisit = async (event) => {
    event.preventDefault()
    const response = await fetch('/api/visits/reception', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` }, body: JSON.stringify({ ...form, visitDate: date }) })
    const data = await response.json()
    if (!response.ok) { setMessage(data.message || 'Không thể tạo lượt khám'); return }
    setMessage('Đã tạo lượt khám trực tiếp thành công.')
    setForm({ ...form, patientEmail: '', reason: '' })
    setShowDirectVisit(false)
    await load()
  }

  return <div className="dashboard-page"><aside className="sidebar"><div className="sidebar-logo"><span>♥</span><h2>CRE-HINT</h2></div><nav><button className="nav-item active">▣ Quản lý lượt khám</button><button className="nav-item" onClick={load}>↻ Làm mới danh sách</button></nav><button className="logout-button" onClick={onLogout}>Đăng xuất</button></aside><main className="dashboard-main"><header className="dashboard-header"><div><p className="welcome">Xin chào,</p><h1>{user.fullName} 👋</h1><p>Xác nhận bệnh nhân đến, cấp số và tạo lượt khám trực tiếp.</p></div><div className="doctor-avatar">YT</div></header><section className="doctor-panel"><div className="doctor-panel-heading"><div><h2>Lịch đăng ký khám</h2><p>Những bệnh nhân đã đăng ký trong ngày được chọn.</p></div><div className="reception-actions"><input className="date-filter" type="date" value={date} onChange={(event) => setDate(event.target.value)} /><button className="primary-action" onClick={() => setShowDirectVisit(!showDirectVisit)}>+ Tạo lượt trực tiếp</button></div></div>{showDirectVisit && <form className="direct-visit-form" onSubmit={createDirectVisit}><h3>Tạo lượt khám cho bệnh nhân đến trực tiếp</h3><div className="form-grid"><label>Email bệnh nhân<input type="email" value={form.patientEmail} onChange={(event) => setForm({ ...form, patientEmail: event.target.value })} placeholder="email bệnh nhân đã đăng ký" required /></label><label>Phòng khám<input value={form.room} onChange={(event) => setForm({ ...form, room: event.target.value })} required /></label><label>Chuyên khoa<select value={form.specialty} onChange={(event) => setForm({ ...form, specialty: event.target.value })}><option>Tim mạch</option><option>Nội tổng quát</option><option>Khám suy tim</option></select></label><label>Lý do khám<input value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} required /></label></div><button className="save-button">Tạo lượt khám</button></form>}{message && <div className="register-error">{message}</div>}{visits.length === 0 && <div className="empty-alert"><h3>Chưa có lượt khám</h3><p>Danh sách đăng ký của ngày này đang trống.</p></div>}{visits.map((visit) => <div className="reception-row" key={visit.id}><div><strong>{visit.patient_name}</strong><p>{visit.patient_code || 'Chưa có mã'} · {visit.specialty}</p><small>{visit.reason}</small></div><span className={`visit-status status-${visit.status}`}>{labels[visit.status]}</span>{visit.room && <span className="room-label">{visit.room}</span>}{visit.status === 'registered' && <button className="primary-action" onClick={() => checkIn(visit.id)}>Xác nhận đã đến & cấp số</button>}{visit.queue_number && <span className="queue-number small-queue-number">{visit.queue_number}</span>}</div>)}</section></main></div>
}

export default ReceptionDashboard
