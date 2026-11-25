import { useEffect, useState } from 'react'
import { ArrowLeftIcon } from '../components/Icons'

const statusLabels = {
  registered: 'Chưa tiếp nhận',
  waiting: 'Chờ khám',
  called: 'Đã gọi',
  in_progress: 'Đang khám',
  waiting_result: 'Chờ kết quả',
  completed: 'Hoàn thành',
  absent: 'Vắng mặt',
}

function DoctorAppointments({ user, onBack, onViewPatient }) {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('upcoming')

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/appointments', {
          headers: { Authorization: `Bearer ${user.token}` },
        })
        const data = await response.json()
        if (response.ok) setAppointments(data.appointments || [])
      } catch (error) {
        console.error('Không thể tải lịch khám:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.token])

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = appointments.filter((a) => a.visit_date >= today && a.status !== 'completed')
  const completed = appointments.filter((a) => a.status === 'completed')
  const todayAppts = appointments.filter((a) => a.visit_date === today)
  const filtered =
    filter === 'upcoming' ? upcoming
      : filter === 'completed' ? completed
      : filter === 'today' ? todayAppts
      : appointments

  return (
    <div className="feature-page">
      <div className="feature-container">
        <button className="back-button" onClick={onBack}>
          <ArrowLeftIcon size={16} />
          <span>Quay lại trang tổng quan</span>
        </button>

        <div className="feature-header">
          <div>
            <h1>Lịch khám & Tái khám bệnh nhân</h1>
            <p>Theo dõi danh sách các cuộc hẹn khám chuyên khoa tim mạch được xếp trước.</p>
          </div>
          <div className="doctor-avatar">BS</div>
        </div>

        <div className="doctor-appointment-summary">
          <div className="doctor-appointment-stat"><span>Tổng lịch khám</span><strong>{appointments.length}</strong></div>
          <div className="doctor-appointment-stat"><span>Hôm nay</span><strong>{todayAppts.length}</strong></div>
          <div className="doctor-appointment-stat"><span>Sắp tới</span><strong>{upcoming.length}</strong></div>
          <div className="doctor-appointment-stat"><span>Đã hoàn thành</span><strong>{completed.length}</strong></div>
        </div>

        <div className="patient-filter-bar">
          {[
            { key: 'upcoming', label: `Sắp tới (${upcoming.length})` },
            { key: 'today', label: `Hôm nay (${todayAppts.length})` },
            { key: 'completed', label: `Đã xong (${completed.length})` },
            { key: 'all', label: `Tất cả (${appointments.length})` },
          ].map((f) => (
            <button key={f.key} className={filter === f.key ? 'filter-btn active' : 'filter-btn'} onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>

        <section className="feature-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: 'var(--slate-50)', borderBottom: '1.5px solid var(--slate-200)', color: 'var(--slate-500)', fontSize: '12px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '14px 20px' }}>Ngày khám</th>
                  <th style={{ padding: '14px 20px' }}>Bệnh nhân</th>
                  <th style={{ padding: '14px 20px' }}>Nội dung</th>
                  <th style={{ padding: '14px 20px' }}>Trạng thái</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: 'var(--slate-400)' }}>Đang tải lịch khám...</td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: 'var(--slate-400)' }}>Không có lịch khám</td></tr>
                )}
                {filtered.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <strong style={{ display: 'block', color: 'var(--slate-900)' }}>{item.visit_date}</strong>
                      <span style={{ fontSize: '12px', color: 'var(--slate-400)' }}>{item.specialty}</span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="small-avatar" style={{ width: '36px', height: '36px', fontSize: '12px' }}>
                          {(item.patient_name || '??').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <strong style={{ display: 'block', color: 'var(--slate-900)' }}>{item.patient_name}</strong>
                          <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 'bold' }}>{item.patient_code || 'Chưa cấp mã'}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--slate-700)' }}>
                      {item.reason}
                      {item.icd_code && <div style={{ fontSize: 11, color: 'var(--slate-400)', marginTop: 4 }}>{item.icd_code} · {item.icd_description}</div>}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span className={item.status === 'completed' ? 'normal-badge' : 'alert-badge'} style={{ background: item.status === 'completed' ? 'var(--success-100)' : 'var(--primary-100)', color: item.status === 'completed' ? 'var(--success-700)' : 'var(--primary-700)' }}>
                        ● {statusLabels[item.status] || item.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <button
                        onClick={() => onViewPatient && onViewPatient({ fullName: item.patient_name, patientCode: item.patient_code })}
                        style={{ padding: '6px 14px', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-md)', background: 'white', color: 'var(--primary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Hồ sơ →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

export default DoctorAppointments
