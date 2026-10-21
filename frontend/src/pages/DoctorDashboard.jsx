import { useEffect, useState } from 'react'

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

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/patients', {
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

    loadPatients()
    const refreshInterval = setInterval(loadPatients, 30000)
    return () => clearInterval(refreshInterval)
  }, [user.token])

  const reportingPatients = patients.filter((patient) => patient.weight != null)
  const alertPatients = reportingPatients.filter(hasAbnormalReading)
  const stablePatients = reportingPatients.length - alertPatients.length
  const newestAlert = alertPatients[0]
  const recentPatients = reportingPatients.slice(0, 3)

  return (
    <div className="dashboard-page">
      <aside className="sidebar doctor-sidebar">
        <div className="sidebar-logo">
          <span>♥</span>
          <h2>CRE-HINT</h2>
        </div>

        <nav>
          <button className="nav-item active">⌂ Tổng quan</button>
          <button className="nav-item" onClick={onViewPatientList}>
            📋 Danh sách bệnh nhân
          </button>
          <button className="nav-item" onClick={onViewAlerts}>
            ⚠ Cảnh báo {alertPatients.length > 0 && (
              <b className="alert-count">{alertPatients.length}</b>
            )}
          </button>
          <button className="nav-item" onClick={onViewAppointments}>▣ Lịch khám</button>
          <button className="nav-item" onClick={onViewQueue}>⌛ Hàng đợi khám</button>
        </nav>

        <button className="logout-button" onClick={onLogout}>
          Đăng xuất
        </button>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="welcome">Xin chào,</p>
            <h1>BS. {user?.fullName || 'Chưa có họ tên'} 👋</h1>
            <p>Tổng quan tình trạng các bệnh nhân đang theo dõi.</p>
          </div>

          <div className="doctor-avatar">BS</div>
        </header>

        <section className="doctor-stat-grid">
          <DoctorStat
            title="Tổng bệnh nhân"
            value={patients.length}
            description="Đã đăng ký"
          />

          <DoctorStat
            title="Ổn định"
            value={stablePatients}
            description="Có chỉ số trong ngưỡng"
          />

          <DoctorStat
            title="Cần chú ý"
            value={alertPatients.length}
            description="Cần được kiểm tra"
            warning={alertPatients.length > 0}
          />

          <DoctorStat
            title="Lịch khám hôm nay"
            value="4"
            description="Bệnh nhân"
          />
        </section>

        <section className="doctor-panel">
          <div className="doctor-panel-heading">
            <div>
              <h2>Cảnh báo cần xử lý</h2>
              <p>Các trường hợp cần được nhân viên y tế xem xét.</p>
            </div>

            {alertPatients.length > 0 && (
              <span className="new-alert-badge">{alertPatients.length} cảnh báo mới</span>
            )}
          </div>

            {newestAlert ? (
            <div className="clinical-alert">
              <div className="clinical-alert-icon">!</div>

              <div className="alert-patient">
                <div className="patient-name-row">
                    <strong>{newestAlert.fullName}</strong>
                  <span>Cần chú ý</span>
                </div>

                <p>Mã bệnh nhân: {newestAlert.patientCode || 'Chưa cấp mã'}</p>

                <div className="alert-vitals">
                  <VitalMini
                    label="Cân nặng"
                    value={`${newestAlert.weight} kg`}
                  />
                  <VitalMini
                    label="Huyết áp"
                    value={`${newestAlert.systolic}/${newestAlert.diastolic} mmHg`}
                  />
                  <VitalMini
                    label="Nhịp tim"
                    value={`${newestAlert.heartRate} bpm`}
                  />
                  <VitalMini
                    label="SpO₂"
                    value={`${newestAlert.spo2}%`}
                  />
                </div>

                <div className="alert-reasons">
                  <strong>Dấu hiệu ghi nhận:</strong>
                  <span>
                    {getReasons(newestAlert).join(' · ')}
                  </span>
                </div>
              </div>

              <div className="alert-actions">
                <button className="detail-button" onClick={() => onViewPatient(newestAlert)}>
                  Xem bệnh nhân
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-alert">
              <div>✓</div>
              <h3>Không có cảnh báo mới</h3>
              <p>Các bệnh nhân hiện không có cảnh báo chưa xử lý.</p>
            </div>
          )}
        </section>

        <section className="doctor-panel patient-list-panel">
          <div className="doctor-panel-heading">
            <div>
              <h2>Bệnh nhân gần đây</h2>
              <p>Danh sách bệnh nhân đang được theo dõi.</p>
            </div>

            <button className="view-all-button" onClick={onViewPatientList}>
              Xem tất cả
            </button>
          </div>

          {loadingPatients && <p>Đang tải dữ liệu bệnh nhân...</p>}

          {!loadingPatients && recentPatients.length === 0 && (
            <div className="empty-alert">
              <h3>Chưa có bệnh nhân gửi chỉ số</h3>
              <p>Các lần đo mới sẽ xuất hiện tại đây sau khi bệnh nhân gửi.</p>
            </div>
          )}

          {recentPatients.length > 0 && <div className="patient-table">
            <div className="patient-table-header">
              <span>Bệnh nhân</span>
              <span>Chỉ số gần nhất</span>
              <span>Trạng thái</span>
              <span>Cập nhật</span>
            </div>

            {recentPatients.map((patient) => (
              <PatientRow
                key={patient.userId}
                patient={patient}
                onViewPatient={onViewPatient}
              />
            ))}
          </div>}
        </section>
      </main>
    </div>
  )
}

function DoctorStat({ title, value, description, warning }) {
  return (
    <div className={warning ? 'doctor-stat warning-stat' : 'doctor-stat'}>
      <p>{title}</p>
      <strong>{value}</strong>
      <span>{description}</span>
    </div>
  )
}

function VitalMini({ label, value }) {
  return (
    <div className="vital-mini">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function PatientRow({ patient, onViewPatient }) {
  const alert = hasAbnormalReading(patient)

  return (
    <div
      className="patient-row"
      role="button"
      tabIndex={0}
      onClick={() => onViewPatient(patient)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onViewPatient(patient)
      }}
    >
      <div className="patient-identity">
        <div className="small-avatar">
          {patient.fullName?.split(' ').slice(-2).map((word) => word[0]).join('').toUpperCase()}
        </div>
        <div>
          <strong>{patient.fullName}</strong>
          <p>{patient.patientCode || 'Chưa cấp mã'}</p>
        </div>
      </div>

      <span>{patient.systolic}/{patient.diastolic} mmHg</span>

      <span className={alert ? 'patient-status warning' : 'patient-status'}>
        ● {alert ? 'Cần chú ý' : 'Ổn định'}
      </span>

      <span className="update-time">
        {new Date(patient.lastSubmittedAt).toLocaleString('vi-VN')}
      </span>
    </div>
  )
}

function getReasons(vitals) {
  const reasons = []

  if (vitals.weight >= 68.8) reasons.push('Cân nặng tăng')
  if (vitals.systolic >= 160) reasons.push('Huyết áp tâm thu cao')
  if (vitals.heartRate >= 100) reasons.push('Nhịp tim cao')
  if (vitals.spo2 <= 93) reasons.push('SpO₂ thấp')
  if (vitals.dyspnea) reasons.push('Khó thở')
  if (vitals.edema) reasons.push('Phù chân')
  if (vitals.chestPain) reasons.push('Đau ngực')

  return reasons.length ? reasons : ['Không có dấu hiệu bất thường']
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
