import { useEffect, useState } from 'react'
import {
  ArrowLeftIcon,
  AlertTriangleIcon,
  ChevronRightIcon
} from '../components/Icons'

function Alerts({ user, onBack, onViewPatient }) {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const response = await fetch('/api/patients', {
          headers: { Authorization: `Bearer ${user.token}` },
        })
        const data = await response.json()
        if (response.ok) setPatients(data.patients)
      } catch (error) {
        console.error('Không thể tải cảnh báo:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPatients()
  }, [user.token])

  const reportingPatients = patients.filter((patient) => patient.weight != null)
  const alertPatients = reportingPatients.filter(isAbnormalReading)

  return (
    <div className="alerts-page">
      <div className="alerts-container">
        <button className="back-button" onClick={onBack}>
          <ArrowLeftIcon size={16} />
          <span>Quay lại trang tổng quan</span>
        </button>

        <div className="alerts-header">
          <div>
            <h1>Danh sách cảnh báo lâm sàng</h1>
            <p>Theo dõi và can thiệp kịp thời các bệnh nhân có sinh hiệu vượt ngưỡng báo động.</p>
          </div>

          <div className="doctor-avatar" style={{ fontSize: '14px' }}>
            BS
          </div>
        </div>

        <div className="stats-grid" style={{ marginBottom: '28px' }}>
          <div className="stat-card stat-alert">
            <p className="stat-label">Cảnh báo chưa xử lý</p>
            <p className="stat-value">{alertPatients.length}</p>
            <p className="stat-desc">Trường hợp cần đánh giá</p>
          </div>

          <div className="stat-card">
            <p className="stat-label">Đã gửi dữ liệu</p>
            <p className="stat-value">{reportingPatients.length}</p>
            <p className="stat-desc">Bệnh nhân truyền sinh hiệu</p>
          </div>

          <div className="stat-card stat-success">
            <p className="stat-label">Bệnh nhân an toàn</p>
            <p className="stat-value">{reportingPatients.length - alertPatients.length}</p>
            <p className="stat-desc">Sinh hiệu trong ngưỡng</p>
          </div>

          <div className="stat-card">
            <p className="stat-label">Tổng số hồ sơ</p>
            <p className="stat-value">{patients.length}</p>
            <p className="stat-desc">Hồ sơ theo dõi</p>
          </div>
        </div>

        <section className="feature-card">
          <div className="section-title">
            <div>
              <h2>Chi tiết các trường hợp cảnh báo</h2>
              <p>Sắp xếp theo thứ tự phát hiện mới nhất.</p>
            </div>

            {alertPatients.length > 0 && (
              <span className="alert-badge">
                ⚠ {alertPatients.length} cảnh báo cần xử lý
              </span>
            )}
          </div>

          {loading && <p style={{ color: 'var(--slate-500)', padding: '20px 0' }}>Đang nạp dữ liệu cảnh báo...</p>}

          {!loading && alertPatients.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--slate-400)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-pill)', background: 'var(--success-100)', color: 'var(--success)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                ✓
              </div>
              <h3 style={{ fontSize: '16px', color: 'var(--slate-800)', marginBottom: '4px' }}>Tất cả bệnh nhân đều ổn định</h3>
              <p style={{ fontSize: '13px' }}>Không có cảnh báo sinh hiệu bất thường nào tại thời điểm này.</p>
            </div>
          )}

          {!loading && alertPatients.map((patient) => {
            const reasons = getReasons(patient)
            return (
              <div
                key={patient.userId}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                  padding: '18px',
                  border: '1.5px solid var(--danger-200)',
                  borderRadius: 'var(--radius-xl)',
                  background: 'var(--bg-surface)',
                  marginBottom: '14px',
                  boxShadow: 'var(--shadow-xs)'
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--danger-100)',
                    color: 'var(--danger-700)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    flexShrink: 0
                  }}
                >
                  <AlertTriangleIcon size={20} />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '16px', color: 'var(--slate-900)', margin: 0 }}>
                      {patient.fullName}
                    </h3>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--primary)', background: 'var(--primary-50)', padding: '2px 8px', borderRadius: 'var(--radius-pill)' }}>
                      Mã: {patient.patientCode || 'Chưa cấp'}
                    </span>
                    <span className="alert-badge" style={{ marginLeft: 'auto' }}>
                      ● Cần chú ý
                    </span>
                  </div>

                  <p style={{ fontSize: '12px', color: 'var(--slate-400)', margin: '0 0 10px' }}>
                    Gửi lần cuối: {new Date(patient.lastSubmittedAt).toLocaleString('vi-VN')}
                  </p>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    <span style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)', padding: '4px 10px', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
                      Cân nặng: <strong style={{ color: patient.weight >= 68.8 ? 'var(--danger)' : 'inherit' }}>{patient.weight} kg</strong>
                    </span>
                    <span style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)', padding: '4px 10px', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
                      Huyết áp: <strong style={{ color: patient.systolic >= 160 ? 'var(--danger)' : 'inherit' }}>{patient.systolic}/{patient.diastolic} mmHg</strong>
                    </span>
                    <span style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)', padding: '4px 10px', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
                      Nhịp tim: <strong style={{ color: patient.heartRate >= 100 ? 'var(--danger)' : 'inherit' }}>{patient.heartRate} bpm</strong>
                    </span>
                    <span style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)', padding: '4px 10px', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
                      SpO₂: <strong style={{ color: patient.spo2 <= 93 ? 'var(--danger)' : 'inherit' }}>{patient.spo2}%</strong>
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', color: 'var(--danger-700)', fontWeight: '500' }}>
                    <strong>Dấu hiệu bất thường: </strong>
                    {reasons.join(' · ')}
                  </div>
                </div>

                <button
                  className="primary-action"
                  onClick={() => onViewPatient(patient)}
                  style={{ alignSelf: 'center', whiteSpace: 'nowrap' }}
                >
                  <span>Mở bệnh án</span>
                  <ChevronRightIcon size={14} />
                </button>
              </div>
            )
          })}
        </section>
      </div>
    </div>
  )
}

function getReasons(patient) {
  const reasons = []
  if (patient.weight >= 68.8) reasons.push('Cân nặng tăng nguy cơ ứ dịch')
  if (patient.systolic >= 160) reasons.push('Tăng huyết áp tâm thu')
  if (patient.heartRate >= 100) reasons.push('Nhịp tim nhanh')
  if (patient.spo2 <= 93) reasons.push('SpO₂ giảm')
  if (patient.dyspnea) reasons.push('Khó thở khi gắng sức')
  if (patient.edema) reasons.push('Phù chi dưới')
  if (patient.chestPain) reasons.push('Đau tức ngực')
  return reasons.length ? reasons : ['Chỉ số bất thường']
}

function isAbnormalReading(patient) {
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

export default Alerts
