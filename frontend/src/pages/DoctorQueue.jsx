import { useEffect, useState } from 'react'
import { VisitVitals } from './AddVitals'
import {
  ArrowLeftIcon,
  ClockIcon,
  SparklesIcon
} from '../components/Icons'

const statusLabels = {
  registered: 'Chờ tiếp nhận',
  waiting: 'Đang xếp hàng',
  called: 'Đã gọi lượt',
  in_progress: 'Đang khám',
  waiting_result: 'Chờ kết quả CLS',
  completed: 'Khám hoàn thành',
  absent: 'Vắng mặt'
}

function DoctorQueue({ user, onBack, onOpenSupport }) {
  const [visits, setVisits] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({
    examNotes: '',
    testInstruction: '',
    resultDueAt: '',
    resultMethod: 'Trên ứng dụng',
    resultText: '',
    prescription: '',
    followUpAt: ''
  })
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))

  const load = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/visits/queue?date=${date}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      })
      const data = await response.json()
      setVisits(data.visits || [])
    } catch (err) {
      console.error('Không thể tải hàng đợi khám:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [date])

  const action = async (id, path, body) => {
    await fetch(`/api/visits/${id}/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user.token}`
      },
      body: JSON.stringify(body || {})
    })
    await load()
  }

  const openResult = (visit) => {
    setSelected(visit)
    setForm({
      examNotes: visit.exam_notes || '',
      testInstruction: visit.test_instruction || '',
      resultDueAt: visit.result_due_at || '',
      resultMethod: visit.result_method || 'Trên ứng dụng',
      resultText: visit.result_text || '',
      prescription: visit.prescription || '',
      followUpAt: visit.follow_up_at || ''
    })
  }

  const saveResult = async (event) => {
    event.preventDefault()
    await fetch(`/api/visits/${selected.id}/result`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user.token}`
      },
      body: JSON.stringify(form)
    })
    setSelected(null)
    await load()
  }

  const activeCount = visits.filter((v) =>
    ['waiting', 'called', 'in_progress'].includes(v.status)
  ).length

  return (
    <div className="feature-page">
      <div className="feature-container">
        <button className="back-button" onClick={onBack}>
          <ArrowLeftIcon size={16} />
          <span>Quay lại trang tổng quan</span>
        </button>

        <div className="feature-header">
          <div>
            <h1>Hàng đợi khám lâm sàng</h1>
            <p>Điều phối lượt khám, gọi bệnh nhân và ghi nhận kết quả khám ngày {date}.</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1.5px solid var(--slate-200)',
                borderRadius: 'var(--radius-md)',
                fontSize: '14px',
                fontWeight: '600'
              }}
            />
            <button className="primary-action" onClick={load}>
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        <section className="feature-card">
          <div className="queue-summary">
            <strong>{activeCount}</strong>
            <span>lượt bệnh nhân đang chờ hoặc trong phòng khám</span>
          </div>

          {loading && (
            <p style={{ color: 'var(--slate-500)', padding: '24px 0' }}>Đang nạp danh sách lượt khám...</p>
          )}

          {!loading && visits.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--slate-400)' }}>
              <ClockIcon size={40} className="mb-2" />
              <h3>Chưa có lượt khám nào trong ngày</h3>
              <p>Các lượt đăng ký trực tuyến hoặc tiếp đón tại quầy sẽ hiển thị tại đây.</p>
            </div>
          )}

          {!loading && visits.map((visit) => (
            <div className="queue-row" key={visit.id}>
              <div className="queue-number">
                {visit.queue_number ? `#${visit.queue_number}` : '—'}
              </div>

              <div className="queue-patient">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong>{visit.patient_name}</strong>
                  <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 'bold' }}>
                    {visit.patient_code || 'Chưa cấp mã'}
                  </span>
                </div>
                <p>
                  Chuyên khoa: <strong>{visit.specialty}</strong> {visit.room ? `· ${visit.room}` : ''}
                </p>
                <small style={{ color: 'var(--slate-600)' }}>Lý do khám: {visit.reason}</small>
                <VisitVitals visit={visit} />
              </div>

              <span className={`visit-status status-${visit.status}`}>
                ● {statusLabels[visit.status] || visit.status}
              </span>

              <div className="queue-actions">
                {visit.status === 'waiting' && (
                  <>
                    <button
                      onClick={() => action(visit.id, 'call')}
                      style={{ background: 'var(--cardio)' }}
                    >
                      Gọi loa vào khám
                    </button>
                    <button
                      className="quiet-button"
                      onClick={() => action(visit.id, 'absent')}
                    >
                      Báo vắng mặt
                    </button>
                  </>
                )}

                {visit.status === 'called' && (
                  <button
                    onClick={() => action(visit.id, 'start')}
                    style={{ background: 'var(--success)' }}
                  >
                    Bắt đầu khám
                  </button>
                )}

                {['in_progress', 'waiting_result', 'completed'].includes(visit.status) && (
                  <>
                    <button
                      onClick={() => openResult(visit)}
                      style={{ background: 'var(--primary)' }}
                    >
                      Ghi kết luận & Đơn
                    </button>
                    <button
                      onClick={() => onOpenSupport(visit)}
                      style={{
                        background: 'linear-gradient(135deg, #7e22ce 0%, #a855f7 100%)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <SparklesIcon size={14} />
                      <span>AI-CDSS</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </section>

        {selected && (
          <div className="modal-backdrop" onClick={() => setSelected(null)}>
            <form
              className="feature-card result-form"
              onSubmit={saveResult}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="feature-header" style={{ marginBottom: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', color: 'var(--slate-900)' }}>
                    Cập nhật kết quả khám: {selected.patient_name}
                  </h2>
                  <p style={{ margin: 0 }}>Số thứ tự: #{selected.queue_number || '—'} · {selected.specialty}</p>
                </div>
                <button
                  type="button"
                  className="close-button"
                  onClick={() => setSelected(null)}
                >
                  ×
                </button>
              </div>

              <div className="form-group">
                <label>Nội dung thăm khám lâm sàng</label>
                <textarea
                  value={form.examNotes}
                  onChange={(e) => setForm({ ...form, examNotes: e.target.value })}
                  placeholder="Tiếng tim T1, T2, rale ẩm phổi, tình trạng phù ngoại vi, phân độ NYHA..."
                />
              </div>

              <div className="form-group">
                <label>Kết luận chẩn đoán</label>
                <textarea
                  value={form.resultText}
                  onChange={(e) => setForm({ ...form, resultText: e.target.value })}
                  placeholder="Ví dụ: Suy tim mạn tính NYHA II do bệnh tim thiếu máu cục bộ, chức năng tâm thu giảm nhẹ..."
                />
              </div>

              <div className="form-group">
                <label>Đơn thuốc và hướng dẫn dùng</label>
                <textarea
                  value={form.prescription}
                  onChange={(e) => setForm({ ...form, prescription: e.target.value })}
                  placeholder="Tên thuốc, liều lượng, số lần dùng trong ngày và dặn dò chế độ ăn giảm muối..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '12px' }}>
                <div className="form-group">
                  <label>Chỉ định CLS / Xét nghiệm</label>
                  <input
                    value={form.testInstruction}
                    onChange={(e) => setForm({ ...form, testInstruction: e.target.value })}
                    placeholder="Điện giải đồ, BNP, siêu âm tim..."
                  />
                </div>

                <div className="form-group">
                  <label>Hẹn trả kết quả CLS</label>
                  <input
                    type="datetime-local"
                    value={form.resultDueAt}
                    onChange={(e) => setForm({ ...form, resultDueAt: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Hẹn lịch tái khám</label>
                  <input
                    type="datetime-local"
                    value={form.followUpAt}
                    onChange={(e) => setForm({ ...form, followUpAt: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setSelected(null)}
                >
                  Đóng
                </button>
                <button className="save-button" type="submit">
                  Lưu kết quả & Gửi thông báo bệnh nhân
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

export default DoctorQueue
