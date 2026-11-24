import { useEffect, useState } from 'react'
import {
  ArrowLeftIcon,
  SparklesIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  FileTextIcon,
  RefreshCwIcon
} from '../components/Icons'

function ClinicalSupport({ user, visit, onBack }) {
  const [data, setData] = useState({
    visit,
    hospitalData: null,
    aiSupport: null,
    versions: []
  })
  const [feedback, setFeedback] = useState('')
  const [confirmedPlan, setConfirmedPlan] = useState('')
  const [draft, setDraft] = useState({
    examNotes: '',
    resultText: '',
    prescription: '',
    followUpAt: ''
  })
  const [message, setMessage] = useState('')
  const [templates, setTemplates] = useState([])
  const [newTemplateName, setNewTemplateName] = useState('')
  const [loading, setLoading] = useState(false)

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${user.token}`
  }

  const load = async () => {
    try {
      const response = await fetch(`/api/visits/${visit.id}/clinical-support`, { headers })
      const next = await response.json()
      setData(next)
      if (next.visit) {
        setDraft({
          examNotes: next.visit.exam_notes || '',
          resultText: next.visit.result_text || '',
          prescription: next.visit.prescription || '',
          followUpAt: next.visit.follow_up_at || ''
        })
      }
    } catch (err) {
      setMessage(err.message)
    }
  }

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/templates', { headers })
      const res = await response.json()
      if (response.ok) setTemplates(res.templates)
    } catch {}
  }

  useEffect(() => {
    load()
    loadTemplates()
  }, [])

  const applyTemplate = async (template) => {
    setDraft({
      examNotes: template.exam_notes || '',
      resultText: template.result_text || '',
      prescription: template.prescription || '',
      followUpAt: draft.followUpAt
    })
    await fetch(`/api/templates/${template.id}/use`, { method: 'POST', headers })
    loadTemplates()
    setMessage(`Đã áp dụng mẫu "${template.name}"`)
  }

  const saveAsTemplate = async () => {
    if (!newTemplateName.trim()) return
    await fetch('/api/templates', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: newTemplateName,
        examNotes: draft.examNotes,
        resultText: draft.resultText,
        prescription: draft.prescription
      })
    })
    setNewTemplateName('')
    loadTemplates()
    setMessage('Đã lưu mẫu kết quả khám mới thành công!')
  }

  const deleteTemplate = async (id) => {
    await fetch(`/api/templates/${id}`, { method: 'DELETE', headers })
    loadTemplates()
  }

  const receiveData = async () => {
    setLoading(true)
    await fetch(`/api/visits/${visit.id}/mock-hospital-data`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ sourceSystem: 'HIS/EMR Viện Tim Mạch' })
    })
    await load()
    setLoading(false)
    setMessage('Đã nạp gói dữ liệu bệnh viện thành công!')
  }

  const runAi = async () => {
    setLoading(true)
    const response = await fetch(`/api/visits/${visit.id}/ai-support`, {
      method: 'POST',
      headers,
      body: '{}'
    })
    const result = await response.json()
    setMessage(result.message || 'Đã phân tích hỗ trợ chuyên môn AI-CDSS.')
    await load()
    setLoading(false)
  }

  const reviewAi = async (status) => {
    await fetch(`/api/visits/${visit.id}/ai-review`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ status, feedback, confirmedPlan })
    })
    await load()
    setMessage(`Bác sĩ đã đánh giá gợi ý AI: "${status === 'accepted' ? 'Chấp nhận' : status === 'adjusted' ? 'Điều chỉnh' : 'Từ chối'}"`)
  }

  const saveDraft = async () => {
    await fetch(`/api/visits/${visit.id}/draft`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(draft)
    })
    setMessage('Đã lưu bản nháp kết quả khám.')
    await load()
  }

  const publish = async () => {
    await saveDraft()
    await fetch(`/api/visits/${visit.id}/publish`, {
      method: 'POST',
      headers,
      body: '{}'
    })
    setMessage('Đã phê duyệt và công bố hồ sơ cho bệnh nhân thành công!')
    await load()
  }

  const restore = async (versionId) => {
    await fetch(`/api/visits/${visit.id}/restore-version`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ versionId })
    })
    setMessage('Đã khôi phục phiên bản backup thành bản nháp.')
    await load()
  }

  const ai = data.aiSupport

  return (
    <div className="feature-page">
      <div className="feature-container">
        <button className="back-button" onClick={onBack}>
          <ArrowLeftIcon size={16} />
          <span>Quay lại hàng đợi khám</span>
        </button>

        <div className="feature-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1>Hỗ trợ chuyên môn AI-CDSS</h1>
              <span className="simulation-badge">
                <SparklesIcon size={14} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} />
                Mô hình suy luận hỗ trợ
              </span>
            </div>
            <p>
              Bệnh nhân: <strong>{data.visit?.patient_name}</strong> · Mã: <strong>{data.visit?.patient_code || 'Chưa cấp'}</strong> · Số khám: <strong>#{data.visit?.queue_number || '—'}</strong>
            </p>
          </div>

          <span className={`visit-status status-${data.visit?.result_status || 'draft'}`}>
            ● {data.visit?.result_status === 'published' ? 'Đã công bố cho bệnh nhân' : 'Bản nháp chuyên môn'}
          </span>
        </div>

        {message && (
          <div
            style={{
              padding: '12px 18px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--success-50)',
              border: '1px solid var(--success-200)',
              color: 'var(--success-700)',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '20px'
            }}
          >
            ✓ {message}
          </div>
        )}

        {/* Section 1: Hospital Data */}
        <section className="feature-card">
          <div className="section-title">
            <div>
              <h2>1. Tiếp nhận & Kiểm chứng dữ liệu y tế (HIS/EMR)</h2>
              <p>Đồng bộ dữ liệu sinh hiệu, cận lâm sàng LIS và chẩn đoán hình ảnh PACS.</p>
            </div>

            <button className="primary-action" onClick={receiveData} disabled={loading}>
              <RefreshCwIcon size={14} />
              <span>{data.hospitalData ? 'Cập nhật lại dữ liệu HIS' : 'Nạp dữ liệu bệnh viện'}</span>
            </button>
          </div>

          {data.hospitalData ? (
            <div
              style={{
                background: 'var(--slate-50)',
                border: '1px solid var(--slate-200)',
                borderRadius: 'var(--radius-lg)',
                padding: '18px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <strong style={{ color: 'var(--slate-900)' }}>Nguồn: {data.hospitalData.source_system}</strong>
                <span style={{ fontSize: '12px', color: 'var(--slate-500)' }}>
                  Thời gian nhận: {new Date(data.hospitalData.received_at).toLocaleString('vi-VN')}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '12px', fontSize: '13px', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--success-700)', fontWeight: 'bold' }}>
                  ✓ Trạng thái: {data.hospitalData.validation_status}
                </span>
                <span style={{ color: 'var(--slate-600)' }}>
                  · {data.hospitalData.duplicate_check}
                </span>
                <span style={{ color: 'var(--warning-700)' }}>
                  · Dữ liệu thiếu: {data.hospitalData.missing_fields || 'Không có'}
                </span>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--slate-400)', fontStyle: 'italic', margin: 0 }}>
              Chưa có dữ liệu từ hệ thống HIS/EMR bệnh viện. Vui lòng nhấn "Nạp dữ liệu bệnh viện" để tiếp tục.
            </p>
          )}
        </section>

        {/* Section 2: AI-CDSS Analysis */}
        <section className="feature-card">
          <div className="section-title">
            <div>
              <h2>2. Khuyến nghị lâm sàng AI-CDSS</h2>
              <p>Hệ thống tự động phân tích tương tác thuốc, nguy cơ mất bù và gợi ý cận lâm sàng.</p>
            </div>

            <button
              className="primary-action"
              disabled={!data.hospitalData || loading}
              onClick={runAi}
              style={{
                background: 'linear-gradient(135deg, #7e22ce 0%, #a855f7 100%)',
                boxShadow: '0 4px 12px rgba(126, 34, 206, 0.35)'
              }}
            >
              <SparklesIcon size={16} />
              <span>{ai ? 'Phân tích lại AI-CDSS' : 'Chạy hỗ trợ chuyên môn'}</span>
            </button>
          </div>

          {ai ? (
            <>
              <div className="ai-grid">
                <AiBox title="Chẩn đoán gợi ý (Diagnosis)" value={ai.diagnosis} tag="Khả năng cao" />
                <AiBox title="Đề xuất xét nghiệm (Lab/Test)" value={ai.lab_test} tag="Cận lâm sàng" />
                <AiBox title="Hướng điều trị (Treatment)" value={ai.treatment} tag="Phác đồ gợi ý" />
                <AiBox title="An toàn dùng thuốc (MedSafety)" value={ai.med_safety} tag="Cảnh báo an toàn" />
              </div>

              <div
                style={{
                  background: 'var(--warning-50)',
                  border: '1px solid var(--warning-200)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  fontSize: '13px',
                  color: 'var(--warning-800)',
                  margin: '16px 0'
                }}
              >
                <strong>Khoảng trống dữ liệu cần lưu ý: </strong>
                {ai.missing_data}
              </div>

              {/* Review Actions */}
              <div
                style={{
                  background: 'var(--slate-50)',
                  border: '1px solid var(--slate-200)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <strong style={{ fontSize: '15px', color: 'var(--slate-900)' }}>
                    Đánh giá & Quyết định của Bác sĩ:
                  </strong>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--primary)' }}>
                    Trạng thái hiện tại: {ai.review_status || 'Chưa đánh giá'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                  <button
                    onClick={() => reviewAi('accepted')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--success)',
                      color: 'white',
                      border: 'none',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    ✓ Chấp nhận toàn bộ
                  </button>
                  <button
                    onClick={() => reviewAi('adjusted')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--warning)',
                      color: 'white',
                      border: 'none',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    ✎ Điều chỉnh phác đồ
                  </button>
                  <button
                    onClick={() => reviewAi('rejected')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--danger)',
                      color: 'white',
                      border: 'none',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    ✕ Không áp dụng
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Ý kiến chuyên môn hoặc lý do điều chỉnh..."
                    style={{
                      padding: '10px 14px',
                      border: '1.5px solid var(--slate-200)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '13px',
                      minHeight: '70px',
                      width: '100%'
                    }}
                  />
                  <textarea
                    value={confirmedPlan}
                    onChange={(e) => setConfirmedPlan(e.target.value)}
                    placeholder="Kế hoạch điều trị chính thức được bác sĩ phê duyệt..."
                    style={{
                      padding: '10px 14px',
                      border: '1.5px solid var(--slate-200)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '13px',
                      minHeight: '70px',
                      width: '100%'
                    }}
                  />
                </div>
              </div>
            </>
          ) : (
            <p style={{ color: 'var(--slate-400)', fontStyle: 'italic', margin: 0 }}>
              Chưa kích hoạt AI-CDSS. Hãy đảm bảo dữ liệu bệnh viện đã sẵn sàng và nhấn "Chạy hỗ trợ chuyên môn".
            </p>
          )}
        </section>

        {/* Section 3: Draft Editor & Templates */}
        <section className="feature-card">
          <div className="section-title">
            <div>
              <h2>3. Kết luận lâm sàng & Đơn thuốc chính thức</h2>
              <p>Bản nháp chỉ được chuyển tới cổng bệnh nhân sau khi Bác sĩ công bố.</p>
            </div>
          </div>

          {/* Template row */}
          {templates.length > 0 && (
            <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--slate-50)', borderRadius: 'var(--radius-lg)' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--slate-700)', display: 'block', marginBottom: '8px' }}>
                Bộ mẫu kết quả khám có sẵn:
              </span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {templates.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'white',
                      border: '1px solid var(--slate-200)',
                      borderRadius: 'var(--radius-md)',
                      padding: '6px 12px',
                      fontSize: '13px'
                    }}
                  >
                    <strong>{t.name}</strong>
                    <span style={{ color: 'var(--slate-400)', fontSize: '11px' }}>({t.usage_count} lần)</span>
                    <button
                      onClick={() => applyTemplate(t)}
                      style={{
                        background: 'var(--primary-50)',
                        color: 'var(--primary)',
                        border: 'none',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      Dùng
                    </button>
                    <button
                      onClick={() => deleteTemplate(t.id)}
                      style={{
                        background: 'transparent',
                        color: 'var(--slate-400)',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              placeholder="Nhập tên mẫu nếu muốn lưu form này thành template..."
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1.5px solid var(--slate-200)',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px'
              }}
            />
            <button
              onClick={saveAsTemplate}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--slate-800)',
                color: 'white',
                border: 'none',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Lưu mẫu mới
            </button>
          </div>

          <div className="form-group">
            <label>Nội dung thăm khám</label>
            <textarea
              value={draft.examNotes}
              onChange={(e) => setDraft({ ...draft, examNotes: e.target.value })}
              placeholder="Diễn tiến lâm sàng, tiếng tim, rale phổi..."
            />
          </div>

          <div className="form-group">
            <label>Kết luận chẩn đoán</label>
            <textarea
              value={draft.resultText}
              onChange={(e) => setDraft({ ...draft, resultText: e.target.value })}
              placeholder="Chẩn đoán xác định..."
            />
          </div>

          <div className="form-group">
            <label>Đơn thuốc và lời dặn</label>
            <textarea
              value={draft.prescription}
              onChange={(e) => setDraft({ ...draft, prescription: e.target.value })}
              placeholder="Danh mục thuốc điều trị và hướng dẫn liều dùng..."
            />
          </div>

          <div className="form-group" style={{ maxWidth: '320px' }}>
            <label>Hẹn ngày tái khám</label>
            <input
              type="datetime-local"
              value={draft.followUpAt}
              onChange={(e) => setDraft({ ...draft, followUpAt: e.target.value })}
            />
          </div>

          <div className="form-actions">
            <button className="cancel-button" onClick={saveDraft}>
              Lưu bản nháp
            </button>
            <button className="save-button" onClick={publish}>
              Xác nhận & Công bố cho bệnh nhân
            </button>
          </div>

          {/* Versions History */}
          {data.versions?.length > 0 && (
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px dashed var(--slate-200)' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--slate-600)', display: 'block', marginBottom: '8px' }}>
                Lịch sử phiên bản backup:
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {data.versions.map((version) => (
                  <div
                    key={version.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: 'var(--slate-50)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '13px'
                    }}
                  >
                    <span>
                      Phiên bản <strong>#{version.version_no}</strong> · {new Date(version.created_at).toLocaleString('vi-VN')}
                    </span>
                    <button
                      type="button"
                      onClick={() => restore(version.id)}
                      style={{
                        padding: '4px 10px',
                        border: '1px solid var(--slate-300)',
                        borderRadius: 'var(--radius-sm)',
                        background: 'white',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Khôi phục bản này
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function AiBox({ title, value, tag }) {
  return (
    <div className="ai-box">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <strong>{title}</strong>
        <span style={{ fontSize: '11px', background: 'var(--primary-100)', color: 'var(--primary-800)', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>
          {tag}
        </span>
      </div>
      <p>{value || 'Chưa có phân tích.'}</p>
    </div>
  )
}

export default ClinicalSupport
