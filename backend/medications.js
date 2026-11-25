const SLOTS = ['morning', 'noon', 'afternoon', 'evening']
const SKIP_REASONS = ['forgot', 'side_effect', 'out_of_stock', 'other']
const ADHERENCE_ALERT_WINDOW_DAYS = 3
const ADHERENCE_ALERT_MIN_MISSED = 2

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function parseSlots(slots) {
  return String(slots || '').split(',').filter((s) => SLOTS.includes(s))
}

function normalizeItems(rawItems) {
  if (!Array.isArray(rawItems)) return { error: 'Danh sách thuốc không hợp lệ!' }
  const items = []
  for (const [index, raw] of rawItems.entries()) {
    const row = index + 1
    const drugName = String(raw?.drugName || '').trim()
    if (!drugName) return { error: `Dòng thuốc ${row}: chưa nhập tên thuốc.` }
    const slots = SLOTS.filter((s) => Array.isArray(raw.slots) && raw.slots.includes(s))
    if (slots.length === 0) return { error: `Dòng thuốc ${row} (${drugName}): chọn ít nhất một buổi uống.` }
    let durationDays = null
    if (raw.durationDays !== null && raw.durationDays !== undefined && raw.durationDays !== '') {
      durationDays = Number(raw.durationDays)
      if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 365) {
        return { error: `Dòng thuốc ${row} (${drugName}): số ngày dùng phải từ 1 đến 365, hoặc để trống nếu dùng dài hạn.` }
      }
    }
    items.push({
      drugName,
      dose: String(raw.dose || '').trim() || null,
      slots,
      durationDays,
      instructions: String(raw.instructions || '').trim() || null,
    })
  }
  return { items }
}

async function getPrescriptionItems(db, visitId) {
  const rows = await db.prepare('SELECT * FROM prescription_items WHERE visit_id = ? ORDER BY sort_order, id').all(visitId)
  return rows.map((r) => ({
    id: r.id,
    drugName: r.drug_name,
    dose: r.dose,
    slots: parseSlots(r.slots),
    durationDays: r.duration_days,
    instructions: r.instructions,
  }))
}

async function replacePrescriptionItems(db, visitId, items) {
  await db.prepare('DELETE FROM prescription_items WHERE visit_id = ?').run(visitId)
  for (const [index, item] of items.entries()) {
    await db.prepare(`
      INSERT INTO prescription_items (visit_id, drug_name, dose, slots, duration_days, instructions, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(visitId, item.drugName, item.dose, item.slots.join(','), item.durationDays, item.instructions, index)
  }
}

// The new prescription replaces the patient's whole active regimen. A visit with no items leaves it untouched.
async function activatePrescription(db, visit, doctorId, today = todayStr()) {
  const items = await getPrescriptionItems(db, visit.id)
  if (items.length === 0) return 0

  const previous = await db.prepare("SELECT * FROM patient_medications WHERE patient_id = ? AND status = 'active'").all(visit.patient_id)
  await db.prepare("UPDATE patient_medications SET status = 'stopped', stopped_at = ? WHERE patient_id = ? AND status = 'active'").run(today, visit.patient_id)

  for (const item of items) {
    const result = await db.prepare(`
      INSERT INTO patient_medications (patient_id, visit_id, prescribed_by, drug_name, dose, slots, instructions, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(visit.patient_id, visit.id, doctorId, item.drugName, item.dose, item.slots.join(','), item.instructions,
      today, item.durationDays ? addDays(today, item.durationDays - 1) : null)

    // Keep today's ticks when the same drug is re-prescribed (e.g. the doctor republishes after an edit).
    const same = previous.find((p) => p.drug_name.toLowerCase() === item.drugName.toLowerCase() && (p.dose || '') === (item.dose || ''))
    if (same) {
      await db.prepare('UPDATE medication_doses SET medication_id = ? WHERE medication_id = ? AND dose_date = ?').run(result.lastInsertRowid, same.id, today)
    }
  }
  return items.length
}

function effectiveEnd(med) {
  const stoppedEnd = med.stopped_at ? addDays(med.stopped_at, -1) : null
  if (med.end_date && stoppedEnd) return med.end_date < stoppedEnd ? med.end_date : stoppedEnd
  return med.end_date || stoppedEnd
}

function isActiveOn(med, date) {
  const end = effectiveEnd(med)
  return med.start_date <= date && (!end || end >= date)
}

async function medicationReport(db, patientId, { days = 7, today = todayStr() } = {}) {
  const first = addDays(today, -(days - 1))
  const dates = Array.from({ length: days }, (_, i) => addDays(first, i))
  const recentFrom = addDays(today, -(ADHERENCE_ALERT_WINDOW_DAYS - 1))

  const meds = await db.prepare(`
    SELECT pm.*, doctors.full_name AS prescribed_by_name, visits.visit_date
    FROM patient_medications pm
    LEFT JOIN users doctors ON doctors.id = pm.prescribed_by
    LEFT JOIN visits ON visits.id = pm.visit_id
    WHERE pm.patient_id = ?
    ORDER BY pm.start_date DESC, pm.id
  `).all(patientId)
  const doses = await db.prepare('SELECT * FROM medication_doses WHERE patient_id = ? AND dose_date BETWEEN ? AND ?').all(patientId, first, today)

  const summary = { taken: 0, skipped: 0, missed: 0, pending: 0 }
  const alerts = []
  let recentNotTaken = 0
  const todaySchedule = []

  const medications = meds.map((med) => {
    const slots = parseSlots(med.slots)
    const cells = {}
    for (const date of dates) {
      if (!isActiveOn(med, date)) continue
      cells[date] = {}
      for (const slot of slots) {
        const record = doses.find((d) => d.medication_id === med.id && d.dose_date === date && d.slot === slot)
        const status = record ? record.status : date < today ? 'missed' : 'pending'
        cells[date][slot] = { status, skipReason: record?.skip_reason || null, note: record?.note || null }
        summary[status] += 1
        if (date >= recentFrom && (status === 'missed' || status === 'skipped')) recentNotTaken += 1
        if (date >= recentFrom && record?.skip_reason === 'side_effect' && !alerts.some((a) => a.medicationId === med.id)) {
          alerts.push({ type: 'side_effect', medicationId: med.id, message: `Báo tác dụng phụ khi dùng ${med.drug_name}${record.note ? `: ${record.note}` : ''}` })
        }
        if (date === today) {
          todaySchedule.push({ medicationId: med.id, drugName: med.drug_name, dose: med.dose, instructions: med.instructions, slot, ...cells[date][slot] })
        }
      }
    }
    const endsOn = effectiveEnd(med)
    return {
      id: med.id,
      drugName: med.drug_name,
      dose: med.dose,
      slots,
      instructions: med.instructions,
      startDate: med.start_date,
      endDate: med.end_date,
      stoppedAt: med.stopped_at,
      current: isActiveOn(med, today),
      finished: !isActiveOn(med, today) && med.status === 'active' && Boolean(endsOn) && endsOn < today,
      prescribedByName: med.prescribed_by_name,
      visitId: med.visit_id,
      visitDate: med.visit_date,
      cells,
    }
  })

  if (recentNotTaken >= ADHERENCE_ALERT_MIN_MISSED) {
    alerts.unshift({ type: 'missed', message: `Bỏ ${recentNotTaken} liều thuốc trong ${ADHERENCE_ALERT_WINDOW_DAYS} ngày gần đây` })
  }

  const counted = summary.taken + summary.skipped + summary.missed
  todaySchedule.sort((a, b) => SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot))
  return {
    today,
    dates,
    medications,
    todaySchedule,
    summary: { ...summary, adherence: counted ? Math.round((summary.taken / counted) * 100) : null },
    alerts,
  }
}

async function recordDose(db, patientId, medicationId, body, today = todayStr()) {
  const med = await db.prepare('SELECT * FROM patient_medications WHERE id = ? AND patient_id = ?').get(medicationId, patientId)
  if (!med) return { status: 404, message: 'Không tìm thấy thuốc trong đơn của bạn!' }
  if (!isActiveOn(med, today)) return { status: 400, message: 'Thuốc này không còn trong lịch dùng hôm nay.' }
  if (!parseSlots(med.slots).includes(body.slot)) return { status: 400, message: 'Buổi uống không hợp lệ cho thuốc này!' }

  if (body.status === 'pending') {
    await db.prepare('DELETE FROM medication_doses WHERE medication_id = ? AND dose_date = ? AND slot = ?').run(med.id, today, body.slot)
    return { med }
  }
  if (!['taken', 'skipped'].includes(body.status)) return { status: 400, message: 'Trạng thái liều thuốc không hợp lệ!' }
  const skipReason = body.status === 'skipped' ? body.skipReason : null
  if (body.status === 'skipped' && !SKIP_REASONS.includes(skipReason)) return { status: 400, message: 'Vui lòng chọn lý do bỏ liều!' }
  const note = body.status === 'skipped' ? (String(body.note || '').trim() || null) : null

  await db.prepare(`
    INSERT INTO medication_doses (medication_id, patient_id, dose_date, slot, status, skip_reason, note, recorded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT (medication_id, dose_date, slot) DO UPDATE SET
      status = excluded.status, skip_reason = excluded.skip_reason, note = excluded.note, recorded_at = CURRENT_TIMESTAMP
  `).run(med.id, patientId, today, body.slot, body.status, skipReason, note)
  return { med, skipReason, note }
}

module.exports = {
  SLOTS,
  todayStr,
  addDays,
  normalizeItems,
  getPrescriptionItems,
  replacePrescriptionItems,
  activatePrescription,
  medicationReport,
  recordDose,
}
