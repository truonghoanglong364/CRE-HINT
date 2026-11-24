import { useState } from 'react'

const MEASUREMENTS = [
  { name: 'weight', label: 'Cân nặng', unit: 'kg', placeholder: 'VD: 68.5', step: '0.1' },
  { name: 'systolic', label: 'Huyết áp tâm thu', unit: 'mmHg', placeholder: 'VD: 125' },
  { name: 'diastolic', label: 'Huyết áp tâm trương', unit: 'mmHg', placeholder: 'VD: 80' },
  { name: 'heartRate', label: 'Nhịp tim', unit: 'bpm', placeholder: 'VD: 78' },
  { name: 'spo2', label: 'SpO₂', unit: '%', placeholder: 'VD: 98', min: 0, max: 100 },
]

const SYMPTOMS = [
  { name: 'dyspnea', label: 'Khó thở', hint: 'Bệnh nhân khó thở hơn bình thường' },
  { name: 'edema', label: 'Phù chân', hint: 'Sưng hoặc phù ở chân, mắt cá chân' },
  { name: 'chestPain', label: 'Đau ngực', hint: 'Đau hoặc tức vùng ngực' },
]

// Form dành cho nhân viên y tế: đo sinh hiệu khi tiếp nhận và chuyển lượt khám cho bác sĩ.
function AddVitals({ user, visit, doctors, defaultRoom, onClose, onDone }) {
  const [form, setForm] = useState({
    weight: '', systolic: '', diastolic: '', heartRate: '', spo2: '',
    dyspnea: false, edema: false, chestPain: false,
  })
  const [doctorId, setDoctorId] = useState(visit.doctor_id ? String(visit.doctor_id) : doctors[0]?.id ? String(doctors[0].id) : '')
  const [room, setRoom] = useState(visit.room || defaultRoom || 'Phòng khám Tim mạch 01')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const vitals = {
        ...form,
        weight: Number(form.weight), systolic: Number(form.systolic), diastolic: Number(form.diastolic),
        heartRate: Number(form.heartRate), spo2: Number(form.spo2),
      }
      const response = await fetch(`/api/visits/${visit.id}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({ vitals, doctorId: Number(doctorId), room }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) { setError(data.message || 'Không thể tiếp nhận lượt khám.'); return }
      onDone(data.visit)
    } catch {
      setError('Không thể kết nối tới server!')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <form className="vitals-form result-form" onSubmit={handleSubmit}>
        <div className="feature-header">
          <div>
            <h2>Tiếp nhận: {visit.patient_name}</h2>
            <p>{visit.patient_code || 'Chưa có mã'} · {visit.specialty} · {visit.reason}</p>
          </div>
          <button type="button" className="close-button" onClick={onClose}>×</button>
        </div>

        <h2>Chỉ số sinh hiệu</h2>
        <div className="form-grid">
          {MEASUREMENTS.map((m) => (
            <div className="vital-input" key={m.name}>
              <label>{m.label}</label>
              <div>
                <input name={m.name} type="number" step={m.step} min={m.min} max={m.max} placeholder={m.placeholder}
                  value={form[m.name]} onChange={handleChange} required />
                <span>{m.unit}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="symptoms-section">
          <h2>Triệu chứng ghi nhận</h2>
          <p>Đánh dấu các triệu chứng bệnh nhân đang gặp phải.</p>
          <div className="symptom-grid">
            {SYMPTOMS.map((s) => (
              <label key={s.name}>
                <input type="checkbox" name={s.name} checked={form[s.name]} onChange={handleChange} />
                <span><strong>{s.label}</strong><small>{s.hint}</small></span>
              </label>
            ))}
          </div>
        </div>

        <div className="symptoms-section">
          <h2>Chuyển cho bác sĩ</h2>
          <div className="form-grid handoff-grid">
            <label>Bác sĩ phụ trách
              <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} required>
                <option value="" disabled>-- Chọn bác sĩ --</option>
                {doctors.map((d) => <option key={d.id} value={d.id}>{d.fullName}</option>)}
              </select>
            </label>
            <label>Phòng khám
              <input value={room} onChange={(e) => setRoom(e.target.value)} required />
            </label>
          </div>
        </div>

        {error && <p className="register-error" role="alert">{error}</p>}

        <div className="form-actions">
          <button type="button" className="cancel-button" onClick={onClose}>Hủy</button>
          <button type="submit" className="save-button" disabled={submitting}>
            {submitting ? 'Đang gửi...' : 'Cấp số & chuyển bác sĩ'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddVitals

// Tóm tắt sinh hiệu đã đo của một lượt khám (dữ liệu từ /api/visits/queue).
export function VisitVitals({ visit }) {
  if (visit.vital_weight == null) return null
  const flags = {
    weight: visit.vital_weight >= 68.8,
    bp: visit.vital_systolic >= 160,
    hr: visit.vital_heart_rate >= 100,
    spo2: visit.vital_spo2 <= 93,
  }
  const symptoms = [visit.vital_dyspnea && 'Khó thở', visit.vital_edema && 'Phù chân', visit.vital_chest_pain && 'Đau ngực'].filter(Boolean)
  return (
    <div className="visit-vitals" title={visit.vital_recorded_by ? `Đo bởi ${visit.vital_recorded_by}` : undefined}>
      <span className={flags.weight ? 'vital-flag' : ''}>⚖ {visit.vital_weight} kg</span>
      <span className={flags.bp ? 'vital-flag' : ''}>HA {visit.vital_systolic}/{visit.vital_diastolic}</span>
      <span className={flags.hr ? 'vital-flag' : ''}>♥ {visit.vital_heart_rate} bpm</span>
      <span className={flags.spo2 ? 'vital-flag' : ''}>SpO₂ {visit.vital_spo2}%</span>
      {symptoms.map((s) => <span key={s} className="vital-flag">{s}</span>)}
    </div>
  )
}
