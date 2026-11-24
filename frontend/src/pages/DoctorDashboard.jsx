import { useEffect, useState } from 'react'
import {
  HeartIcon,
  UsersIcon,
  AlertTriangleIcon,
  CalendarIcon,
  ClockIcon,
  LogOutIcon,
  CheckCircleIcon,
  ChevronRightIcon
} from '../components/Icons'

function DoctorDashboard({
  user,
  onLogout,
  onViewPatient,
  onViewPatientList,
  onViewAlerts,
  onViewAppointments,
  onViewQueue,
}) {
  const [patients, setPatients] = useState([])
  const [loadingPatients, setLoadingPatients] = useState(true)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const response = await fetch('/api/patients', {
          headers: { Authorization: `Bearer ${user.token}` },
        })
        const data = await response.json()
        if (response.ok) setPatients(data.patients)
      } catch (error) {
        console.error('Không thể tải dữ liệu bệnh nhân:', error)
      } finally {
        setLoadingPatients(false)
      }
    }

    const loadStats = async () => {
      try {
        const response = await fetch('/api/stats/doctor', {
          headers: { Authorization: `Bearer ${user.token}` },
        })
        const data = await response.json()
        if (response.ok) setStats(data)
      } catch (error) {
        console.error('Không thể tải thống kê:', error)
      }
    }

    loadPatients()
    loadStats()
    const refreshInterval = setInterval(() => { loadPatients(); loadStats() }, 30000)
    return () => clearInterval(refreshInterval)
  }, [user.token])

  const reportingPatients = patients.filter((patient) => patient.weight != null)
  const alertPatients = reportingPatients.filter(hasAbnormalReading)
  const stablePatients = reportingPatients.length - alertPatients.length
  const newestAlert = alertPatients[0]
  const recentPatients = reportingPatients.slice(0, 5)

  return (
    <div className="dashboard-page">
      <aside className="sidebar doctor-sidebar">
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
            <HeartIcon size={18} />
            <span>Tổng quan lâm sàng</span>
          </button>
          <button className="nav-item" onClick={onViewPatientList}>
            <UsersIcon size={18} />
            <span>Hồ sơ bệnh nhân</span>
          </button>
          <button className="nav-item" onClick={onViewAlerts}>
            <AlertTriangleIcon size={18} />
            <span>Cảnh báo bất thường</span>
            {alertPatients.length > 0 && (
              <b className="alert-count">{alertPatients.length}</b>
            )}
          </button>
          <button className="nav-item" onClick={onViewAppointments}>
            <CalendarIcon size={18} />
            <span>Lịch hẹn khám</span>
          </button>
          <button className="nav-item" onClick={onViewQueue}>
            <ClockIcon size={18} />
            <span>Hàng đợi tiếp nhận</span>
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
            <p className="welcome">Trung tâm điều hành tim mạch</p>
            <h1>BS. {user?.fullName || 'Chưa có họ tên'} 👋</h1>
            <p>Giám sát từ xa, triage tự động và hỗ trợ ra quyết định lâm sàng (AI-CDSS).</p>
          </div>

          <div className="doctor-avatar">
            BS
          </div>
        </header>

        {/* Primary KPI Grid */}
        <section className="stats-grid">
          <div className="stat-card">
            <p className="stat-label">Tổng số bệnh nhân</p>
            <p className="stat-value">{stats?.patients?.total ?? patients.length}</p>
            <p className="stat-desc">{stats?.patients?.withVitals ?? reportingPatients.length} bệnh nhân đã kết nối chỉ số</p>
          </div>

          <div className="stat-card stat-success">
            <p className="stat-label">Tình trạng ổn định</p>
            <p className="stat-value">{stablePatients}</p>
            <p className="stat-desc">Sinh hiệu trong ngưỡng an toàn</p>
          </div>

          <div className={`stat-card ${alertPatients.length > 0 ? 'stat-alert' : ''}`}>
            <p className="stat-label">Cảnh báo cần can thiệp</p>
            <p className="stat-value">{stats?.patients?.abnormal ?? alertPatients.length}</p>
            <p className="stat-desc">Phát hiện bất thường hoặc tích dịch</p>
          </div>

          <div className="stat-card">
            <p className="stat-label">Lượt khám hôm nay</p>
            <p className="stat-value">{stats?.today?.total ?? 0}</p>
            <p className="stat-desc">{stats?.today?.completed ?? 0} hoàn tất · {stats?.today?.inProgress ?? 0} đang khám</p>
          </div>
        </section>

        {/* Breakdown stats row */}
        {stats && (
          <section className="stats-grid" style={{ marginBottom: '28px' }}>
            <div className="stat-card">
              <p className="stat-label">Khám trong tuần</p>
              <p className="stat-value">{stats.week?.total ?? 0}</p>
              <p className="stat-desc">{stats.week?.completed ?? 0} lượt hoàn tất</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Khám trong tháng</p>
              <p className="stat-value">{stats.month?.total ?? 0}</p>
              <p className="stat-desc">{stats.month?.completed ?? 0} lượt khám</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Tuân thủ tái khám</p>
              <p className="stat-value">{stats.followUp?.totalWithFollowUp ? Math.round((stats.followUp.returned / stats.followUp.totalWithFollowUp) * 100) : 100}%</p>
              <p className="stat-desc">{stats.followUp?.returned ?? 0}/{stats.followUp?.totalWithFollowUp ?? 0} bệnh nhân</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Vắng mặt / Hủy</p>
              <p className="stat-value">{stats.today?.absent ?? 0}</p>
              <p className="stat-desc">Không đến khám theo hẹn</p>
            </div>
          </section>
        )}

        {/* Clinical Alert Card */}
        <section className="doctor-panel" style={{ marginBottom: '28px' }}>
          <div className="doctor-panel-heading">
            <div>
              <h2>Cảnh báo lâm sàng ưu tiên</h2>
              <p>Trường hợp bệnh nhân có dấu hiệu mất bù hoặc chỉ số vượt ngưỡng.</p>
            </div>

            {alertPatients.length > 0 && (
              <span className="new-alert-badge" style={{ background: 'var(--danger-100)', color: 'var(--danger-700)', padding: '4px 12px', borderRadius: 'var(--radius-pill)', fontWeight: 'bold', fontSize: '13px' }}>
                ⚠ {alertPatients.length} trường hợp cần rà soát
              </span>
            )}
          </div>

          {newestAlert ? (
            <div
              style={{
                background: 'linear-gradient(180deg, var(--danger-50) 0%, #ffffff 100%)',
                border: '1.5px solid var(--danger-200)',
                borderRadius: 'var(--radius-xl)',
                padding: '24px',
                display: 'flex',
                gap: '20px',
                alignItems: 'flex-start',
                flexWrap: 'wrap'
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--danger)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
                  flexShrink: 0
                }}
              >
                <AlertTriangleIcon size={24} />
              </div>

              <div style={{ flex: 1, minWidth: '280px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <strong style={{ fontSize: '18px', color: 'var(--slate-900)' }}>{newestAlert.fullName}</strong>
                  <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: 'var(--radius-pill)', background: 'var(--danger-100)', color: 'var(--danger-700)', fontWeight: 'bold' }}>
                    Mã BN: {newestAlert.patientCode || 'Chưa cấp'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', margin: '14px 0' }}>
                  <div style={{ background: 'white', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-200)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--slate-400)', display: 'block' }}>Cân nặng</span>
                    <strong style={{ fontSize: '16px', color: newestAlert.weight >= 68.8 ? 'var(--danger)' : 'var(--slate-800)' }}>
                      {newestAlert.weight} kg
                    </strong>
                  </div>
                  <div style={{ background: 'white', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-200)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--slate-400)', display: 'block' }}>Huyết áp</span>
                    <strong style={{ fontSize: '16px', color: newestAlert.systolic >= 160 ? 'var(--danger)' : 'var(--slate-800)' }}>
                      {newestAlert.systolic}/{newestAlert.diastolic} mmHg
                    </strong>
                  </div>
                  <div style={{ background: 'white', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-200)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--slate-400)', display: 'block' }}>Nhịp tim</span>
                    <strong style={{ fontSize: '16px', color: newestAlert.heartRate >= 100 ? 'var(--danger)' : 'var(--slate-800)' }}>
                      {newestAlert.heartRate} bpm
                    </strong>
                  </div>
                  <div style={{ background: 'white', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-200)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--slate-400)', display: 'block' }}>SpO₂</span>
                    <strong style={{ fontSize: '16px', color: newestAlert.spo2 <= 93 ? 'var(--danger)' : 'var(--slate-800)' }}>
                      {newestAlert.spo2}%
                    </strong>
                  </div>
                </div>

                <div style={{ fontSize: '13px', color: 'var(--danger-700)', fontWeight: '500' }}>
                  <strong>Dấu hiệu cảnh báo: </strong>
                  {getReasons(newestAlert).join(' · ')}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignSelf: 'center' }}>
                <button
                  className="primary-action"
                  onClick={() => onViewPatient(newestAlert)}
                  style={{ background: 'var(--danger)', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.35)' }}
                >
                  <span>Mở bệnh án chi tiết</span>
                  <ChevronRightIcon size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--slate-50)', borderRadius: 'var(--radius-xl)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-pill)', background: 'var(--success-100)', color: 'var(--success)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                <CheckCircleIcon size={24} />
              </div>
              <h3 style={{ fontSize: '16px', color: 'var(--slate-800)', marginBottom: '4px' }}>Không có cảnh báo khẩn</h3>
              <p style={{ fontSize: '13px', color: 'var(--slate-500)', margin: 0 }}>Toàn bộ bệnh nhân đang theo dõi hiện có chỉ số sinh hiệu trong giới hạn an toàn.</p>
            </div>
          )}
        </section>

        {/* Recent Patients Table */}
        <section className="doctor-panel">
          <div className="doctor-panel-heading">
            <div>
              <h2>Bệnh nhân vừa ghi nhận chỉ số</h2>
              <p>Dữ liệu đo sinh hiệu truyền về từ cổng bệnh nhân theo thời gian thực.</p>
            </div>

            <button className="primary-action" onClick={onViewPatientList} style={{ background: 'var(--slate-100)', color: 'var(--slate-700)', border: '1px solid var(--slate-200)' }}>
              <span>Xem toàn bộ danh sách ({patients.length})</span>
              <ChevronRightIcon size={16} />
            </button>
          </div>

          {loadingPatients && <p style={{ color: 'var(--slate-500)', padding: '20px' }}>Đang nạp danh sách bệnh nhân...</p>}

          {!loadingPatients && recentPatients.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--slate-400)' }}>
              <p>Chưa có bệnh nhân nào gửi dữ liệu đo hôm nay.</p>
            </div>
          )}

          {recentPatients.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid var(--slate-200)', color: 'var(--slate-400)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '12px 16px' }}>Bệnh nhân</th>
                    <th style={{ padding: '12px 16px' }}>Chỉ số đo gần nhất</th>
                    <th style={{ padding: '12px 16px' }}>Đánh giá</th>
                    <th style={{ padding: '12px 16px' }}>Thời gian gửi</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPatients.map((patient) => {
                    const isAlert = hasAbnormalReading(patient)
                    return (
                      <tr
                        key={patient.userId}
                        onClick={() => onViewPatient(patient)}
                        style={{
                          borderBottom: '1px solid var(--slate-100)',
                          cursor: 'pointer',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--slate-50)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div className="small-avatar" style={{ width: '38px', height: '38px', fontSize: '13px' }}>
                              {patient.fullName?.slice(0, 2).toUpperCase() || 'BN'}
                            </div>
                            <div>
                              <strong style={{ display: 'block', color: 'var(--slate-900)' }}>{patient.fullName}</strong>
                              <span style={{ fontSize: '12px', color: 'var(--slate-400)' }}>{patient.patientCode || 'Chưa cấp'}</span>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', gap: '8px', fontSize: '13px' }}>
                            <span style={{ background: 'var(--slate-100)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontWeight: '600' }}>
                              {patient.weight} kg
                            </span>
                            <span style={{ background: 'var(--slate-100)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontWeight: '600' }}>
                              {patient.systolic}/{patient.diastolic} mmHg
                            </span>
                            <span style={{ background: 'var(--slate-100)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontWeight: '600' }}>
                              {patient.heartRate} bpm
                            </span>
                          </div>
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <span className={isAlert ? 'alert-badge' : 'normal-badge'}>
                            ● {isAlert ? 'Cần chú ý' : 'Ổn định'}
                          </span>
                        </td>

                        <td style={{ padding: '14px 16px', color: 'var(--slate-500)', fontSize: '13px' }}>
                          {new Date(patient.lastSubmittedAt).toLocaleString('vi-VN')}
                        </td>

                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); onViewPatient(patient) }}
                            style={{
                              padding: '6px 12px',
                              border: '1px solid var(--slate-200)',
                              borderRadius: 'var(--radius-md)',
                              background: 'white',
                              color: 'var(--primary)',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            Xem bệnh án →
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function getReasons(vitals) {
  const reasons = []
  if (vitals.weight >= 68.8) reasons.push('Cân nặng tăng (nguy cơ ứ dịch)')
  if (vitals.systolic >= 160) reasons.push('Tăng huyết áp tâm thu')
  if (vitals.heartRate >= 100) reasons.push('Nhịp nhanh > 100 bpm')
  if (vitals.spo2 <= 93) reasons.push('SpO₂ giảm ≤ 93%')
  if (vitals.dyspnea) reasons.push('Khó thở khi gắng sức')
  if (vitals.edema) reasons.push('Phù chi dưới')
  if (vitals.chestPain) reasons.push('Đau tức ngực')
  return reasons.length ? reasons : ['Chỉ số bình thường']
}

function hasAbnormalReading(patient) {
  return (
    patient.weight >= 68.8 ||
    patient.systolic >= 160 ||
    patient.heartRate >= 100 ||
    patient.spo2 <= 93 ||
    Boolean(patient.dyspnea) ||
    Boolean(patient.edema) ||
    Boolean(patient.chestPain)
  )
}

export default DoctorDashboard
