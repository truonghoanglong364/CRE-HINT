import { useState } from 'react'
import {
  ScaleIcon,
  BloodPressureIcon,
  PulseIcon,
  OxygenIcon,
} from '../components/Icons'

const SYMPTOMS = [
  { name: 'dyspnea', label: 'Khó thở hoặc hụt hơi', hint: 'Khó thở khi đi lại, làm việc nhà hoặc khi nằm đầu bằng vào ban đêm' },
  { name: 'edema', label: 'Phù 2 bàn chân hoặc cẳng chân', hint: 'Ấn vào mắt cá hoặc cẳng chân thấy vết lõm' },
  { name: 'chestPain', label: 'Đau tức hoặc nặng ngực', hint: 'Cảm giác đè nặng sau xương ức, lan lên vai hoặc cánh tay' },
]

const labelStyle = { display: 'flex', alignItems: 'center', gap: '6px' }
const hintStyle = { fontSize: '11px', color: 'var(--slate-400)' }
const sectionTitle = { fontSize: '16px', margin: '20px 0 12px', color: 'var(--slate-900)' }

// Nhân viên y tế đo sinh hiệu khi tiếp nhận, cấp số và chuyển lượt khám cho bác sĩ.
function AddVitals({ user, visit, doctors, defaultRoom, onClose, onDone }) {
  const [form, setForm] = useState({
    weight: '', systolic: '', diastolic: '', heartRate: '', spo2: '',
    dyspnea: false, edema: false, chestPain: false,
  })
  const [doctorId, setDoctorId] = useState(
    visit.doctor_id ? String(visit.doctor_id) : doctors[0]?.id ? String(doctors[0].id) : ''
  )
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
    <div className="modal-backdrop" onClick={onClose}>
      <form className="feature-card result-form" onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
        <div className="feature-header" style={{ marginBottom: '8px' }}>
          <div>
            <h2 style={{ fontSize: '20px', color: 'var(--slate-900)' }}>Tiếp nhận: {visit.patient_name}</h2>
            <p style={{ margin: 0 }}>{visit.patient_code || 'Chưa cấp mã'} · {visit.specialty} · {visit.reason}</p>
          </div>
          <button type="button" className="close-button" onClick={onClose} aria-label="Đóng">×</button>
        </div>

        {error && (
          <div style={{
            padding: '12px 18px', borderRadius: 'var(--radius-md)', background: 'var(--danger-50)',
            border: '1px solid var(--danger-200)', color: 'var(--danger-700)', fontSize: '14px', fontWeight: '600',
          }}>
            ⚠ {error}
          </div>
        )}

        <h3 style={sectionTitle}>1. Chỉ số sinh hiệu</h3>
        <div className="vitals-intake-grid">
          <div className="form-group">
            <label style={labelStyle}><ScaleIcon size={16} /><span>Cân nặng (kg)</span></label>
            <input type="number" step="0.1" name="weight" placeholder="Ví dụ: 68.5" value={form.weight} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label style={labelStyle}><OxygenIcon size={16} /><span>SpO₂ (%)</span></label>
            <input type="number" min="0" max="100" name="spo2" placeholder="Ví dụ: 98" value={form.spo2} onChange={handleChange} required />
            <span style={hintStyle}>Ngưỡng bình thường: ≥ 95%</span>
          </div>
          <div className="form-group">
            <label style={labelStyle}><BloodPressureIcon size={16} /><span>Huyết áp tâm thu (mmHg)</span></label>
            <input type="number" name="systolic" placeholder="Ví dụ: 120" value={form.systolic} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label style={labelStyle}><BloodPressureIcon size={16} /><span>Huyết áp tâm trương (mmHg)</span></label>
            <input type="number" name="diastolic" placeholder="Ví dụ: 80" value={form.diastolic} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label style={labelStyle}><PulseIcon size={16} /><span>Nhịp tim khi nghỉ (bpm)</span></label>
            <input type="number" name="heartRate" placeholder="Ví dụ: 75" value={form.heartRate} onChange={handleChange} required />
          </div>
        </div>

        <h3 style={sectionTitle}>2. Triệu chứng ghi nhận</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {SYMPTOMS.map((s) => (
            <label key={s.name} style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', cursor: 'pointer',
              background: form[s.name] ? 'var(--danger-50)' : 'var(--slate-50)',
              border: `1.5px solid ${form[s.name] ? 'var(--danger-border)' : 'var(--slate-200)'}`,
              borderRadius: 'var(--radius-lg)', transition: 'all 0.15s',
            }}>
              <input type="checkbox" name={s.name} checked={form[s.name]} onChange={handleChange}
                style={{ width: '18px', height: '18px', accentColor: 'var(--danger)' }} />
              <div>
                <strong style={{ display: 'block', fontSize: '14px', color: 'var(--slate-900)' }}>{s.label}</strong>
                <span style={{ fontSize: '12px', color: 'var(--slate-500)' }}>{s.hint}</span>
              </div>
            </label>
          ))}
        </div>

        <h3 style={sectionTitle}>3. Chuyển cho bác sĩ</h3>
        <div className="vitals-intake-grid">
          <div className="form-group">
            <label>Bác sĩ phụ trách</label>
            <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} required>
              <option value="" disabled>-- Chọn bác sĩ --</option>
              {doctors.map((d) => <option key={d.id} value={d.id}>BS. {d.fullName}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Phòng khám</label>
            <input value={room} onChange={(e) => setRoom(e.target.value)} required />
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="cancel-button" onClick={onClose}>Hủy bỏ</button>
          <button className="save-button" type="submit" disabled={submitting}>
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
  const symptoms = [visit.vital_dyspnea && 'Khó thở', visit.vital_edema && 'Phù chân', visit.vital_chest_pain && 'Đau ngực'].filter(Boolean)
  return (
    <div className="visit-vitals" title={visit.vital_recorded_by ? `Đo bởi ${visit.vital_recorded_by}` : undefined}>
      <span className={visit.vital_weight >= 68.8 ? 'vital-flag' : ''}>⚖ {visit.vital_weight} kg</span>
      <span className={visit.vital_systolic >= 160 ? 'vital-flag' : ''}>HA {visit.vital_systolic}/{visit.vital_diastolic}</span>
      <span className={visit.vital_heart_rate >= 100 ? 'vital-flag' : ''}>♥ {visit.vital_heart_rate} bpm</span>
      <span className={visit.vital_spo2 <= 93 ? 'vital-flag' : ''}>SpO₂ {visit.vital_spo2}%</span>
      {symptoms.map((s) => <span key={s} className="vital-flag">{s}</span>)}
    </div>
  )
}
