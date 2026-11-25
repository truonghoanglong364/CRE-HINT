import { useEffect, useState } from 'react'
import { ArrowLeftIcon, PillIcon } from '../components/Icons'
import {
  SLOTS,
  SKIP_REASONS,
  SKIP_REASON_LABELS,
  adherenceTone,
  fetchMyMedications,
  formatShortDate,
  formatSlots,
  recordDose,
} from '../medication'

function Medication({ user, onBack }) {
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchMyMedications(user.token).then(setReport).catch((err) => setError(err.message))
  }, [user.token])

  const submitDose = async (dose, body) => {
    try {
      setReport(await recordDose(user.token, dose.medicationId, { slot: dose.slot, ...body }))
      setError('')
      return null
    } catch (err) {
      return err.message
    }
  }

  const current = report?.medications.filter((m) => m.current) || []
  const past = report?.medications.filter((m) => !m.current && !(m.stoppedAt && m.stoppedAt <= m.startDate)) || []
  const schedule = report?.todaySchedule || []
  const doneCount = schedule.filter((d) => d.status !== 'pending').length
  const adherence = report?.summary.adherence

  return (
    <div className="medication-page">
      <div className="medication-container">
        <button className="back-button" onClick={onBack}>
          <ArrowLeftIcon size={16} />
          <span>Quay lại trang tổng quan</span>
        </button>

        <div className="medication-header">
          <div>
            <h1>Đơn thuốc & lịch uống thuốc</h1>
            <p>Đơn thuốc do bác sĩ kê sau mỗi lần khám. Đánh dấu từng liều để bác sĩ theo dõi việc dùng thuốc của bạn.</p>
          </div>
          {adherence != null && (
            <div className={`adherence-chip tone-${adherenceTone(adherence)}`}>
              Tuân thủ 7 ngày: {adherence}%
            </div>
          )}
        </div>

        <div className="med-rule">
          <div className="med-rule-icon"><PillIcon size={20} /></div>
          <div>
            <strong>Nguyên tắc vàng khi dùng thuốc điều trị suy tim</strong>
            <p>
              Uống thuốc đúng giờ, đúng liều mỗi ngày. <b>Không tự ý ngừng thuốc hoặc đổi liều</b> kể cả khi thấy khỏe hơn.
              Nếu phải bỏ liều vì tác dụng phụ, hãy ghi lại để bác sĩ được báo ngay.
            </p>
          </div>
        </div>

        {error && <p className="med-error">{error}</p>}
        {!report && !error && <p className="med-muted">Đang tải đơn thuốc...</p>}

        {report && current.length === 0 && (
          <section className="feature-card med-empty">
            <h2>Bạn chưa có đơn thuốc đang dùng</h2>
            <p>Đơn thuốc sẽ tự động xuất hiện tại đây sau khi bác sĩ công bố kết quả khám.</p>
          </section>
        )}

        {schedule.length > 0 && (
          <section className="feature-card">
            <div className="section-title">
              <div>
                <h2>Lịch uống thuốc hôm nay</h2>
                <p>Đã ghi nhận {doneCount}/{schedule.length} liều · {new Date(report.today).toLocaleDateString('vi-VN')}</p>
              </div>
            </div>

            {SLOTS.filter((slot) => schedule.some((d) => d.slot === slot.key)).map((slot) => (
              <div className="med-slot-group" key={slot.key}>
                <h3>{slot.label} <span>· {slot.time}</span></h3>
                {schedule.filter((d) => d.slot === slot.key).map((dose) => (
                  <DoseRow key={`${dose.medicationId}-${dose.slot}`} dose={dose} onSubmit={(body) => submitDose(dose, body)} />
                ))}
              </div>
            ))}
          </section>
        )}

        {current.length > 0 && (
          <section className="feature-card">
            <div className="section-title">
              <div>
                <h2>Thuốc đang dùng ({current.length})</h2>
                <p>
                  Theo đơn của BS. {current[0].prescribedByName || '—'}
                  {current[0].visitDate && ` · khám ngày ${new Date(current[0].visitDate).toLocaleDateString('vi-VN')}`}
                </p>
              </div>
            </div>
            <div className="med-list">
              {current.map((med) => (
                <div className="med-card" key={med.id}>
                  <div className="med-rx">Rx</div>
                  <div style={{ flex: 1 }}>
                    <div className="med-card-head">
                      <h3>{med.drugName} <span>{med.dose}</span></h3>
                      <span className="med-time">⏰ {formatSlots(med.slots)}</span>
                    </div>
                    {med.instructions && <p className="med-instructions">{med.instructions}</p>}
                    <p className="med-period">
                      Bắt đầu {formatShortDate(med.startDate)} · {med.endDate ? `dùng đến hết ${formatShortDate(med.endDate)}` : 'dùng dài hạn'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {past.length > 0 && (
          <section className="feature-card">
            <div className="section-title">
              <div>
                <h2>Đơn thuốc trước đây</h2>
                <p>Các thuốc đã được thay bằng đơn mới hoặc đã hết liệu trình.</p>
              </div>
            </div>
            <div className="med-history">
              {past.map((med) => (
                <div className="med-history-row" key={med.id}>
                  <strong>{med.drugName} {med.dose}</strong>
                  <span>{formatSlots(med.slots)}</span>
                  <span>
                    {formatShortDate(med.startDate)} → {med.stoppedAt ? `${formatShortDate(med.stoppedAt)} (thay đơn mới)` : `${formatShortDate(med.endDate)} (hết liệu trình)`}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function DoseRow({ dose, onSubmit }) {
  const [skipping, setSkipping] = useState(false)
  const [reason, setReason] = useState('forgot')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const send = async (body) => {
    setSaving(true)
    const failure = await onSubmit(body)
    setSaving(false)
    setError(failure || '')
    if (!failure) setSkipping(false)
  }

  return (
    <div className={`dose-row dose-${dose.status}`}>
      <div className="dose-info">
        <strong>{dose.drugName} <span>{dose.dose}</span></strong>
        {dose.instructions && <p>{dose.instructions}</p>}
        {dose.status === 'skipped' && (
          <p className="dose-skip-note">Đã bỏ liều · {SKIP_REASON_LABELS[dose.skipReason]}{dose.note ? `: ${dose.note}` : ''}</p>
        )}
        {error && <p className="dose-error">{error}</p>}
      </div>

      {!skipping && dose.status === 'pending' && (
        <div className="dose-actions">
          <button className="dose-take" disabled={saving} onClick={() => send({ status: 'taken' })}>✓ Đã uống</button>
          <button className="dose-skip" disabled={saving} onClick={() => setSkipping(true)}>Bỏ liều</button>
        </div>
      )}

      {!skipping && dose.status !== 'pending' && (
        <div className="dose-actions">
          <span className={`dose-badge badge-${dose.status}`}>{dose.status === 'taken' ? '✓ Đã uống' : '✕ Đã bỏ'}</span>
          <button className="dose-undo" disabled={saving} onClick={() => send({ status: 'pending' })}>Hoàn tác</button>
        </div>
      )}

      {skipping && (
        <div className="dose-skip-form">
          <div className="dose-reasons">
            {SKIP_REASONS.map((r) => (
              <button key={r.key} type="button" className={reason === r.key ? 'active' : ''} onClick={() => setReason(r.key)}>
                {r.label}
              </button>
            ))}
          </div>
          <input
            placeholder={reason === 'side_effect' ? 'Mô tả tác dụng phụ (vd: chóng mặt, ho khan...)' : 'Ghi chú thêm (không bắt buộc)'}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {reason === 'side_effect' && <small>Bác sĩ phụ trách sẽ nhận được thông báo ngay.</small>}
          <div className="dose-actions">
            <button className="dose-skip" disabled={saving} onClick={() => send({ status: 'skipped', skipReason: reason, note })}>Xác nhận bỏ liều</button>
            <button className="dose-undo" onClick={() => setSkipping(false)}>Hủy</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Medication
