import { useEffect, useState } from 'react'
import {
  HeartIcon,
  CalendarIcon,
  RefreshCwIcon,
  LogOutIcon,
  PlusIcon,
  ClockIcon,
  CheckCircleIcon,
  UsersIcon
} from '../components/Icons'

const statusLabels = {
  registered: 'Chờ tiếp nhận',
  waiting: 'Đã cấp số & Xếp hàng',
  called: 'Đã gọi vào phòng',
  in_progress: 'Đang khám',
  waiting_result: 'Chờ kết quả',
  completed: 'Hoàn tất khám',
  absent: 'Vắng mặt'
}

function ReceptionDashboard({ user, onLogout }) {
  const [visits, setVisits] = useState([])
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [message, setMessage] = useState('')
  const [showDirectVisit, setShowDirectVisit] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    patientEmail: '',
    specialty: 'Tim mạch',
    reason: '',
    room: 'Phòng khám Tim mạch 01'
  })

  const load = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/visits/queue?date=${date}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      })
      const data = await response.json()
      setVisits(data.visits || [])
    } catch (err) {
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [date])

  const checkIn = async (id) => {
    try {
      const response = await fetch(`/api/visits/${id}/check-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({ room: form.room })
      })
      if (!response.ok) {
        const data = await response.json()
        setMessage(data.message || 'Không thể tiếp nhận lượt khám')
        return
      }
      setMessage('Tiếp nhận bệnh nhân thành công và đã cấp số thứ tự!')
      await load()
    } catch (err) {
      setMessage('Lỗi khi tiếp nhận bệnh nhân')
    }
  }

  const createDirectVisit = async (event) => {
    event.preventDefault()
    try {
      const response = await fetch('/api/visits/reception', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({ ...form, visitDate: date })
      })
      const data = await response.json()
      if (!response.ok) {
        setMessage(data.message || 'Không thể tạo lượt khám')
        return
      }
      setMessage('Đã tạo lượt khám trực tiếp thành công!')
      setForm({ ...form, patientEmail: '', reason: '' })
      setShowDirectVisit(false)
      await load()
    } catch (err) {
      setMessage('Lỗi kết nối khi tạo lượt khám')
    }
  }

  return (
    <div className="dashboard-page">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span>
            <HeartIcon size={22} />
          </span>
          <div>
            <h2>CRE-HINT</h2>
          </div>
        </div>

        <nav>
          <button className="nav-item active">
            <UsersIcon size={18} />
            <span>Tiếp đón bệnh nhân</span>
          </button>
          <button className="nav-item" onClick={load}>
            <RefreshCwIcon size={18} />
            <span>Làm mới danh sách</span>
          </button>
        </nav>

        <button className="logout-button" onClick={onLogout}>
          <LogOutIcon size={16} />
          <span>Đăng xuất</span>
        </button>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="welcome">Quầy tiếp đón & phân luồng</p>
            <h1>{user?.fullName || 'Nhân viên y tế'} 👋</h1>
            <p>Xác nhận bệnh nhân đến, cấp số thứ tự và tạo lượt khám trực tiếp tại quầy.</p>
          </div>

          <div className="doctor-avatar" style={{ background: 'var(--primary-100)', color: 'var(--primary-800)' }}>
            YT
          </div>
        </header>

        {message && (
          <div
            style={{
              padding: '12px 18px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--success-50)',
              border: '1px solid var(--success-200)',
              color: 'var(--success-700)',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '20px'
            }}
          >
            {message}
          </div>
        )}

        <section className="doctor-panel">
          <div className="doctor-panel-heading">
            <div>
              <h2>Danh sách đăng ký khám ngày {date}</h2>
              <p>Bệnh nhân đã đăng ký từ xa hoặc hẹn tái khám cần làm thủ tục tiếp nhận.</p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                className="date-filter"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1.5px solid var(--slate-200)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              />
              <button
                className="primary-action"
                onClick={() => setShowDirectVisit(!showDirectVisit)}
              >
                <PlusIcon size={16} />
                <span>{showDirectVisit ? 'Đóng form' : 'Tạo lượt trực tiếp'}</span>
              </button>
            </div>
          </div>

          {showDirectVisit && (
            <form
              onSubmit={createDirectVisit}
              style={{
                background: 'var(--slate-50)',
                border: '1.5px solid var(--primary-border)',
                borderRadius: 'var(--radius-xl)',
                padding: '24px',
                marginBottom: '24px'
              }}
            >
              <h3 style={{ fontSize: '16px', color: 'var(--slate-900)', marginBottom: '14px' }}>
                Đăng ký khám cho bệnh nhân đến trực tiếp tại quầy
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label>Email bệnh nhân đã có tài khoản</label>
                  <input
                    type="email"
                    value={form.patientEmail}
                    onChange={(e) => setForm({ ...form, patientEmail: e.target.value })}
                    placeholder="ví dụ: patient@gmail.com"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Phòng khám chỉ định</label>
                  <input
                    value={form.room}
                    onChange={(e) => setForm({ ...form, room: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Chuyên khoa khám</label>
                  <select
                    value={form.specialty}
                    onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                  >
                    <option>Tim mạch</option>
                    <option>Nội tổng quát</option>
                    <option>Khám suy tim chuyên sâu</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Lý do / Triệu chứng khi đến khám</label>
                  <input
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    placeholder="Khó thở tăng dần, tái khám định kỳ..."
                    required
                  />
                </div>
              </div>

              <button className="primary-action" type="submit">
                <span>Tạo lượt & Cấp vào danh sách</span>
              </button>
            </form>
          )}

          {loading && (
            <p style={{ color: 'var(--slate-500)', padding: '20px 0' }}>Đang nạp danh sách lượt khám...</p>
          )}

          {!loading && visits.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--slate-400)' }}>
              <ClockIcon size={40} style={{ margin: '0 auto 12px', display: 'block' }} />
              <h3 style={{ fontSize: '16px', color: 'var(--slate-700)', marginBottom: '4px' }}>Chưa có lượt khám nào</h3>
              <p style={{ fontSize: '13px' }}>Không có bệnh nhân đăng ký trong ngày {date}.</p>
            </div>
          )}

          {!loading && visits.map((visit) => (
            <div className="reception-row" key={visit.id}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '16px', color: 'var(--slate-900)' }}>
                    {visit.patient_name}
                  </strong>
                  <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 'bold' }}>
                    {visit.patient_code || 'Chưa cấp mã'}
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--slate-500)', margin: '2px 0' }}>
                  {visit.specialty} {visit.room ? `· ${visit.room}` : ''}
                </p>
                <small style={{ color: 'var(--slate-400)' }}>Lý do: {visit.reason}</small>
              </div>

              <span className={`visit-status status-${visit.status}`}>
                ● {statusLabels[visit.status] || visit.status}
              </span>

              {visit.status === 'registered' && (
                <button
                  className="primary-action"
                  onClick={() => checkIn(visit.id)}
                  style={{ background: 'var(--success)' }}
                >
                  <CheckCircleIcon size={14} />
                  <span>Xác nhận đã đến & Cấp số</span>
                </button>
              )}

              {visit.queue_number && (
                <span className="queue-number small-queue-number">
                  #{visit.queue_number}
                </span>
              )}
            </div>
          ))}
        </section>
      </main>
    </div>
  )
}

export default ReceptionDashboard
