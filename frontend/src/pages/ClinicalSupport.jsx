import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeftIcon,
  SparklesIcon,
  RefreshCwIcon
} from '../components/Icons'

const AI_BLOCKS = [
  { key: 'diagnosis', title: 'Chẩn đoán gợi ý (Diagnosis)', tag: 'Khả năng cao', fillsDraft: 'resultText' },
  { key: 'lab_test', title: 'Đề xuất xét nghiệm (Lab/Test)', tag: 'Cận lâm sàng' },
  { key: 'treatment', title: 'Hướng điều trị (Treatment)', tag: 'Phác đồ gợi ý', fillsDraft: 'prescription' },
  { key: 'med_safety', title: 'An toàn dùng thuốc (MedSafety)', tag: 'Cảnh báo an toàn' },
]

const DRAFT_FIELD_LABELS = { resultText: 'Kết luận chẩn đoán', prescription: 'Đơn thuốc và lời dặn' }

const REVIEW_STATUS_LABELS = {
  pending: 'Đang duyệt',
  accepted: 'Đồng ý toàn bộ',
  adjusted: 'Đã điều chỉnh',
  rejected: 'Từ chối toàn bộ',
}

function ClinicalSupport({ user, visit, onBack }) {
  const [data, setData] = useState({
    visit,
    hospitalData: null,
    aiSupport: null,
    blockReviews: [],
    versions: []
  })
  const autoFilled = useRef({})
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

  // Only overwrite a draft field that is empty or still holds what we auto-filled earlier.
  const prefillDraft = (reviews, changedKeys) => {
    const next = { ...draft }
    const notes = []
    for (const block of AI_BLOCKS) {
      if (!block.fillsDraft || !changedKeys.includes(block.key)) continue
      const review = reviews.find((r) => r.block === block.key)
      if (!review) continue
      const field = block.fillsDraft
      const existing = (draft[field] || '').trim()
      if (existing && existing !== autoFilled.current[field]) {
        notes.push(`ô "${DRAFT_FIELD_LABELS[field]}" đã có nội dung nên không ghi đè`)
        continue
      }
      next[field] = review.final_text
      autoFilled.current[field] = review.final_text.trim()
      notes.push(`đã điền vào ô "${DRAFT_FIELD_LABELS[field]}"`)
    }
    setDraft(next)
    return notes
  }

  const applyReviewResult = (result, changedKeys, summary) => {
    setData((current) => ({ ...current, aiSupport: result.aiSupport, blockReviews: result.blockReviews }))
    const notes = prefillDraft(result.blockReviews, changedKeys)
    const tail = notes.length ? ` Mục 3: ${notes.join('; ')}. Nhớ bấm "Lưu bản nháp".` : ''
    setMessage(summary + tail)
  }

  const reviewBlock = async (blockKey, decision, text, reason) => {
    const response = await fetch(`/api/visits/${visit.id}/ai-review/${blockKey}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ decision, text, reason })
    })
    const result = await response.json()
    if (!response.ok) return result.message || 'Không thể lưu quyết định.'
    const saved = result.blockReviews.find((r) => r.block === blockKey)
    const word = { accepted: 'Đồng ý', edited: 'Chỉnh sửa', rejected: 'Từ chối' }[saved?.decision]
    const title = AI_BLOCKS.find((b) => b.key === blockKey).title
    applyReviewResult(result, [blockKey], `Đã lưu quyết định "${word}" cho khối ${title}.`)
    return null
  }

  const acceptAllBlocks = async () => {
    const pendingKeys = AI_BLOCKS.map((b) => b.key).filter((k) => !data.blockReviews?.some((r) => r.block === k))
    const response = await fetch(`/api/visits/${visit.id}/ai-review/accept-all`, { method: 'POST', headers })
    const result = await response.json()
    if (!response.ok) {
      setMessage(result.message || 'Không thể đồng ý toàn bộ.')
      return
    }
    applyReviewResult(result, pendingKeys, `Đã đồng ý ${pendingKeys.length} khối gợi ý AI còn lại.`)
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
  const reviewedCount = data.blockReviews?.length || 0

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
              <div className="ai-review-bar">
                <div>
                  <strong style={{ fontSize: '15px', color: 'var(--slate-900)' }}>Bác sĩ duyệt từng khối gợi ý</strong>
                  <div style={{ fontSize: '13px', color: 'var(--slate-500)', marginTop: '2px' }}>
                    Đã duyệt {reviewedCount}/{AI_BLOCKS.length} khối · Trạng thái: <b style={{ color: 'var(--primary)' }}>{REVIEW_STATUS_LABELS[ai.review_status] || ai.review_status}</b>
                  </div>
                </div>
                {reviewedCount < AI_BLOCKS.length && (
                  <div className="ai-actions">
                    <button className="btn-accept" onClick={acceptAllBlocks}>
                      ✓ {reviewedCount === 0 ? 'Đồng ý toàn bộ' : 'Đồng ý các khối còn lại'}
                    </button>
                  </div>
                )}
              </div>

              <div className="ai-grid">
                {AI_BLOCKS.map((block) => (
                  <AiReviewBlock
                    key={`${ai.id}-${block.key}`}
                    block={block}
                    aiText={ai[block.key]}
                    review={data.blockReviews?.find((r) => r.block === block.key)}
                    onSubmit={(decision, text, reason) => reviewBlock(block.key, decision, text, reason)}
                  />
                ))}
              </div>

              <div
                style={{
                  background: 'var(--warning-50)',
                  border: '1px solid var(--warning-200)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  fontSize: '13px',
                  color: 'var(--warning-700)',
                  margin: '0 0 4px'
                }}
              >
                <strong>Khoảng trống dữ liệu cần lưu ý: </strong>
                {ai.missing_data}
              </div>
            </>
          ) : (
            <p style={{ color: 'var(--slate-400)', fontStyle: 'italic', margin: 0 }}>
              Chưa kích hoạt AI-CDSS. Hãy đảm bảo dữ liệu bệnh viện đã sẵn sàng và nhấn "Chạy hỗ trợ chuyên môn".
            </p>
          )}
        </section>

        <section className="feature-card">
          <div className="section-title">
            <div>
              <h2>3. Kết luận lâm sàng & Đơn thuốc chính thức</h2>
              <p>Bản nháp chỉ được chuyển tới cổng bệnh nhân sau khi Bác sĩ công bố.</p>
            </div>
          </div>

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

const DECISION_LABELS = {
  pending: 'Chưa duyệt',
  accepted: 'Đã đồng ý',
  edited: 'Đã chỉnh sửa',
  rejected: 'Đã từ chối',
}

function AiReviewBlock({ block, aiText, review, onSubmit }) {
  const [mode, setMode] = useState('view')
  const [showChoices, setShowChoices] = useState(false)
  const [text, setText] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const decision = review?.decision || 'pending'

  const startEdit = () => {
    setText(review?.final_text || aiText || '')
    setError('')
    setMode('edit')
  }

  const startReject = () => {
    setText(review?.decision === 'rejected' ? review.final_text : '')
    setReason(review?.reject_reason || '')
    setError('')
    setMode('reject')
  }

  const cancel = () => {
    setMode('view')
    setError('')
  }

  const submit = async (nextDecision) => {
    if (nextDecision === 'edited' && !text.trim()) return setError('Nội dung chỉnh sửa không được để trống.')
    if (nextDecision === 'rejected' && !reason.trim()) return setError('Vui lòng ghi lý do từ chối.')
    if (nextDecision === 'rejected' && !text.trim()) return setError('Vui lòng nhập nội dung thay thế của bác sĩ.')
    setSaving(true)
    const failure = await onSubmit(nextDecision, text, reason)
    setSaving(false)
    if (failure) return setError(failure)
    setMode('view')
    setShowChoices(false)
    setError('')
  }

  const choices = (
    <div className="ai-actions">
      <button className="btn-accept" disabled={saving} onClick={() => submit('accepted')}>✓ Đồng ý</button>
      <button className="btn-edit" disabled={saving} onClick={startEdit}>✎ Sửa</button>
      <button className="btn-reject" disabled={saving} onClick={startReject}>✕ Từ chối</button>
      {review && <button className="btn-ghost" onClick={() => setShowChoices(false)}>Hủy</button>}
    </div>
  )

  return (
    <div className={`ai-box review-${decision}`}>
      <div className="ai-box-head">
        <strong>{block.title}</strong>
        <div className="ai-box-tags">
          <span className="ai-tag">{block.tag}</span>
          <span className={`ai-tag decision-${decision}`}>{DECISION_LABELS[decision]}</span>
        </div>
      </div>

      {mode === 'edit' && (
        <>
          <span className="ai-field-label">Chỉnh sửa nội dung gợi ý</span>
          <textarea value={text} onChange={(e) => setText(e.target.value)} autoFocus />
          <OriginalAiText aiText={aiText} />
          {error && <p className="ai-error">{error}</p>}
          <div className="ai-actions">
            <button className="btn-edit" disabled={saving} onClick={() => submit('edited')}>Lưu chỉnh sửa</button>
            <button className="btn-ghost" onClick={cancel}>Hủy</button>
          </div>
        </>
      )}

      {mode === 'reject' && (
        <>
          <OriginalAiText aiText={aiText} open />
          <span className="ai-field-label">Lý do từ chối *</span>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} style={{ minHeight: '60px' }} autoFocus placeholder="Vì sao gợi ý này không phù hợp với bệnh nhân..." />
          <span className="ai-field-label">Nội dung của bác sĩ *</span>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Nhập nội dung theo đánh giá của bác sĩ..." />
          {error && <p className="ai-error">{error}</p>}
          <div className="ai-actions">
            <button className="btn-reject" disabled={saving} onClick={() => submit('rejected')}>Xác nhận từ chối</button>
            <button className="btn-ghost" onClick={cancel}>Hủy</button>
          </div>
        </>
      )}

      {mode === 'view' && (
        <>
          <p>{(review ? review.final_text : aiText) || 'Chưa có phân tích.'}</p>
          {review?.decision === 'rejected' && (
            <span className="ai-reject-reason">Lý do từ chối: {review.reject_reason}</span>
          )}
          {review && review.decision !== 'accepted' && <OriginalAiText aiText={aiText} />}
          {error && <p className="ai-error">{error}</p>}
          {!review || showChoices ? choices : (
            <div className="ai-actions">
              <button className="btn-ghost" onClick={() => setShowChoices(true)}>Thay đổi</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function OriginalAiText({ aiText, open = false }) {
  return (
    <details className="ai-original" open={open}>
      <summary>Gợi ý gốc của AI</summary>
      <p>{aiText || '—'}</p>
    </details>
  )
}

export default ClinicalSupport
