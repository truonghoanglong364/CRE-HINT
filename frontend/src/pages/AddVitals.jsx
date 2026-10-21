import { useState } from 'react'

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
      <div className="vitals-container">
        <button className="back-button" onClick={onBack}>
          ← Quay lại tổng quan
        </button>

        <div className="vitals-header">
          <h1>Ghi nhận chỉ số hôm nay</h1>
          <p>
            Nhập các chỉ số sức khỏe mới nhất để bác sĩ có thể theo dõi
            tình trạng của bạn.
          </p>
        </div>

        <form className="vitals-form" onSubmit={handleSubmit}>
          <h2>Chỉ số sinh hiệu</h2>

          <div className="form-grid">
            <div className="vital-input">
              <label>Cân nặng</label>
              <div>
                <input
                  name="weight"
                  type="number"
                  step="0.1"
                  placeholder="VD: 68.5"
                  value={form.weight}
                  onChange={handleChange}
                  required
                />
                <span>kg</span>
              </div>
            </div>

            <div className="vital-input">
              <label>Huyết áp tâm thu</label>
              <div>
                <input
                  name="systolic"
                  type="number"
                  placeholder="VD: 125"
                  value={form.systolic}
                  onChange={handleChange}
                  required
                />
                <span>mmHg</span>
              </div>
            </div>

            <div className="vital-input">
              <label>Huyết áp tâm trương</label>
              <div>
                <input
                  name="diastolic"
                  type="number"
                  placeholder="VD: 80"
                  value={form.diastolic}
                  onChange={handleChange}
                  required
                />
                <span>mmHg</span>
              </div>
            </div>

            <div className="vital-input">
              <label>Nhịp tim</label>
              <div>
                <input
                  name="heartRate"
                  type="number"
                  placeholder="VD: 78"
                  value={form.heartRate}
                  onChange={handleChange}
                  required
                />
                <span>bpm</span>
              </div>
            </div>

            <div className="vital-input">
              <label>SpO₂</label>
              <div>
                <input
                  name="spo2"
                  type="number"
                  placeholder="VD: 98"
                  value={form.spo2}
                  onChange={handleChange}
                  required
                />
                <span>%</span>
              </div>
            </div>
          </div>

          <div className="symptoms-section">
            <h2>Triệu chứng hiện tại</h2>
            <p>Chọn những triệu chứng bạn đang gặp phải.</p>

            <div className="symptom-grid">
              <label>
                <input
                  type="checkbox"
                  name="dyspnea"
                  checked={form.dyspnea}
                  onChange={handleChange}
                />
                <span>
                  <strong>Khó thở</strong>
                  <small>Cảm thấy khó thở hơn bình thường</small>
                </span>
              </label>

              <label>
                <input
                  type="checkbox"
                  name="edema"
                  checked={form.edema}
                  onChange={handleChange}
                />
                <span>
                  <strong>Phù chân</strong>
                  <small>Sưng hoặc phù ở chân, mắt cá chân</small>
                </span>
              </label>

              <label>
                <input
                  type="checkbox"
                  name="chestPain"
                  checked={form.chestPain}
                  onChange={handleChange}
                />
                <span>
                  <strong>Đau ngực</strong>
                  <small>Cảm giác đau hoặc tức vùng ngực</small>
                </span>
              </label>
            </div>
          </div>

          {error && <p className="register-error" role="alert">{error}</p>}

          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onBack}>
              Hủy
            </button>

            <button type="submit" className="save-button" disabled={submitting}>
              {submitting ? 'Đang gửi...' : 'Gửi chỉ số cho bác sĩ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddVitals