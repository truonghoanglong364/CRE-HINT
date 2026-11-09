import { useEffect, useState } from 'react'

function ClinicalSupport({ user, visit, onBack }) {
  const [data, setData] = useState({ visit, hospitalData: null, aiSupport: null, versions: [] })
  const [feedback, setFeedback] = useState('')
  const [confirmedPlan, setConfirmedPlan] = useState('')
  const [draft, setDraft] = useState({ examNotes: '', resultText: '', prescription: '', followUpAt: '' })
  const [message, setMessage] = useState('')
  const [templates, setTemplates] = useState([])
  const [newTemplateName, setNewTemplateName] = useState('')

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` }
  const load = async () => {
    const response = await fetch(`/api/visits/${visit.id}/clinical-support`, { headers })
    const next = await response.json()
    setData(next)
    if (next.visit) setDraft({ examNotes: next.visit.exam_notes || '', resultText: next.visit.result_text || '', prescription: next.visit.prescription || '', followUpAt: next.visit.follow_up_at || '' })
  }
  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/templates', { headers })
      const data = await response.json()
      if (response.ok) setTemplates(data.templates)
    } catch {}
  }
  useEffect(() => { load().catch((error) => setMessage(error.message)); loadTemplates() }, [])

  const applyTemplate = async (template) => {
    setDraft({ examNotes: template.exam_notes || '', resultText: template.result_text || '', prescription: template.prescription || '', followUpAt: draft.followUpAt })
    await fetch(`/api/templates/${template.id}/use`, { method: 'POST', headers })
    loadTemplates()
    setMessage(`Đã áp dụng mẫu "${template.name}"`)
  }
  const saveAsTemplate = async () => {
    if (!newTemplateName.trim()) return
    await fetch('/api/templates', { method: 'POST', headers, body: JSON.stringify({ name: newTemplateName, examNotes: draft.examNotes, resultText: draft.resultText, prescription: draft.prescription }) })
    setNewTemplateName('')
    loadTemplates()
    setMessage('Đã lưu mẫu kết quả khám mới.')
  }
  const deleteTemplate = async (id) => {
    await fetch(`/api/templates/${id}`, { method: 'DELETE', headers })
    loadTemplates()
  }

  const receiveData = async () => { await fetch(`/api/visits/${visit.id}/mock-hospital-data`, { method: 'POST', headers, body: JSON.stringify({ sourceSystem: 'HIS/EMR mô phỏng' }) }); await load() }
  const runAi = async () => { const response = await fetch(`/api/visits/${visit.id}/ai-support`, { method: 'POST', headers, body: '{}' }); const result = await response.json(); setMessage(result.message || 'Đã chạy hỗ trợ chuyên môn mô phỏng.'); await load() }
  const reviewAi = async (status) => { await fetch(`/api/visits/${visit.id}/ai-review`, { method: 'PUT', headers, body: JSON.stringify({ status, feedback, confirmedPlan }) }); await load() }
  const saveDraft = async () => { await fetch(`/api/visits/${visit.id}/draft`, { method: 'PUT', headers, body: JSON.stringify(draft) }); setMessage('Đã lưu bản nháp kết quả.'); await load() }
  const publish = async () => { await saveDraft(); await fetch(`/api/visits/${visit.id}/publish`, { method: 'POST', headers, body: '{}' }); setMessage('Đã xác nhận và công bố kết quả cho bệnh nhân.'); await load() }
  const restore = async (versionId) => { await fetch(`/api/visits/${visit.id}/restore-version`, { method: 'POST', headers, body: JSON.stringify({ versionId }) }); setMessage('Đã khôi phục phiên bản backup thành bản nháp.'); await load() }

  const ai = data.aiSupport
  return <div className="feature-page"><div className="feature-container"><button className="back-button" onClick={onBack}>← Quay lại hàng đợi</button><div className="feature-header"><div><h1>Hỗ trợ chuyên môn</h1><p>{data.visit?.patient_name} · Lượt #{data.visit?.queue_number || '—'}</p></div><span className="simulation-badge">Kết quả mô phỏng</span></div><section className="feature-card"><div className="clinical-section-heading"><div><h2>Tiếp nhận dữ liệu bệnh viện</h2><p>Kiểm tra dữ liệu HIS/EMR, LIS và PACS/RIS trước khi hỗ trợ chuyên môn.</p></div><button className="primary-action" onClick={receiveData}>Nhập dữ liệu mẫu</button></div>{data.hospitalData ? <div className="data-check"><strong>Nguồn: {data.hospitalData.source_system}</strong><span>Nhận lúc: {new Date(data.hospitalData.received_at).toLocaleString('vi-VN')}</span><span>Trạng thái: {data.hospitalData.validation_status}</span><p>Dữ liệu thiếu: {data.hospitalData.missing_fields || 'Không có'}</p><small>{data.hospitalData.duplicate_check}</small></div> : <p className="muted">Chưa có dữ liệu bệnh viện mô phỏng.</p>}</section><section className="feature-card"><div className="clinical-section-heading"><div><h2>AI-CDSS mô phỏng</h2><p>Dữ liệu chỉ mang tính hỗ trợ, bác sĩ là người quyết định cuối cùng.</p></div><button className="primary-action" disabled={!data.hospitalData} onClick={runAi}>Chạy hỗ trợ chuyên môn</button></div>{ai ? <><div className="ai-grid"><AiBox title="Diagnosis" value={ai.diagnosis} /><AiBox title="Lab/Test" value={ai.lab_test} /><AiBox title="Treatment" value={ai.treatment} /><AiBox title="MedSafety" value={ai.med_safety} /></div><p className="missing-data"><strong>Dữ liệu còn thiếu:</strong> {ai.missing_data}</p><div className="review-actions"><strong>Phản hồi của bác sĩ:</strong><div><button onClick={() => reviewAi('accepted')}>Chấp nhận</button><button onClick={() => reviewAi('adjusted')}>Điều chỉnh</button><button className="danger-button" onClick={() => reviewAi('rejected')}>Từ chối</button></div><textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Nội dung điều chỉnh hoặc lý do từ chối" /><textarea value={confirmedPlan} onChange={(event) => setConfirmedPlan(event.target.value)} placeholder="Kế hoạch đã được bác sĩ xác nhận" /></div><p className="review-status">Trạng thái: {ai.review_status}</p></> : <p className="muted">Chưa chạy hỗ trợ chuyên môn.</p>}</section><section className="feature-card"><div className="clinical-section-heading"><div><h2>Kết quả và kế hoạch điều trị</h2><p>Bản nháp chỉ được bệnh nhân xem sau khi bác sĩ công bố.</p></div><span className={`visit-status status-${data.visit?.result_status || 'draft'}`}>{data.visit?.result_status === 'published' ? 'Đã công bố' : 'Bản nháp'}</span></div>{templates.length > 0 && <div className="template-section"><h3>Mẫu kết quả khám</h3><div className="template-list">{templates.map((t) => <div className="template-item" key={t.id}><div><span className="template-name">{t.name}</span><span className="template-uses"> · dùng {t.usage_count} lần</span></div><div className="template-actions"><button className="use-btn" onClick={() => applyTemplate(t)}>Áp dụng</button><button className="delete-btn" onClick={() => deleteTemplate(t.id)}>Xóa</button></div></div>)}</div></div>}<div className="save-template-row"><input placeholder="Tên mẫu mới..." value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} /><button onClick={saveAsTemplate}>Lưu thành mẫu</button></div><label>Nội dung khám<textarea value={draft.examNotes} onChange={(event) => setDraft({ ...draft, examNotes: event.target.value })} /></label><label>Kết luận<textarea value={draft.resultText} onChange={(event) => setDraft({ ...draft, resultText: event.target.value })} /></label><label>Đơn thuốc / hướng dẫn<textarea value={draft.prescription} onChange={(event) => setDraft({ ...draft, prescription: event.target.value })} /></label><label>Lịch tái khám<input type="datetime-local" value={draft.followUpAt} onChange={(event) => setDraft({ ...draft, followUpAt: event.target.value })} /></label><div className="form-actions"><button className="cancel-button" onClick={saveDraft}>Lưu bản nháp</button><button className="save-button" onClick={publish}>Xác nhận và công bố</button></div>{data.versions?.length > 0 && <div className="version-history"><strong>Backup phiên bản</strong>{data.versions.map((version) => <div className="version-row" key={version.id}><span>Phiên bản {version.version_no} · {new Date(version.created_at).toLocaleString('vi-VN')}</span><button type="button" onClick={() => restore(version.id)}>Khôi phục</button></div>)}</div>}{message && <p className="success-message">{message}</p>}</section></div></div>
}

function AiBox({ title, value }) { return <div className="ai-box"><strong>{title}</strong><p>{value}</p></div> }

export default ClinicalSupport
