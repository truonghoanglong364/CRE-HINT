import { useEffect, useState } from 'react'
import {
  ArrowLeftIcon,
  PrinterIcon,
  ScaleIcon,
  BloodPressureIcon,
  PulseIcon,
  OxygenIcon,
  AlertTriangleIcon
} from '../components/Icons'

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
        if (response.ok) setHistory(data.vitals || [])
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
      let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bệnh án suy tim - ${p.fullName}</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; max-width: 820px; margin: 0 auto; padding: 36px; color: #0f172a; line-height: 1.5; }
h1 { color: #0284c7; border-bottom: 2px solid #0284c7; padding-bottom: 10px; font-size: 22px; margin-bottom: 20px; }
h2 { color: #334155; margin-top: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; font-size: 16px; }
table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
th, td { text-align: left; padding: 10px 12px; border: 1px solid #e2e8f0; }
th { background: #f8fafc; font-weight: 600; color: #475569; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 14px 0; font-size: 14px; }
.info-item span { color: #64748b; font-size: 12px; display: block; }
.info-item strong { color: #0f172a; font-size: 14px; }
.stamp { text-align: right; color: #94a3b8; font-size: 12px; margin-top: 40px; border-top: 1px dashed #cbd5e1; padding-top: 14px; }
@media print { body { padding: 16px; } }
</style></head><body>`
      html += `<h1>BỆNH ÁN ĐIỆN TỬ THEO DÕI SUY TIM (CRE-HINT)</h1>`
      html += `<div class="info-grid">`
      html += `<div class="info-item"><span>Họ và tên bệnh nhân</span><strong>${p.fullName}</strong></div>`
      html += `<div class="info-item"><span>Mã số bệnh nhân</span><strong>${p.patientCode || 'Chưa cấp'}</strong></div>`
      html += `<div class="info-item"><span>Ngày sinh</span><strong>${p.dateOfBirth || 'Chưa cập nhật'}</strong></div>`
      html += `<div class="info-item"><span>Giới tính</span><strong>${p.gender || 'Chưa cập nhật'}</strong></div>`
      html += `<div class="info-item"><span>Điện thoại liên hệ</span><strong>${p.phone || 'Chưa cập nhật'}</strong></div>`
      html += `<div class="info-item"><span>Địa chỉ cư trú</span><strong>${p.address || 'Chưa cập nhật'}</strong></div>`
      html += `</div>`

      if (data.vitals.length > 0) {
        html += `<h2>Lịch sử theo dõi sinh hiệu từ xa</h2><table><tr><th>Thời gian đo</th><th>Cân nặng</th><th>Huyết áp</th><th>Nhịp tim</th><th>SpO₂</th><th>Triệu chứng ghi nhận</th></tr>`
        for (const v of data.vitals) {
          const syms = []
          if (v.dyspnea) syms.push('Khó thở')
          if (v.edema) syms.push('Phù chi dưới')
          if (v.chestPain) syms.push('Đau ngực')
          html += `<tr><td>${new Date(v.createdAt).toLocaleString('vi-VN')}</td><td>${v.weight} kg</td><td>${v.systolic}/${v.diastolic} mmHg</td><td>${v.heartRate} bpm</td><td>${v.spo2}%</td><td>${syms.join(', ') || 'Không ghi nhận'}</td></tr>`
        }
        html += `</table>`
      }

      if (data.visits.length > 0) {
        html += `<h2>Lịch sử khám & Kết luận bác sĩ chuyên khoa</h2>`
        for (const v of data.visits) {
          html += `<div style="margin:14px 0;padding:14px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc">`
          html += `<strong>Ngày khám: ${v.visitDate}</strong> · ${v.specialty} · Trạng thái: <em>${v.status}</em>`
          if (v.doctorName) html += ` · BS: ${v.doctorName}`
          if (v.reason) html += `<p><strong>Lý do đến khám:</strong> ${v.reason}</p>`
          if (v.examNotes) html += `<p><strong>Khám lâm sàng:</strong> ${v.examNotes}</p>`
          if (v.resultText) html += `<p><strong>Kết luận chẩn đoán:</strong> ${v.resultText}</p>`
          if (v.prescription) html += `<p><strong>Đơn thuốc chỉ định:</strong><br>${v.prescription.replace(/\n/g, '<br>')}</p>`
          if (v.followUpAt) html += `<p><strong>Lịch tái khám:</strong> ${v.followUpAt}</p>`
          html += `</div>`
        }
      }

      html += `<p class="stamp">Hồ sơ trích xuất tự động từ Hệ thống CRE-HINT lúc: ${new Date().toLocaleString('vi-VN')}</p></body></html>`

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
  if (currentVitals.dyspnea) symptoms.push('Khó thở khi gắng sức / nằm')
  if (currentVitals.edema) symptoms.push('Phù 2 chi dưới')
  if (currentVitals.chestPain) symptoms.push('Đau tức ngực')

  return (
    <div className="feature-page">
      <div className="feature-container">
        <button className="back-button" onClick={onBack}>
          <ArrowLeftIcon size={16} />
          <span>Quay lại trang tổng quan</span>
        </button>

        {/* Patient Profile Header Card */}
        <section className="feature-card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div className="patient-avatar" style={{ width: '64px', height: '64px', fontSize: '20px' }}>
              {patient?.fullName?.slice(0, 2).toUpperCase() || 'BN'}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '24px', margin: 0, color: 'var(--slate-900)' }}>
                  {patient?.fullName || 'Hồ sơ bệnh nhân'}
                </h1>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--primary)', background: 'var(--primary-50)', padding: '3px 10px', borderRadius: 'var(--radius-pill)' }}>
                  {patient?.patientCode || 'Chưa cấp mã'}
                </span>
              </div>
              <p style={{ margin: '4px 0 0', color: 'var(--slate-500)', fontSize: '14px' }}>
                Giới tính: <strong>{patient?.gender || 'Chưa cập nhật'}</strong> · Ngày sinh: <strong>{patient?.dateOfBirth || 'Chưa cập nhật'}</strong> · SĐT: <strong>{patient?.phone || patient?.email || 'Chưa cập nhật'}</strong>
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span className={currentAlert ? 'alert-badge' : 'normal-badge'}>
                ● {currentAlert ? 'Cần chú ý' : hasCurrentVitals ? 'Ổn định' : 'Chưa có chỉ số'}
              </span>

              {patient?.userId && authToken && (
                <button
                  className="primary-action"
                  onClick={exportRecord}
                  disabled={exporting}
                  style={{ background: 'var(--slate-800)' }}
                >
                  <PrinterIcon size={16} />
                  <span>{exporting ? 'Đang trích xuất...' : 'Xuất bệnh án (HTML/In)'}</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Alert Alert Banner */}
        {currentAlert && (
          <div className="status-banner alert-banner">
            <div className="status-icon alert-icon">
              <AlertTriangleIcon size={22} />
            </div>
            <div>
              <strong>Phát hiện chỉ số cảnh báo vượt ngưỡng an toàn</strong>
              <p>
                Bệnh nhân có chỉ số sinh hiệu hoặc triệu chứng gợi ý ứ dịch / suy tim mất bù. Cần xem xét điều chỉnh liều thuốc lợi tiểu hoặc hẹn tái khám sớm.
              </p>
            </div>
          </div>
        )}

        {/* Latest Vitals Grid */}
        <section className="feature-card">
          <div className="section-title">
            <div>
              <h2>Chỉ số sinh hiệu gần nhất</h2>
              <p>Dữ liệu bệnh nhân vừa truyền về hệ thống</p>
            </div>
          </div>

          <div className="vital-grid">
            <div className={`vital-card ${currentVitals.weight >= 68.8 ? 'vital-card-alert' : ''}`}>
              <div className="vital-top">
                <span className="vital-icon"><ScaleIcon size={20} /></span>
                <span className={currentVitals.weight >= 68.8 ? 'alert-badge' : 'normal-badge'}>
                  ● {currentVitals.weight >= 68.8 ? 'Tăng cân' : 'Bình thường'}
                </span>
              </div>
              <p>Cân nặng</p>
              <div className="vital-value-row">
                <strong>{currentVitals.weight ?? '--'}</strong>
                <span className="unit">kg</span>
              </div>
            </div>

            <div className={`vital-card ${currentVitals.systolic >= 160 ? 'vital-card-alert' : ''}`}>
              <div className="vital-top">
                <span className="vital-icon"><BloodPressureIcon size={20} /></span>
                <span className={currentVitals.systolic >= 160 ? 'alert-badge' : 'normal-badge'}>
                  ● {currentVitals.systolic >= 160 ? 'Huyết áp cao' : 'Bình thường'}
                </span>
              </div>
              <p>Huyết áp</p>
              <div className="vital-value-row">
                <strong>{currentVitals.systolic != null ? `${currentVitals.systolic}/${currentVitals.diastolic}` : '--'}</strong>
                <span className="unit">mmHg</span>
              </div>
            </div>

            <div className={`vital-card ${currentVitals.heartRate >= 100 ? 'vital-card-alert' : ''}`}>
              <div className="vital-top">
                <span className="vital-icon"><PulseIcon size={20} /></span>
                <span className={currentVitals.heartRate >= 100 ? 'alert-badge' : 'normal-badge'}>
                  ● {currentVitals.heartRate >= 100 ? 'Nhịp nhanh' : 'Bình thường'}
                </span>
              </div>
              <p>Nhịp tim</p>
              <div className="vital-value-row">
                <strong>{currentVitals.heartRate ?? '--'}</strong>
                <span className="unit">bpm</span>
              </div>
            </div>

            <div className={`vital-card ${currentVitals.spo2 != null && currentVitals.spo2 <= 93 ? 'vital-card-alert' : ''}`}>
              <div className="vital-top">
                <span className="vital-icon"><OxygenIcon size={20} /></span>
                <span className={currentVitals.spo2 != null && currentVitals.spo2 <= 93 ? 'alert-badge' : 'normal-badge'}>
                  ● {currentVitals.spo2 != null && currentVitals.spo2 <= 93 ? 'Thiếu oxy' : 'Bình thường'}
                </span>
              </div>
              <p>SpO₂</p>
              <div className="vital-value-row">
                <strong>{currentVitals.spo2 ?? '--'}</strong>
                <span className="unit">%</span>
              </div>
            </div>
          </div>
        </section>

        {/* Symptoms and Meds */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          <section className="feature-card">
            <h2 style={{ fontSize: '18px', color: 'var(--slate-900)', marginBottom: '14px' }}>
              Triệu chứng cơ năng ghi nhận
            </h2>
            {symptoms.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {symptoms.map((symptom, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '10px 14px',
                      background: 'var(--danger-50)',
                      border: '1px solid var(--danger-200)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--danger-700)',
                      fontWeight: '600',
                      fontSize: '13px'
                    }}
                  >
                    ⚠ {symptom}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '16px', background: 'var(--success-50)', borderRadius: 'var(--radius-md)', color: 'var(--success-700)', fontSize: '13px', fontWeight: 'bold' }}>
                ✓ Không ghi nhận triệu chứng khó thở, phù hay đau ngực.
              </div>
            )}
          </section>

          <section className="feature-card">
            <h2 style={{ fontSize: '18px', color: 'var(--slate-900)', marginBottom: '14px' }}>
              Đơn thuốc duy trì hiện tại
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ padding: '10px 14px', background: 'var(--slate-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-200)' }}>
                <strong style={{ fontSize: '14px', color: 'var(--slate-900)' }}>Furosemide 40 mg</strong>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--slate-500)' }}>Thuốc lợi tiểu · 1 viên/ngày · Uống buổi sáng sau ăn</p>
              </div>
              <div style={{ padding: '10px 14px', background: 'var(--slate-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-200)' }}>
                <strong style={{ fontSize: '14px', color: 'var(--slate-900)' }}>Bisoprolol 2.5 mg</strong>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--slate-500)' }}>Chẹn beta giao cảm · 1 viên/ngày · Uống buổi sáng</p>
              </div>
            </div>
          </section>
        </div>

        {/* History Table */}
        <section className="feature-card">
          <div className="section-title">
            <div>
              <h2>Lịch sử sinh hiệu đã ghi nhận ({history.length} lần đo)</h2>
              <p>Biến thiên các chỉ số theo thời gian để đánh giá đáp ứng điều trị.</p>
            </div>
          </div>

          {history.length === 0 ? (
            <p style={{ color: 'var(--slate-400)', fontStyle: 'italic' }}>Chưa có lịch sử đo sinh hiệu nào.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--slate-50)', borderBottom: '1.5px solid var(--slate-200)', color: 'var(--slate-500)', fontSize: '12px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 14px' }}>Thời gian đo</th>
                    <th style={{ padding: '10px 14px' }}>Cân nặng</th>
                    <th style={{ padding: '10px 14px' }}>Huyết áp</th>
                    <th style={{ padding: '10px 14px' }}>Nhịp tim</th>
                    <th style={{ padding: '10px 14px' }}>SpO₂</th>
                    <th style={{ padding: '10px 14px' }}>Triệu chứng kèm theo</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((record) => {
                    const syms = []
                    if (record.dyspnea) syms.push('Khó thở')
                    if (record.edema) syms.push('Phù')
                    if (record.chestPain) syms.push('Đau ngực')

                    return (
                      <tr key={record.id} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                        <td style={{ padding: '12px 14px', color: 'var(--slate-600)' }}>
                          {new Date(record.createdAt).toLocaleString('vi-VN')}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 'bold' }}>
                          {record.weight} kg
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 'bold' }}>
                          {record.systolic}/{record.diastolic} mmHg
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {record.heartRate} bpm
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {record.spo2}%
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {syms.length > 0 ? (
                            <span style={{ color: 'var(--danger-700)', fontWeight: 'bold' }}>
                              ⚠ {syms.join(', ')}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--slate-400)' }}>Không có</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
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

export default PatientDetail
