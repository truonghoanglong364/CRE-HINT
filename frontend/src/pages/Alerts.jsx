import { useEffect, useState } from 'react'

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
          ← Quay lại tổng quan
        </button>

        <div className="alerts-header">
          <div>
            <h1>Cảnh báo</h1>
            <p>Theo dõi và xử lý các cảnh báo sức khỏe của bệnh nhân.</p>
          </div>

          <div className="doctor-small-profile">
            <div className="doctor-small-avatar">MT</div>

            <div>
              <strong>BS. Nguyễn Minh Tuấn</strong>
              <span>Bác sĩ Tim mạch</span>
            </div>
          </div>
        </div>

        <div className="alerts-summary">
          <div className="alert-summary-box">
            <span>Cảnh báo chưa xử lý</span>
            <strong>{alertPatients.length}</strong>
          </div>

          <div className="alert-summary-box">
            <span>Cần chú ý</span>
            <strong>{alertPatients.length}</strong>
          </div>

          <div className="alert-summary-box">
            <span>Bệnh nhân đã gửi chỉ số</span>
            <strong>{reportingPatients.length}</strong>
          </div>
        </div>

        <section className="alerts-card">
          <div className="alerts-card-heading">
            <div>
              <h2>Cảnh báo gần đây</h2>
              <p>Các trường hợp cần được nhân viên y tế xem xét.</p>
            </div>

            {alertPatients.length > 0 && (
              <span className="new-alert-badge">
                {alertPatients.length} cảnh báo mới
              </span>
            )}
          </div>

          {loading && <p>Đang tải cảnh báo...</p>}

          {!loading && alertPatients.length > 0 ? (
            alertPatients.map((patient) => (
              <div className="alert-list-item" key={patient.userId}>
                <div className="alert-list-icon">!</div>

              <div className="alert-list-content">

                <div className="alert-list-top">
                  <div>
                    <h3>{patient.fullName}</h3>
                    <span>{patient.patientCode || 'Chưa cấp mã'}</span>
                  </div>

                  <span className="alert-list-status">
                    ● Cần chú ý
                  </span>
                </div>

                <div className="alert-list-vitals">
                  <AlertVital
                    label="Cân nặng"
                    value={`${patient.weight} kg`}
                  />

                  <AlertVital
                    label="Huyết áp"
                    value={`${patient.systolic}/${patient.diastolic} mmHg`}
                  />

                  <AlertVital
                    label="Nhịp tim"
                    value={`${patient.heartRate} bpm`}
                  />

                  <AlertVital
                    label="SpO₂"
                    value={`${patient.spo2}%`}
                  />
                </div>

                <div className="alert-list-reasons">
                  <strong>Dấu hiệu ghi nhận:</strong>
                  <span>{getReasons(patient).join(' · ')}</span>
                </div>

                <div className="alert-list-actions">
                  <button
                    className="detail-button"
                    onClick={() => onViewPatient(patient)}
                  >
                    Xem bệnh nhân
                  </button>

                </div>

              </div>
              </div>
            ))
          ) : !loading ? (
            <div className="empty-alert">
              <div>✓</div>
              <h3>Không có cảnh báo chưa xử lý</h3>
              <p>
                Hiện tại không có bệnh nhân nào cần xử lý cảnh báo.
              </p>
            </div>
          ) : null}
        </section>

      </div>
    </div>
  )
}


function AlertVital({ label, value }) {
  return (
    <div className="alert-list-vital">
      <span>{label}</span>
      <strong>{value}</strong>
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

  return reasons.length
    ? reasons
    : ['Không có dấu hiệu bất thường']
}


export default Alerts

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