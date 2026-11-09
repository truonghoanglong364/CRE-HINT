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
  const [exporting, setExporting] = useState(false)
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
          `/api/vitals?userId=${patient.userId}`,
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

  const exportRecord = async () => {
    if (!patient?.userId) return
    setExporting(true)
    try {
      const response = await fetch(`/api/patients/${patient.userId}/export`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      const data = await response.json()
      if (!response.ok) { alert(data.message); return }

      const p = data.patient
      let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bệnh án - ${p.fullName}</title>
<style>body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:30px;color:#1e293b}
h1{color:#1976d2;border-bottom:2px solid #1976d2;padding-bottom:10px}
h2{color:#334155;margin-top:28px;border-bottom:1px solid #e2e8f0;padding-bottom:6px}
table{width:100%;border-collapse:collapse;margin:10px 0}
th,td{text-align:left;padding:8px 10px;border:1px solid #e2e8f0;font-size:13px}
th{background:#f1f5f9;font-weight:600}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}
.info-item span{color:#64748b;font-size:12px}
.info-item strong{display:block;margin-top:2px}
.stamp{text-align:right;color:#94a3b8;font-size:12px;margin-top:40px}
@media print{body{padding:15px}}</style></head><body>`
      html += `<h1>BỆNH ÁN BỆNH NHÂN</h1>`
      html += `<div class="info-grid">`
      html += `<div class="info-item"><span>Họ và tên</span><strong>${p.fullName}</strong></div>`
      html += `<div class="info-item"><span>Mã bệnh nhân</span><strong>${p.patientCode || 'Chưa cấp'}</strong></div>`
      html += `<div class="info-item"><span>Ngày sinh</span><strong>${p.dateOfBirth || 'Chưa cập nhật'}</strong></div>`
      html += `<div class="info-item"><span>Giới tính</span><strong>${p.gender || 'Chưa cập nhật'}</strong></div>`
      html += `<div class="info-item"><span>Số điện thoại</span><strong>${p.phone || 'Chưa cập nhật'}</strong></div>`
      html += `<div class="info-item"><span>Địa chỉ</span><strong>${p.address || 'Chưa cập nhật'}</strong></div>`
      html += `</div>`

      if (data.vitals.length > 0) {
        html += `<h2>Lịch sử chỉ số sức khỏe</h2><table><tr><th>Thời gian</th><th>Cân nặng</th><th>Huyết áp</th><th>Nhịp tim</th><th>SpO₂</th><th>Triệu chứng</th></tr>`
        for (const v of data.vitals) {
          const symptoms = []
          if (v.dyspnea) symptoms.push('Khó thở')
          if (v.edema) symptoms.push('Phù')
          if (v.chestPain) symptoms.push('Đau ngực')
          html += `<tr><td>${new Date(v.createdAt).toLocaleString('vi-VN')}</td><td>${v.weight} kg</td><td>${v.systolic}/${v.diastolic}</td><td>${v.heartRate} bpm</td><td>${v.spo2}%</td><td>${symptoms.join(', ') || '—'}</td></tr>`
        }
        html += `</table>`
      }

      if (data.visits.length > 0) {
        html += `<h2>Lịch sử khám bệnh</h2>`
        for (const v of data.visits) {
          html += `<div style="margin:14px 0;padding:12px;border:1px solid #e2e8f0;border-radius:8px">`
          html += `<strong>${v.visitDate}</strong> · ${v.specialty} · <em>${v.status}</em>`
          if (v.doctorName) html += ` · BS. ${v.doctorName}`
          if (v.reason) html += `<p><strong>Lý do:</strong> ${v.reason}</p>`
          if (v.examNotes) html += `<p><strong>Nội dung khám:</strong> ${v.examNotes}</p>`
          if (v.resultText) html += `<p><strong>Kết luận:</strong> ${v.resultText}</p>`
          if (v.prescription) html += `<p><strong>Đơn thuốc:</strong> ${v.prescription.replace(/\n/g, '<br>')}</p>`
          if (v.followUpAt) html += `<p><strong>Tái khám:</strong> ${v.followUpAt}</p>`
          html += `</div>`
        }
      }

      html += `<p class="stamp">Xuất lúc: ${new Date().toLocaleString('vi-VN')} · CRE-HINT</p></body></html>`

      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `benh-an-${p.patientCode || p.fullName}.html`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      alert('Không thể xuất bệnh án: ' + error.message)
    } finally {
      setExporting(false)
    }
  }

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

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span
              className={
                currentAlert
                  ? 'detail-status detail-warning'
                  : 'detail-status detail-stable'
              }
            >
              {currentAlert ? '● Cần chú ý' : hasCurrentVitals ? '● Ổn định' : '● Chưa có chỉ số'}
            </span>
            {patient?.userId && authToken && (
              <button className="export-btn" onClick={exportRecord} disabled={exporting}>
                {exporting ? 'Đang xuất...' : 'Xuất bệnh án'}
              </button>
            )}
          </div>
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