import { useState } from 'react'
import {
  ArrowLeftIcon,
  ScaleIcon,
  BloodPressureIcon,
  PulseIcon,
  OxygenIcon,
  AlertTriangleIcon,
  CheckCircleIcon
} from '../components/Icons'

function AddVitals({ onBack, onSave }) {
  const [form, setForm] = useState({
    weight: '',
    systolic: '',
    diastolic: '',
    heartRate: '',
    spo2: '',
    dyspnea: false,
    edema: false,
    chestPain: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const data = {
      ...form,
      weight: Number(form.weight),
      systolic: Number(form.systolic),
      diastolic: Number(form.diastolic),
      heartRate: Number(form.heartRate),
      spo2: Number(form.spo2),
    }

    try {
      const message = await onSave(data)
      if (message) setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="vitals-page">
      <div className="vitals-container narrow-container">
        <button className="back-button" onClick={onBack}>
          <ArrowLeftIcon size={16} />
          <span>Quay lại trang tổng quan</span>
        </button>

        <div className="vitals-header">
          <div>
            <h1>Ghi nhận chỉ số sức khỏe hôm nay</h1>
            <p>
              Nhập các chỉ số sinh hiệu đo được vào buổi sáng sau khi thức dậy và đi vệ sinh.
            </p>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '12px 18px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--danger-50)',
              border: '1px solid var(--danger-200)',
              color: 'var(--danger-700)',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '20px'
            }}
          >
            ⚠ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Card 1: Numeric Vitals */}
          <section className="feature-card">
            <h2 style={{ fontSize: '18px', marginBottom: '16px', color: 'var(--slate-900)' }}>
              1. Các chỉ số đo lường trực tiếp
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ScaleIcon size={16} />
                  <span>Cân nặng (kg)</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  name="weight"
                  placeholder="Ví dụ: 68.5"
                  value={form.weight}
                  onChange={handleChange}
                  required
                />
                <span style={{ fontSize: '11px', color: 'var(--slate-400)' }}>Cảnh báo nếu tăng ≥ 2kg trong 3 ngày</span>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <OxygenIcon size={16} />
                  <span>Độ bão hòa oxy SpO₂ (%)</span>
                </label>
                <input
                  type="number"
                  name="spo2"
                  placeholder="Ví dụ: 98"
                  value={form.spo2}
                  onChange={handleChange}
                  required
                />
                <span style={{ fontSize: '11px', color: 'var(--slate-400)' }}>Ngưỡng bình thường: ≥ 95%</span>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BloodPressureIcon size={16} />
                  <span>Huyết áp tâm thu (Số trên - mmHg)</span>
                </label>
                <input
                  type="number"
                  name="systolic"
                  placeholder="Ví dụ: 120"
                  value={form.systolic}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BloodPressureIcon size={16} />
                  <span>Huyết áp tâm trương (Số dưới - mmHg)</span>
                </label>
                <input
                  type="number"
                  name="diastolic"
                  placeholder="Ví dụ: 80"
                  value={form.diastolic}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <PulseIcon size={16} />
                  <span>Nhịp tim khi nghỉ (lần/phút - bpm)</span>
                </label>
                <input
                  type="number"
                  name="heartRate"
                  placeholder="Ví dụ: 75"
                  value={form.heartRate}
                  onChange={handleChange}
                  required
                />
                <span style={{ fontSize: '11px', color: 'var(--slate-400)' }}>Mục tiêu nhịp tim bệnh nhân suy tim: 60 - 70 bpm</span>
              </div>
            </div>
          </section>

          {/* Card 2: Symptoms */}
          <section className="feature-card">
            <h2 style={{ fontSize: '18px', marginBottom: '6px', color: 'var(--slate-900)' }}>
              2. Đánh giá triệu chứng cơ năng (Hôm nay)
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--slate-500)', marginBottom: '16px' }}>
              Đánh dấu vào các triệu chứng bạn cảm thấy xuất hiện hoặc nặng hơn:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  background: form.dyspnea ? 'var(--danger-50)' : 'var(--slate-50)',
                  border: `1.5px solid ${form.dyspnea ? 'var(--danger-border)' : 'var(--slate-200)'}`,
                  borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <input
                  type="checkbox"
                  name="dyspnea"
                  checked={form.dyspnea}
                  onChange={handleChange}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--danger)' }}
                />
                <div>
                  <strong style={{ display: 'block', fontSize: '14px', color: 'var(--slate-900)' }}>
                    Cảm giác khó thở hoặc hụt hơi
                  </strong>
                  <span style={{ fontSize: '12px', color: 'var(--slate-500)' }}>
                    Khó thở khi đi lại, làm việc nhà hoặc khi nằm đầu bằng vào ban đêm
                  </span>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  background: form.edema ? 'var(--danger-50)' : 'var(--slate-50)',
                  border: `1.5px solid ${form.edema ? 'var(--danger-border)' : 'var(--slate-200)'}`,
                  borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <input
                  type="checkbox"
                  name="edema"
                  checked={form.edema}
                  onChange={handleChange}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--danger)' }}
                />
                <div>
                  <strong style={{ display: 'block', fontSize: '14px', color: 'var(--slate-900)' }}>
                    Phù 2 bàn chân hoặc cẳng chân
                  </strong>
                  <span style={{ fontSize: '12px', color: 'var(--slate-500)' }}>
                    Ấn vào mắt cá hoặc cẳng chân thấy vết lõm, giày dép chật hơn bình thường
                  </span>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  background: form.chestPain ? 'var(--danger-50)' : 'var(--slate-50)',
                  border: `1.5px solid ${form.chestPain ? 'var(--danger-border)' : 'var(--slate-200)'}`,
                  borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <input
                  type="checkbox"
                  name="chestPain"
                  checked={form.chestPain}
                  onChange={handleChange}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--danger)' }}
                />
                <div>
                  <strong style={{ display: 'block', fontSize: '14px', color: 'var(--slate-900)' }}>
                    Đau tức hoặc nặng ngực
                  </strong>
                  <span style={{ fontSize: '12px', color: 'var(--slate-500)' }}>
                    Cảm giác đè nặng sau xương ức, lan lên vai hoặc cánh tay
                  </span>
                </div>
              </label>
            </div>
          </section>

          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onBack}>
              Hủy bỏ
            </button>
            <button className="save-button" type="submit" disabled={submitting}>
              {submitting ? 'Đang gửi chỉ số...' : 'Gửi chỉ số cho Bác sĩ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddVitals
