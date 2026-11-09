import { useEffect, useState } from 'react'

const labels = { registered: 'Chưa tiếp nhận', waiting: 'Chờ khám', called: 'Đã gọi', in_progress: 'Đang khám', waiting_result: 'Chờ kết quả', completed: 'Hoàn thành', absent: 'Vắng mặt' }

function DoctorQueue({ user, onBack, onOpenSupport }) {
  const [visits, setVisits] = useState([])
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ examNotes: '', testInstruction: '', resultDueAt: '', resultMethod: 'Trên ứng dụng', resultText: '', prescription: '', followUpAt: '' })
  const [date] = useState(() => new Date().toISOString().slice(0, 10))

  const load = async () => {
    const response = await fetch(`/api/visits/queue?date=${date}`, { headers: { Authorization: `Bearer ${user.token}` } })
    const data = await response.json()
    setVisits(data.visits || [])
  }
  useEffect(() => { load().catch(console.error) }, [])

  const action = async (id, path, body) => {
    await fetch(`/api/visits/${id}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` }, body: JSON.stringify(body || {}) })
    await load()
  }

  const openResult = (visit) => { setSelected(visit); setForm({ examNotes: visit.exam_notes || '', testInstruction: visit.test_instruction || '', resultDueAt: visit.result_due_at || '', resultMethod: visit.result_method || 'Trên ứng dụng', resultText: visit.result_text || '', prescription: visit.prescription || '', followUpAt: visit.follow_up_at || '' }) }
  const saveResult = async (event) => { event.preventDefault(); await fetch(`/api/visits/${selected.id}/result`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` }, body: JSON.stringify(form) }); setSelected(null); await load() }

  return <div className="feature-page"><div className="feature-container"><button className="back-button" onClick={onBack}>← Quay lại tổng quan</button><div className="feature-header"><div><h1>Hàng đợi khám</h1><p>Quản lý lượt khám ngày {date} và cập nhật kết quả.</p></div></div><section className="feature-card"><div className="queue-summary"><strong>{visits.filter((v) => ['waiting', 'called', 'in_progress'].includes(v.status)).length}</strong><span>lượt đang chờ/xử lý</span></div>{visits.length === 0 && <p className="muted">Chưa có lượt khám trong ngày.</p>}{visits.map((visit) => <div className="queue-row" key={visit.id}><div className="queue-number">{visit.queue_number || '—'}</div><div className="queue-patient"><strong>{visit.patient_name}</strong><p>{visit.patient_code || 'Chưa có mã'} · {visit.specialty}</p><small>{visit.reason}</small></div><span className={`visit-status status-${visit.status}`}>{labels[visit.status]}</span><div className="queue-actions">{visit.status === 'registered' && <button onClick={() => action(visit.id, 'check-in')}>Tiếp nhận</button>}{visit.status === 'waiting' && <><button onClick={() => action(visit.id, 'call')}>Gọi lượt</button><button className="quiet-button" onClick={() => action(visit.id, 'absent')}>Vắng mặt</button></>}{visit.status === 'called' && <button onClick={() => action(visit.id, 'start')}>Bắt đầu khám</button>}{['in_progress', 'waiting_result', 'completed'].includes(visit.status) && <><button onClick={() => openResult(visit)}>Cập nhật kết quả</button><button onClick={() => onOpenSupport(visit)}>Hỗ trợ chuyên môn</button></>}</div></div>)}</section>{selected && <div className="modal-backdrop"><form className="feature-card result-form" onSubmit={saveResult}><div className="feature-header"><div><h2>Kết quả khám: {selected.patient_name}</h2><p>Lượt #{selected.queue_number || '—'}</p></div><button type="button" className="close-button" onClick={() => setSelected(null)}>×</button></div><label>Nội dung khám<textarea value={form.examNotes} onChange={(e) => setForm({ ...form, examNotes: e.target.value })} /></label><label>Kết luận / kết quả<textarea value={form.resultText} onChange={(e) => setForm({ ...form, resultText: e.target.value })} /></label><label>Đơn thuốc và hướng dẫn<textarea value={form.prescription} onChange={(e) => setForm({ ...form, prescription: e.target.value })} /></label><div className="form-grid"><label>Chỉ định xét nghiệm<textarea value={form.testInstruction} onChange={(e) => setForm({ ...form, testInstruction: e.target.value })} /></label><label>Hẹn trả kết quả<input type="datetime-local" value={form.resultDueAt} onChange={(e) => setForm({ ...form, resultDueAt: e.target.value })} /></label><label>Hẹn tái khám<input type="datetime-local" value={form.followUpAt} onChange={(e) => setForm({ ...form, followUpAt: e.target.value })} /></label></div><div className="form-actions"><button type="button" className="cancel-button" onClick={() => setSelected(null)}>Hủy</button><button className="save-button">Hoàn tất và gửi thông báo</button></div></form></div>}</div></div>
}

export default DoctorQueue
