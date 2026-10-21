import { useEffect, useState } from 'react'

const EMPTY_VITALS = {
  weight: null,
  systolic: null,
  diastolic: null,
  heartRate: null,
  spo2: null,
  dyspnea: false,
  edema: false,
  chestPain: false,
}

function PatientDetail({ patient, authToken, vitals, hasAlert, onBack }) {
  const [history, setHistory] = useState([])
  const currentVitals = patient
    ? patient.weight != null ? patient : EMPTY_VITALS
    : vitals
  const hasCurrentVitals = currentVitals.weight != null
  const currentAlert = hasCurrentVitals
    ? isAbnormalReading(currentVitals)
    : !patient && hasAlert

  useEffect(() => {
    if (!patient?.userId) return

    const loadHistory = async () => {
      try {
        const response = await fetch(
          `http://localhost:3000/api/vitals?userId=${patient.userId}`,
          { headers: { Authorization: `Bearer ${authToken}` } }
        )
        const data = await response.json()
        if (response.ok) setHistory(data.vitals)
      } catch (error) {
        console.error('Không thể tải lịch sử chỉ số:', error)
      }
    }

    loadHistory()
  }, [patient?.userId, authToken])

  const symptoms = []

  if (currentVitals.dyspnea) symptoms.push('Khó thở')
  if (currentVitals.edema) symptoms.push('Phù chân')
  if (currentVitals.chestPain) symptoms.push('Đau ngực')

  return (
    <div className="patient-detail-page">
      <div className="patient-detail-container">

        <button className="back-button" onClick={onBack}>
          ← Quay lại Dashboard
        </button>

        {/* HEADER */}
        <div className="patient-profile-header">
          <div className="patient-profile-avatar">NA</div>

          <div>
            <h1>{patient?.fullName || 'Thông tin bệnh nhân'}</h1>
            <p>{patient?.patientCode || 'Chưa cấp mã'} · {patient?.gender || 'Chưa cập nhật giới tính'}</p>
          </div>

          <span
            className={
              currentAlert
                ? 'detail-status detail-warning'
                : 'detail-status detail-stable'
            }
          >
            {currentAlert ? '● Cần chú ý' : hasCurrentVitals ? '● Ổn định' : '● Chưa có chỉ số'}
          </span>
        </div>

        {/* ALERT */}
        {currentAlert && (
          <div className="detail-alert-box">
            <div className="detail-alert-icon">!</div>

            <div>
              <strong>Phát hiện chỉ số cần được theo dõi</strong>
              <p>
                Dữ liệu mới nhất của bệnh nhân có chỉ số hoặc triệu chứng
                nằm ngoài ngưỡng theo dõi của hệ thống.
              </p>
            </div>

          </div>
        )}

        {/* CURRENT VITALS */}
        <section className="detail-section">
          <div className="detail-section-title">
            <div>
              <h2>Chỉ số gần nhất</h2>
              <p>Dữ liệu bệnh nhân vừa ghi nhận</p>
            </div>

            <span>Vừa cập nhật</span>
          </div>

          <div className="detail-vitals-grid">

            <DetailVital
              icon="⚖"
              label="Cân nặng"
              value={currentVitals.weight ?? '--'}
              unit="kg"
              warning={currentVitals.weight >= 68.8}
            />

            <DetailVital
              icon="♥"
              label="Huyết áp"
              value={`${currentVitals.systolic ?? '--'}/${currentVitals.diastolic ?? '--'}`}
              unit="mmHg"
              warning={currentVitals.systolic >= 160}
            />

            <DetailVital
              icon="⌁"
              label="Nhịp tim"
              value={currentVitals.heartRate ?? '--'}
              unit="bpm"
              warning={currentVitals.heartRate >= 100}
            />

            <DetailVital
              icon="O₂"
              label="SpO₂"
              value={currentVitals.spo2}
              unit="%"
              warning={currentVitals.spo2 != null && currentVitals.spo2 <= 93}
            />

          </div>
        </section>

        <div className="detail-two-columns">

          {/* SYMPTOMS */}
          <section className="detail-section">
            <h2>Triệu chứng ghi nhận</h2>

            {symptoms.length > 0 ? (
              <div className="symptom-list">
                {symptoms.map((symptom) => (
                  <div className="recorded-symptom" key={symptom}>
                    <span>!</span>
                    {symptom}
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-symptoms">
                ✓ Không ghi nhận triệu chứng
              </div>
            )}
          </section>

          {/* INFORMATION */}
          <section className="detail-section">
            <h2>Thông tin bệnh nhân</h2>

            <div className="patient-info-list">
              <InfoRow label="Mã bệnh nhân" value={patient?.patientCode || 'Chưa cấp mã'} />
              <InfoRow label="Ngày sinh" value={patient?.dateOfBirth || 'Chưa cập nhật'} />
              <InfoRow label="Giới tính" value={patient?.gender || 'Chưa cập nhật'} />
              <InfoRow label="Số điện thoại" value={patient?.phone || patient?.email || 'Chưa cập nhật'} />
              <InfoRow label="Bác sĩ phụ trách" value="BS. Nguyễn Minh Tuấn" />
            </div>
          </section>

        </div>

        {/* HISTORY */}
        <section className="detail-section">
          <div className="detail-section-title">
            <div>
              <h2>Lịch sử theo dõi</h2>
              <p>Các lần ghi nhận gần đây</p>
            </div>
          </div>

          <div className="history-table">

            <div className="history-header">
              <span>Thời gian</span>
              <span>Cân nặng</span>
              <span>Huyết áp</span>
              <span>Nhịp tim</span>
              <span>SpO₂</span>
            </div>

            {history.map((record, index) => (
              <HistoryRow
                key={record.id}
                time={new Date(record.createdAt).toLocaleString('vi-VN')}
                weight={`${record.weight} kg`}
                bloodPressure={`${record.systolic}/${record.diastolic}`}
                heartRate={`${record.heartRate} bpm`}
                spo2={`${record.spo2}%`}
                current={index === 0}
              />
            ))}

            {history.length === 0 && (
              <p>Chưa có lịch sử gửi chỉ số.</p>
            )}

          </div>
        </section>

        {/* MEDICATION */}
        <section className="detail-section">
          <h2>Thuốc đang sử dụng</h2>

          <div className="medication-list">

            <div className="medication-item">
              <div className="medicine-icon">Rx</div>
              <div>
                <strong>Furosemide</strong>
                <p>40 mg · 1 lần/ngày · Buổi sáng</p>
              </div>
            </div>

            <div className="medication-item">
              <div className="medicine-icon">Rx</div>
              <div>
                <strong>Bisoprolol</strong>
                <p>2.5 mg · 1 lần/ngày · Buổi sáng</p>
              </div>
            </div>

          </div>
        </section>

      </div>
    </div>
  )
}


function DetailVital({ icon, label, value, unit, warning }) {
  return (
    <div className={warning ? 'detail-vital vital-warning' : 'detail-vital'}>
      <div className="detail-vital-top">
        <span className="detail-vital-icon">{icon}</span>

        <span className={warning ? 'vital-state warning' : 'vital-state'}>
          {warning ? '● Cần chú ý' : '● Bình thường'}
        </span>
      </div>

      <p>{label}</p>

      <strong>
        {value}
        <small>{unit}</small>
      </strong>
    </div>
  )
}


function InfoRow({ label, value }) {
  return (
    <div className="patient-info-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}


function HistoryRow({
  time,
  weight,
  bloodPressure,
  heartRate,
  spo2,
  current,
}) {
  return (
    <div className={current ? 'history-row current-history' : 'history-row'}>
      <span>{time}</span>
      <span>{weight}</span>
      <span>{bloodPressure}</span>
      <span>{heartRate}</span>
      <span>{spo2}</span>
    </div>
  )
}


export default PatientDetail

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