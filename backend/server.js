const path = require('path')
const crypto = require('crypto')
const express = require('express')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { db, initDatabase } = require('./database')

const app = express()
const PORT = process.env.PORT || 3000
const JWT_SECRET = process.env.JWT_SECRET || 'cre-hint-development-secret'

app.use(cors())
app.use(express.json())

// Serve frontend build in production
const frontendPath = path.join(__dirname, '../frontend/dist')
app.use(express.static(frontendPath))

function authenticateToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ message: 'Vui lòng đăng nhập lại!' })
  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' })
  }
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Bạn không có quyền thực hiện thao tác này.' })
    next()
  }
}

async function addNotification(userId, title, message, type = 'info') {
  await db.prepare('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)').run(userId, title, message, type)
}

async function visitDetails(visit) {
  if (!visit) return null
  const ahead = visit.queue_number
    ? (await db.prepare(`
        SELECT COUNT(*) AS count FROM visits
        WHERE visit_date = ? AND queue_number < ? AND status IN ('waiting', 'called', 'in_progress')
      `).get(visit.visit_date, visit.queue_number)).count
    : null
  return { ...visit, peopleAhead: ahead }
}

async function publicVisit(visit) {
  const result = await visitDetails(visit)
  if (!result || result.result_status === 'published') return result
  return { ...result, exam_notes: null, result_text: null, prescription: null, follow_up_at: null }
}

async function saveVisitVersion(visit, userId) {
  const nextVersion = (await db.prepare('SELECT COALESCE(MAX(version_no), 0) + 1 AS next FROM visit_versions WHERE visit_id = ?').get(visit.id)).next
  await db.prepare(`
    INSERT INTO visit_versions (visit_id, version_no, exam_notes, result_text, prescription, follow_up_at, result_status, saved_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(visit.id, nextVersion, visit.exam_notes, visit.result_text, visit.prescription, visit.follow_up_at, visit.result_status, userId)
}

// =========================
// KIỂM TRA SERVER
// =========================

app.get('/api/health', (req, res) => {
  res.json({ message: 'CRE-HINT Backend đang hoạt động!' })
})

// =========================
// ĐĂNG KÝ
// =========================

app.post('/api/register', async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body
    if (!fullName || !password || !role || (role !== 'patient' && !email)) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin!' })
    }
    if (!['patient', 'doctor', 'receptionist'].includes(role)) {
      return res.status(400).json({ message: 'Vai trò không hợp lệ!' })
    }

    const existingUser = email ? await db.prepare('SELECT * FROM users WHERE email = ?').get(email) : null
    if (existingUser) return res.status(409).json({ message: 'Email này đã được đăng ký!' })

    const hashedPassword = await bcrypt.hash(password, 10)
    const result = await db.prepare('INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)').run(fullName, email || null, hashedPassword, role)

    let patientCode = null
    if (role === 'patient') {
      const patientResult = await db.prepare('INSERT INTO patients (user_id) VALUES (?)').run(result.lastInsertRowid)
      patientCode = `BN${String(patientResult.lastInsertRowid).padStart(4, '0')}`
      await db.prepare('UPDATE patients SET patient_code = ? WHERE id = ?').run(patientCode, patientResult.lastInsertRowid)
    }

    res.status(201).json({
      message: 'Đăng ký tài khoản thành công!',
      user: { id: result.lastInsertRowid, fullName, email: email || null, role, patientCode },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Có lỗi xảy ra ở server!' })
  }
})

// =========================
// ĐĂNG NHẬP
// =========================

app.post('/api/login', async (req, res) => {
  try {
    const { identifier, email, password } = req.body
    const loginIdentifier = identifier || email
    if (!loginIdentifier || !password) return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu!' })

    const user = await db.prepare(`
      SELECT users.*, patients.patient_code
      FROM users
      LEFT JOIN patients ON patients.user_id = users.id
      WHERE (users.email = ? AND users.role != 'patient')
         OR (patients.patient_code = ? AND users.role = 'patient')
    `).get(loginIdentifier, loginIdentifier)

    if (!user) return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng!' })
    const passwordCorrect = await bcrypt.compare(password, user.password)
    if (!passwordCorrect) return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng!' })

    res.json({
      message: 'Đăng nhập thành công!',
      token: jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '12h' }),
      user: { id: user.id, fullName: user.full_name, email: user.email, patientCode: user.patient_code, role: user.role },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Có lỗi xảy ra ở server!' })
  }
})

app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.prepare('SELECT id, name, email, role, patient_code FROM users WHERE id = ?').get(req.user.id)
    if (!user) return res.status(401).json({ message: 'User not found' })
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, patient_code: user.patient_code } })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// =========================
// GHI NHẬN VÀ LẤY CHỈ SỐ
// =========================

// Sinh hiệu do nhân viên y tế đo và nhập khi tiếp nhận lượt khám (bệnh nhân không tự nhập).
function parseVitals(body = {}) {
  const measurements = {
    weight: Number(body.weight), systolic: Number(body.systolic),
    diastolic: Number(body.diastolic), heartRate: Number(body.heartRate), spo2: Number(body.spo2),
  }
  const symptoms = { dyspnea: Boolean(body.dyspnea), edema: Boolean(body.edema), chestPain: Boolean(body.chestPain) }
  const valid = Object.values(measurements).every(Number.isFinite) &&
    measurements.weight > 0 && measurements.systolic > 0 && measurements.diastolic > 0 &&
    measurements.heartRate > 0 && measurements.spo2 >= 0 && measurements.spo2 <= 100
  return valid ? { ...measurements, ...symptoms } : null
}

app.get('/api/vitals', authenticateToken, async (req, res) => {
  try {
    const userId = Number(req.query.userId)
    if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: 'Mã bệnh nhân không hợp lệ!' })
    if (req.user.role === 'patient' && req.user.id !== userId) return res.status(403).json({ message: 'Bạn chỉ có thể xem chỉ số của mình.' })
    if (!['patient', 'doctor', 'receptionist'].includes(req.user.role)) return res.status(403).json({ message: 'Bạn không có quyền xem chỉ số.' })

    const vitals = await db.prepare(`
      SELECT id, user_id AS userId, weight, systolic, diastolic, heart_rate AS heartRate, spo2,
        dyspnea, edema, chest_pain AS chestPain, created_at AS createdAt, visit_id AS visitId
      FROM vitals WHERE user_id = ? ORDER BY id DESC
    `).all(userId)
    res.json({ vitals })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Không thể tải lịch sử chỉ số!' })
  }
})

// =========================
// DANH SÁCH BỆNH NHÂN
// =========================

app.get('/api/patients', authenticateToken, allowRoles('doctor'), async (req, res) => {
  try {
    const patients = await db.prepare(`
      SELECT patients.id, patients.user_id AS userId, patients.patient_code AS patientCode,
        users.full_name AS fullName, users.email,
        patients.date_of_birth AS dateOfBirth, patients.gender, patients.phone, patients.address,
        latest.weight, latest.systolic, latest.diastolic, latest.heart_rate AS heartRate, latest.spo2,
        latest.dyspnea, latest.edema, latest.chest_pain AS chestPain, latest.created_at AS lastSubmittedAt
      FROM patients
      JOIN users ON patients.user_id = users.id
      LEFT JOIN vitals AS latest ON latest.id = (SELECT id FROM vitals WHERE user_id = patients.user_id ORDER BY id DESC LIMIT 1)
      ORDER BY patients.id DESC
    `).all()
    res.json({ patients })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Không thể lấy danh sách bệnh nhân!' })
  }
})

// =========================
// CẬP NHẬT HỒ SƠ BỆNH NHÂN
// =========================

app.put('/api/patients/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params
    const { dateOfBirth, gender, phone, address } = req.body
    const patient = await db.prepare('SELECT * FROM patients WHERE user_id = ?').get(userId)
    if (!patient) return res.status(404).json({ message: 'Không tìm thấy hồ sơ bệnh nhân!' })

    await db.prepare('UPDATE patients SET date_of_birth = ?, gender = ?, phone = ?, address = ? WHERE user_id = ?').run(dateOfBirth, gender, phone, address, userId)
    res.json({ message: 'Cập nhật hồ sơ thành công!' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Không thể cập nhật hồ sơ!' })
  }
})

// =========================
// LƯỢT KHÁM VÀ THÔNG BÁO
// =========================

app.post('/api/visits', authenticateToken, allowRoles('patient'), async (req, res) => {
  try {
    const { visitDate, specialty, reason, doctorId } = req.body
    if (!visitDate || !specialty || !reason) return res.status(400).json({ message: 'Vui lòng nhập ngày khám, chuyên khoa và lý do khám!' })

    const result = await db.prepare('INSERT INTO visits (patient_id, doctor_id, visit_date, specialty, reason) VALUES (?, ?, ?, ?, ?)').run(req.user.id, doctorId || null, visitDate, specialty, reason)
    await addNotification(req.user.id, 'Đăng ký khám thành công', `Yêu cầu khám ngày ${visitDate} đã được ghi nhận. Vui lòng chờ bệnh viện tiếp nhận.`, 'success')

    const visit = await db.prepare('SELECT * FROM visits WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json({ visit: await visitDetails(visit) })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Không thể tạo lượt khám!' })
  }
})

app.get('/api/visits/mine', authenticateToken, allowRoles('patient'), async (req, res) => {
  const rows = await db.prepare(`
    SELECT visits.*, users.full_name AS doctor_name
    FROM visits LEFT JOIN users ON users.id = visits.doctor_id
    WHERE visits.patient_id = ? ORDER BY visits.visit_date DESC, visits.id DESC
  `).all(req.user.id)
  const visits = await Promise.all(rows.map((v) => publicVisit(v)))
  res.json({ visits })
})

app.get('/api/visits/queue', authenticateToken, allowRoles('doctor', 'receptionist'), async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10)
  // Bác sĩ chỉ thấy những lượt khám đã được nhân viên y tế chuyển cho mình.
  const doctorOnly = req.user.role === 'doctor'
  const rows = await db.prepare(`
    SELECT visits.*, patients.patient_code, users.full_name AS patient_name, doctors.full_name AS doctor_name,
      v.weight AS vital_weight, v.systolic AS vital_systolic, v.diastolic AS vital_diastolic,
      v.heart_rate AS vital_heart_rate, v.spo2 AS vital_spo2, v.dyspnea AS vital_dyspnea,
      v.edema AS vital_edema, v.chest_pain AS vital_chest_pain, v.created_at AS vital_recorded_at,
      recorder.full_name AS vital_recorded_by
    FROM visits
    JOIN users ON users.id = visits.patient_id
    LEFT JOIN patients ON patients.user_id = visits.patient_id
    LEFT JOIN users doctors ON doctors.id = visits.doctor_id
    LEFT JOIN vitals v ON v.id = (SELECT id FROM vitals WHERE visit_id = visits.id ORDER BY id DESC LIMIT 1)
    LEFT JOIN users recorder ON recorder.id = v.recorded_by
    WHERE visits.visit_date = ? ${doctorOnly ? "AND visits.doctor_id = ? AND visits.status <> 'registered'" : ''}
    ORDER BY CASE visits.status
      WHEN 'in_progress' THEN 1 WHEN 'called' THEN 2 WHEN 'waiting' THEN 3
      WHEN 'registered' THEN 4 ELSE 5 END,
      CASE visits.priority WHEN 'emergency' THEN 1 WHEN 'urgent' THEN 2 ELSE 3 END,
      visits.queue_number, visits.id
  `).all(...(doctorOnly ? [date, req.user.id] : [date]))
  const visits = await Promise.all(rows.map((v) => visitDetails(v)))
  res.json({ visits, date })
})

app.get('/api/doctors', authenticateToken, allowRoles('receptionist', 'patient'), async (req, res) => {
  const doctors = await db.prepare("SELECT id, full_name AS fullName FROM users WHERE role = 'doctor' ORDER BY full_name").all()
  res.json({ doctors })
})

app.get('/api/visits/:id/clinical-support', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const visit = await db.prepare(`
    SELECT visits.*, users.full_name AS patient_name, users.email AS patient_email, patients.patient_code
    FROM visits JOIN users ON users.id = visits.patient_id
    LEFT JOIN patients ON patients.user_id = visits.patient_id
    WHERE visits.id = ?
  `).get(req.params.id)
  if (!visit) return res.status(404).json({ message: 'Không tìm thấy lượt khám!' })
  const hospitalData = await db.prepare('SELECT * FROM hospital_data WHERE visit_id = ? ORDER BY id DESC LIMIT 1').get(visit.id)
  const aiSupport = await db.prepare('SELECT * FROM ai_support WHERE visit_id = ? ORDER BY id DESC LIMIT 1').get(visit.id)
  const versions = await db.prepare('SELECT * FROM visit_versions WHERE visit_id = ? ORDER BY version_no DESC').all(visit.id)
  const labOrders = await db.prepare('SELECT * FROM lab_orders WHERE visit_id = ? ORDER BY ordered_at DESC').all(visit.id)
  const blockReviews = aiSupport
    ? await db.prepare('SELECT * FROM ai_block_reviews WHERE ai_support_id = ?').all(aiSupport.id)
    : []
  res.json({ visit, hospitalData, aiSupport, blockReviews, versions, labOrders })
})

app.post('/api/visits/:id/mock-hospital-data', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const visit = await db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id)
  if (!visit) return res.status(404).json({ message: 'Không tìm thấy lượt khám!' })
  const measured = await db.prepare('SELECT * FROM vitals WHERE visit_id = ? ORDER BY id DESC LIMIT 1').get(visit.id)
  const payload = {
    patientId: visit.patient_id, visitId: visit.id,
    vitals: measured
      ? { bloodPressure: `${measured.systolic}/${measured.diastolic}`, heartRate: measured.heart_rate, spo2: measured.spo2, weight: measured.weight }
      : { bloodPressure: '145/90', heartRate: 96, spo2: 94, weight: 68.5 },
    medications: ['Bisoprolol 2.5 mg', 'Furosemide 40 mg'],
    note: 'Dữ liệu mẫu phục vụ trình diễn AI-CDSS',
  }
  const result = await db.prepare(`
    INSERT INTO hospital_data (visit_id, source_system, payload_json, validation_status, missing_fields, validation_errors, duplicate_check)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(visit.id, req.body.sourceSystem || 'HIS/EMR mô phỏng', JSON.stringify(payload), 'valid', 'Chưa có dữ liệu BNP/NT-proBNP', null, 'Không phát hiện bản ghi trùng')
  const hospitalData = await db.prepare('SELECT * FROM hospital_data WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json({ hospitalData })
})

app.post('/api/visits/:id/ai-support', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const visit = await db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id)
  const hospitalData = await db.prepare('SELECT * FROM hospital_data WHERE visit_id = ? ORDER BY id DESC LIMIT 1').get(req.params.id)
  if (!visit) return res.status(404).json({ message: 'Không tìm thấy lượt khám!' })
  if (!hospitalData) return res.status(400).json({ message: 'Cần tiếp nhận dữ liệu bệnh viện trước khi chạy hỗ trợ chuyên môn.' })
  const result = await db.prepare(`
    INSERT INTO ai_support (visit_id, hospital_data_id, input_summary, missing_data, diagnosis, lab_test, treatment, med_safety)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(visit.id, hospitalData.id,
    'Sinh hiệu, thuốc đang dùng và lý do khám từ bộ dữ liệu mô phỏng',
    'Chưa có BNP/NT-proBNP; cần bổ sung nếu bác sĩ thấy phù hợp',
    'Gợi ý theo dõi suy tim sung huyết, cần bác sĩ xác nhận',
    'Cân nhắc BNP/NT-proBNP, điện giải đồ và siêu âm tim',
    'Tiếp tục theo dõi cân nặng, huyết áp; rà soát đáp ứng lợi tiểu',
    'Kiểm tra nguy cơ hạ huyết áp và rối loạn điện giải khi phối hợp thuốc')
  const aiSupport = await db.prepare('SELECT * FROM ai_support WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json({ aiSupport, simulated: true })
})

const AI_BLOCKS = ['diagnosis', 'lab_test', 'treatment', 'med_safety']

async function latestAi(visitId) {
  return db.prepare('SELECT * FROM ai_support WHERE visit_id = ? ORDER BY id DESC LIMIT 1').get(visitId)
}

async function refreshAiReviewStatus(aiId) {
  const reviews = await db.prepare('SELECT decision FROM ai_block_reviews WHERE ai_support_id = ?').all(aiId)
  const decisions = reviews.map((r) => r.decision)
  const status = decisions.length < AI_BLOCKS.length ? 'pending'
    : decisions.every((d) => d === 'accepted') ? 'accepted'
    : decisions.every((d) => d === 'rejected') ? 'rejected'
    : 'adjusted'
  await db.prepare('UPDATE ai_support SET review_status = ?, reviewed_at = CASE WHEN ? = \'pending\' THEN NULL ELSE CURRENT_TIMESTAMP END WHERE id = ?').run(status, status, aiId)
  return {
    aiSupport: await db.prepare('SELECT * FROM ai_support WHERE id = ?').get(aiId),
    blockReviews: await db.prepare('SELECT * FROM ai_block_reviews WHERE ai_support_id = ?').all(aiId),
  }
}

async function saveBlockReview(aiId, block, decision, finalText, rejectReason, userId) {
  await db.prepare(`
    INSERT INTO ai_block_reviews (ai_support_id, block, decision, final_text, reject_reason, reviewed_by, reviewed_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT (ai_support_id, block) DO UPDATE SET
      decision = excluded.decision, final_text = excluded.final_text, reject_reason = excluded.reject_reason,
      reviewed_by = excluded.reviewed_by, reviewed_at = CURRENT_TIMESTAMP
  `).run(aiId, block, decision, finalText, rejectReason, userId)
}

app.put('/api/visits/:id/ai-review/:block', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const { block } = req.params
  if (!AI_BLOCKS.includes(block)) return res.status(400).json({ message: 'Khối gợi ý không hợp lệ!' })
  const ai = await latestAi(req.params.id)
  if (!ai) return res.status(404).json({ message: 'Chưa có kết quả hỗ trợ chuyên môn!' })

  const { decision } = req.body
  const text = (req.body.text || '').trim()
  const reason = (req.body.reason || '').trim()
  if (decision === 'accepted') {
    await saveBlockReview(ai.id, block, 'accepted', ai[block] || '', null, req.user.id)
  } else if (decision === 'edited') {
    if (!text) return res.status(400).json({ message: 'Nội dung chỉnh sửa không được để trống!' })
    const unchanged = text === (ai[block] || '').trim()
    await saveBlockReview(ai.id, block, unchanged ? 'accepted' : 'edited', text, null, req.user.id)
  } else if (decision === 'rejected') {
    if (!reason) return res.status(400).json({ message: 'Vui lòng ghi lý do từ chối gợi ý AI!' })
    if (!text) return res.status(400).json({ message: 'Vui lòng nhập nội dung thay thế của bác sĩ!' })
    await saveBlockReview(ai.id, block, 'rejected', text, reason, req.user.id)
  } else {
    return res.status(400).json({ message: 'Quyết định không hợp lệ!' })
  }
  res.json(await refreshAiReviewStatus(ai.id))
})

app.post('/api/visits/:id/ai-review/accept-all', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const ai = await latestAi(req.params.id)
  if (!ai) return res.status(404).json({ message: 'Chưa có kết quả hỗ trợ chuyên môn!' })
  const reviewed = (await db.prepare('SELECT block FROM ai_block_reviews WHERE ai_support_id = ?').all(ai.id)).map((r) => r.block)
  for (const block of AI_BLOCKS.filter((b) => !reviewed.includes(b))) {
    await saveBlockReview(ai.id, block, 'accepted', ai[block] || '', null, req.user.id)
  }
  res.json(await refreshAiReviewStatus(ai.id))
})

app.put('/api/visits/:id/draft', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const visit = await db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id)
  if (!visit) return res.status(404).json({ message: 'Không tìm thấy lượt khám!' })
  await db.prepare("UPDATE visits SET exam_notes = ?, result_text = ?, prescription = ?, follow_up_at = ?, result_status = 'draft', result_version = result_version + 1 WHERE id = ?").run(req.body.examNotes || null, req.body.resultText || null, req.body.prescription || null, req.body.followUpAt || null, visit.id)
  const updated = await db.prepare('SELECT * FROM visits WHERE id = ?').get(visit.id)
  await saveVisitVersion(updated, req.user.id)
  res.json({ visit: updated })
})

app.post('/api/visits/:id/restore-version', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const version = await db.prepare('SELECT * FROM visit_versions WHERE id = ? AND visit_id = ?').get(req.body.versionId, req.params.id)
  if (!version) return res.status(404).json({ message: 'Không tìm thấy phiên bản backup!' })
  await db.prepare("UPDATE visits SET exam_notes = ?, result_text = ?, prescription = ?, follow_up_at = ?, result_status = 'draft', result_version = result_version + 1 WHERE id = ?").run(version.exam_notes, version.result_text, version.prescription, version.follow_up_at, req.params.id)
  const updated = await db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id)
  await saveVisitVersion(updated, req.user.id)
  res.json({ visit: updated })
})

app.post('/api/visits/:id/publish', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const visit = await db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id)
  if (!visit) return res.status(404).json({ message: 'Không tìm thấy lượt khám!' })
  await db.prepare("UPDATE visits SET result_status = 'published', status = 'completed', published_at = CURRENT_TIMESTAMP, completed_at = CURRENT_TIMESTAMP WHERE id = ?").run(visit.id)
  const updated = await db.prepare('SELECT * FROM visits WHERE id = ?').get(visit.id)
  await saveVisitVersion(updated, req.user.id)
  await addNotification(visit.patient_id, 'Kết quả khám đã sẵn sàng', 'Bác sĩ đã xác nhận và công bố kết quả, đơn thuốc hoặc hướng dẫn sau khám.', 'success')
  res.json({ visit: updated })
})

app.post('/api/visits/reception', authenticateToken, allowRoles('receptionist'), async (req, res) => {
  try {
    const { visitDate, specialty, reason } = req.body
    const identifier = (req.body.patientIdentifier || '').trim()
    const patient = await db.prepare(`
      SELECT users.id FROM users
      LEFT JOIN patients ON patients.user_id = users.id
      WHERE users.role = 'patient' AND (UPPER(patients.patient_code) = UPPER(?) OR LOWER(users.email) = LOWER(?))
    `).get(identifier, identifier)
    if (!patient) return res.status(404).json({ message: 'Không tìm thấy bệnh nhân với mã hoặc email này!' })
    if (!visitDate || !specialty || !reason) return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin lượt khám!' })

    const result = await db.prepare('INSERT INTO visits (patient_id, visit_date, specialty, reason, room) VALUES (?, ?, ?, ?, ?)').run(patient.id, visitDate, specialty, reason, req.body.room || null)
    await addNotification(patient.id, 'Đã tạo lượt khám trực tiếp', `Nhân viên y tế đã tạo lượt khám ngày ${visitDate}. Vui lòng đến quầy để được cấp số.`, 'info')
    const visit = await db.prepare('SELECT * FROM visits WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json({ visit: await visitDetails(visit) })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Không thể tạo lượt khám trực tiếp!' })
  }
})

// Nhân viên y tế tiếp nhận: đo sinh hiệu, cấp số và chuyển lượt khám cho bác sĩ.
app.post('/api/visits/:id/check-in', authenticateToken, allowRoles('receptionist'), async (req, res) => {
  try {
    const visit = await db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id)
    if (!visit) return res.status(404).json({ message: 'Không tìm thấy lượt khám!' })
    if (visit.status !== 'registered') return res.status(409).json({ message: 'Lượt khám này đã được tiếp nhận.' })

    const vitals = parseVitals(req.body.vitals)
    if (!vitals) return res.status(400).json({ message: 'Vui lòng nhập đầy đủ và đúng các chỉ số sinh hiệu!' })

    const doctor = await db.prepare("SELECT id, full_name FROM users WHERE id = ? AND role = 'doctor'").get(Number(req.body.doctorId))
    if (!doctor) return res.status(400).json({ message: 'Vui lòng chọn bác sĩ phụ trách!' })

    const room = req.body.room || visit.room || 'Phòng khám Tim mạch 01'
    const nextQueue = (await db.prepare('SELECT COALESCE(MAX(queue_number), 0) + 1 AS next FROM visits WHERE visit_date = ?').get(visit.visit_date)).next

    await db.prepare(`
      INSERT INTO vitals (user_id, visit_id, recorded_by, weight, systolic, diastolic, heart_rate, spo2, dyspnea, edema, chest_pain)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(visit.patient_id, visit.id, req.user.id, vitals.weight, vitals.systolic, vitals.diastolic, vitals.heartRate, vitals.spo2,
      vitals.dyspnea ? 1 : 0, vitals.edema ? 1 : 0, vitals.chestPain ? 1 : 0)
    await db.prepare("UPDATE visits SET doctor_id = ?, room = ?, queue_number = ?, status = 'waiting' WHERE id = ?").run(doctor.id, room, nextQueue, visit.id)

    await addNotification(visit.patient_id, 'Đã tiếp nhận lượt khám', `Bạn đã được cấp số thứ tự ${nextQueue}, khám với BS. ${doctor.full_name} tại ${room}. Vui lòng theo dõi hàng đợi.`, 'success')
    const patient = await db.prepare('SELECT full_name FROM users WHERE id = ?').get(visit.patient_id)
    await addNotification(doctor.id, 'Có bệnh nhân mới trong hàng đợi', `${patient?.full_name || 'Bệnh nhân'} (số ${nextQueue}) đã được đo sinh hiệu và chuyển đến ${room}.`, 'info')

    const updated = await db.prepare('SELECT * FROM visits WHERE id = ?').get(visit.id)
    res.json({ visit: await visitDetails(updated) })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Không thể tiếp nhận lượt khám!' })
  }
})

app.post('/api/visits/:id/call', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const visit = await db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id)
  if (!visit) return res.status(404).json({ message: 'Không tìm thấy lượt khám!' })
  await db.prepare("UPDATE visits SET status = 'called', called_at = CURRENT_TIMESTAMP WHERE id = ?").run(visit.id)
  await addNotification(visit.patient_id, 'Đến lượt khám', `Mời bệnh nhân đến ${visit.room || 'phòng khám'} để gặp bác sĩ.`, 'urgent')
  const updated = await db.prepare('SELECT * FROM visits WHERE id = ?').get(visit.id)
  res.json({ visit: await visitDetails(updated) })
})

app.post('/api/visits/:id/start', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const visit = await db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id)
  if (!visit) return res.status(404).json({ message: 'Không tìm thấy lượt khám!' })
  await db.prepare("UPDATE visits SET status = 'in_progress', started_at = CURRENT_TIMESTAMP WHERE id = ?").run(visit.id)
  const updated = await db.prepare('SELECT * FROM visits WHERE id = ?').get(visit.id)
  res.json({ visit: await visitDetails(updated) })
})

app.post('/api/visits/:id/absent', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const visit = await db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id)
  if (!visit) return res.status(404).json({ message: 'Không tìm thấy lượt khám!' })
  await db.prepare("UPDATE visits SET status = 'absent' WHERE id = ?").run(visit.id)
  await addNotification(visit.patient_id, 'Lượt khám đã được cập nhật', 'Bạn chưa có mặt khi được gọi. Vui lòng liên hệ quầy tiếp nhận nếu cần khám lại.', 'warning')
  const updated = await db.prepare('SELECT * FROM visits WHERE id = ?').get(visit.id)
  res.json({ visit: await visitDetails(updated) })
})

app.put('/api/visits/:id/result', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const visit = await db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id)
  if (!visit) return res.status(404).json({ message: 'Không tìm thấy lượt khám!' })

  const { examNotes, testInstruction, resultDueAt, resultMethod, resultText, prescription, followUpAt, status } = req.body
  const nextStatus = status === 'waiting_result' ? 'waiting_result' : 'completed'
  await db.prepare(`
    UPDATE visits SET exam_notes = ?, test_instruction = ?, result_due_at = ?, result_method = ?,
      result_text = ?, prescription = ?, follow_up_at = ?, status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(examNotes || null, testInstruction || null, resultDueAt || null, resultMethod || null,
    resultText || null, prescription || null, followUpAt || null, nextStatus, visit.id)

  await addNotification(visit.patient_id,
    nextStatus === 'waiting_result' ? 'Đã có lịch trả kết quả' : 'Kết quả khám đã sẵn sàng',
    nextStatus === 'waiting_result'
      ? `Vui lòng thực hiện theo hướng dẫn. Dự kiến trả kết quả: ${resultDueAt || 'sẽ cập nhật sau'}.`
      : 'Bạn có thể mở lượt khám để xem kết luận, đơn thuốc và hướng dẫn sau khám.',
    nextStatus === 'waiting_result' ? 'info' : 'success')

  if (followUpAt) await addNotification(visit.patient_id, 'Đã tạo lịch tái khám', `Lịch tái khám dự kiến vào ${followUpAt}.`, 'info')
  const updated = await db.prepare('SELECT * FROM visits WHERE id = ?').get(visit.id)
  res.json({ visit: await visitDetails(updated) })
})

app.get('/api/notifications', authenticateToken, async (req, res) => {
  const notifications = await db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 30').all(req.user.id)
  res.json({ notifications })
})

app.post('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  await db.prepare('UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id)
  res.json({ ok: true })
})

// =========================
// THỐNG KÊ BÁC SĨ
// =========================

app.get('/api/stats/doctor', authenticateToken, allowRoles('doctor'), async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

    const todayVisits = await db.prepare(`
      SELECT COUNT(*) AS total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status IN ('waiting', 'called', 'in_progress') THEN 1 ELSE 0 END) AS inProgress,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) AS absent
      FROM visits WHERE visit_date = ?
    `).get(today)

    const weekVisits = await db.prepare(`
      SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
      FROM visits WHERE visit_date >= ?
    `).get(weekAgo)

    const monthVisits = await db.prepare(`
      SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
      FROM visits WHERE visit_date >= ?
    `).get(monthAgo)

    const followUpCompliance = await db.prepare(`
      SELECT COUNT(*) AS totalWithFollowUp,
        SUM(CASE WHEN EXISTS (
          SELECT 1 FROM visits v2 WHERE v2.patient_id = v.patient_id AND v2.visit_date >= v.follow_up_at AND v2.id != v.id
        ) THEN 1 ELSE 0 END) AS returned
      FROM visits v
      WHERE v.follow_up_at IS NOT NULL AND v.follow_up_at <= ? AND v.status = 'completed'
    `).get(today)

    const allPatients = (await db.prepare('SELECT COUNT(*) AS count FROM patients').get()).count
    const patientsWithVitals = (await db.prepare('SELECT COUNT(DISTINCT user_id) AS count FROM vitals').get()).count
    const abnormalPatients = (await db.prepare(`
      SELECT COUNT(*) AS count FROM (
        SELECT user_id FROM vitals v
        WHERE v.id = (SELECT MAX(id) FROM vitals WHERE user_id = v.user_id)
          AND (v.weight >= 68.8 OR v.systolic >= 160 OR v.heart_rate >= 100 OR v.spo2 <= 93
               OR v.dyspnea = 1 OR v.edema = 1 OR v.chest_pain = 1)
      )
    `).get()).count

    const dailyBreakdown = await db.prepare(`
      SELECT visit_date AS date, COUNT(*) AS total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
      FROM visits WHERE visit_date >= ? GROUP BY visit_date ORDER BY visit_date
    `).all(weekAgo)

    res.json({
      today: todayVisits, week: weekVisits, month: monthVisits,
      followUp: followUpCompliance,
      patients: { total: allPatients, withVitals: patientsWithVitals, abnormal: abnormalPatients },
      dailyBreakdown,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Không thể tải thống kê!' })
  }
})

// =========================
// LỊCH LÀM VIỆC BÁC SĨ
// =========================

app.get('/api/doctor-schedules', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const schedules = await db.prepare('SELECT * FROM doctor_schedules WHERE doctor_id = ? ORDER BY day_of_week, start_time').all(req.user.id)
  const overrides = await db.prepare('SELECT * FROM schedule_overrides WHERE doctor_id = ? AND override_date >= date("now") ORDER BY override_date').all(req.user.id)
  res.json({ schedules, overrides })
})

app.post('/api/doctor-schedules', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const { dayOfWeek, startTime, endTime, maxPatients } = req.body
  if (dayOfWeek == null || !startTime || !endTime) return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin!' })
  const existing = await db.prepare('SELECT id FROM doctor_schedules WHERE doctor_id = ? AND day_of_week = ?').get(req.user.id, dayOfWeek)
  if (existing) {
    await db.prepare('UPDATE doctor_schedules SET start_time = ?, end_time = ?, max_patients = ?, is_active = 1 WHERE id = ?').run(startTime, endTime, maxPatients || 20, existing.id)
  } else {
    await db.prepare('INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, max_patients) VALUES (?, ?, ?, ?, ?)').run(req.user.id, dayOfWeek, startTime, endTime, maxPatients || 20)
  }
  const schedules = await db.prepare('SELECT * FROM doctor_schedules WHERE doctor_id = ? ORDER BY day_of_week, start_time').all(req.user.id)
  res.json({ schedules })
})

app.put('/api/doctor-schedules/:id', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const { startTime, endTime, maxPatients, isActive } = req.body
  await db.prepare('UPDATE doctor_schedules SET start_time = ?, end_time = ?, max_patients = ?, is_active = ? WHERE id = ? AND doctor_id = ?').run(startTime, endTime, maxPatients || 20, isActive ? 1 : 0, req.params.id, req.user.id)
  const schedules = await db.prepare('SELECT * FROM doctor_schedules WHERE doctor_id = ? ORDER BY day_of_week, start_time').all(req.user.id)
  res.json({ schedules })
})

app.delete('/api/doctor-schedules/:id', authenticateToken, allowRoles('doctor'), async (req, res) => {
  await db.prepare('DELETE FROM doctor_schedules WHERE id = ? AND doctor_id = ?').run(req.params.id, req.user.id)
  res.json({ ok: true })
})

app.post('/api/schedule-overrides', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const { overrideDate, isAvailable, reason } = req.body
  if (!overrideDate) return res.status(400).json({ message: 'Vui lòng nhập ngày!' })
  const existing = await db.prepare('SELECT id FROM schedule_overrides WHERE doctor_id = ? AND override_date = ?').get(req.user.id, overrideDate)
  if (existing) {
    await db.prepare('UPDATE schedule_overrides SET is_available = ?, reason = ? WHERE id = ?').run(isAvailable ? 1 : 0, reason || null, existing.id)
  } else {
    await db.prepare('INSERT INTO schedule_overrides (doctor_id, override_date, is_available, reason) VALUES (?, ?, ?, ?)').run(req.user.id, overrideDate, isAvailable ? 1 : 0, reason || null)
  }
  const overrides = await db.prepare('SELECT * FROM schedule_overrides WHERE doctor_id = ? AND override_date >= date("now") ORDER BY override_date').all(req.user.id)
  res.json({ overrides })
})

app.delete('/api/schedule-overrides/:id', authenticateToken, allowRoles('doctor'), async (req, res) => {
  await db.prepare('DELETE FROM schedule_overrides WHERE id = ? AND doctor_id = ?').run(req.params.id, req.user.id)
  res.json({ ok: true })
})

// Public: check doctor availability for a date
app.get('/api/doctor-availability', authenticateToken, async (req, res) => {
  const { doctorId, date } = req.query
  if (!date) return res.status(400).json({ message: 'Vui lòng chọn ngày!' })
  const dayOfWeek = new Date(date).getDay()
  const override = doctorId
    ? await db.prepare('SELECT * FROM schedule_overrides WHERE doctor_id = ? AND override_date = ?').get(doctorId, date)
    : null
  if (override && !override.is_available) return res.json({ available: false, reason: override.reason || 'Bác sĩ nghỉ' })
  const schedule = doctorId
    ? await db.prepare('SELECT * FROM doctor_schedules WHERE doctor_id = ? AND day_of_week = ? AND is_active = 1').get(doctorId, dayOfWeek)
    : null
  if (doctorId && !schedule && !override) return res.json({ available: false, reason: 'Bác sĩ không có lịch khám ngày này' })
  const booked = doctorId
    ? (await db.prepare("SELECT COUNT(*) AS count FROM visits WHERE doctor_id = ? AND visit_date = ? AND status != 'absent'").get(doctorId, date)).count
    : 0
  res.json({ available: true, schedule, booked, remaining: schedule ? schedule.max_patients - booked : null })
})

// =========================
// PHÂN LOẠI ƯU TIÊN (TRIAGE)
// =========================

app.put('/api/visits/:id/priority', authenticateToken, allowRoles('doctor', 'receptionist'), async (req, res) => {
  const { priority } = req.body
  if (!['emergency', 'urgent', 'normal'].includes(priority)) return res.status(400).json({ message: 'Mức ưu tiên không hợp lệ!' })
  const visit = await db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id)
  if (!visit) return res.status(404).json({ message: 'Không tìm thấy lượt khám!' })
  await db.prepare('UPDATE visits SET priority = ? WHERE id = ?').run(priority, visit.id)
  if (priority === 'emergency') {
    await addNotification(visit.patient_id, 'Lượt khám được ưu tiên', 'Lượt khám của bạn đã được phân loại cấp cứu và sẽ được xử lý ưu tiên.', 'urgent')
  }
  const updated = await db.prepare('SELECT * FROM visits WHERE id = ?').get(visit.id)
  res.json({ visit: await visitDetails(updated) })
})

// =========================
// ICD-10
// =========================

app.get('/api/icd10', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const q = req.query.q || ''
  const category = req.query.category || ''
  let codes
  if (q) {
    const pattern = `%${q}%`
    codes = await db.prepare('SELECT * FROM icd10_codes WHERE code LIKE ? OR description_vi LIKE ? OR description_en LIKE ? ORDER BY code LIMIT 20').all(pattern, pattern, pattern)
  } else if (category) {
    codes = await db.prepare('SELECT * FROM icd10_codes WHERE category = ? ORDER BY code').all(category)
  } else {
    codes = await db.prepare('SELECT * FROM icd10_codes ORDER BY code').all()
  }
  res.json({ codes })
})

app.put('/api/visits/:id/diagnosis', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const { icdCode, icdDescription } = req.body
  const visit = await db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id)
  if (!visit) return res.status(404).json({ message: 'Không tìm thấy lượt khám!' })
  await db.prepare('UPDATE visits SET icd_code = ?, icd_description = ? WHERE id = ?').run(icdCode || null, icdDescription || null, visit.id)
  const updated = await db.prepare('SELECT * FROM visits WHERE id = ?').get(visit.id)
  res.json({ visit: updated })
})

// =========================
// SOAP NOTES
// =========================

app.put('/api/visits/:id/soap', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const { subjective, objective, assessment, plan } = req.body
  const visit = await db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id)
  if (!visit) return res.status(404).json({ message: 'Không tìm thấy lượt khám!' })
  await db.prepare('UPDATE visits SET soap_subjective = ?, soap_objective = ?, soap_assessment = ?, soap_plan = ? WHERE id = ?').run(subjective || null, objective || null, assessment || null, plan || null, visit.id)
  const updated = await db.prepare('SELECT * FROM visits WHERE id = ?').get(visit.id)
  res.json({ visit: updated })
})

// =========================
// CHỈ ĐỊNH XÉT NGHIỆM
// =========================

app.get('/api/visits/:id/lab-orders', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const orders = await db.prepare('SELECT lab_orders.*, users.full_name AS ordered_by_name FROM lab_orders LEFT JOIN users ON users.id = lab_orders.ordered_by WHERE visit_id = ? ORDER BY ordered_at DESC').all(req.params.id)
  res.json({ orders })
})

app.post('/api/visits/:id/lab-orders', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const visit = await db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id)
  if (!visit) return res.status(404).json({ message: 'Không tìm thấy lượt khám!' })
  const { testName, testCode, urgency, notes } = req.body
  if (!testName) return res.status(400).json({ message: 'Vui lòng nhập tên xét nghiệm!' })
  const result = await db.prepare('INSERT INTO lab_orders (visit_id, test_name, test_code, urgency, notes, ordered_by) VALUES (?, ?, ?, ?, ?, ?)').run(visit.id, testName, testCode || null, urgency || 'routine', notes || null, req.user.id)
  const order = await db.prepare('SELECT * FROM lab_orders WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json({ order })
})

app.put('/api/lab-orders/:id', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const { status, resultText } = req.body
  const updates = []
  const params = []
  if (status) { updates.push('status = ?'); params.push(status) }
  if (resultText !== undefined) { updates.push('result_text = ?'); params.push(resultText) }
  if (status === 'completed') { updates.push('completed_at = CURRENT_TIMESTAMP') }
  if (updates.length === 0) return res.status(400).json({ message: 'Không có gì để cập nhật!' })
  params.push(req.params.id)
  await db.prepare(`UPDATE lab_orders SET ${updates.join(', ')} WHERE id = ?`).run(...params)
  const order = await db.prepare('SELECT * FROM lab_orders WHERE id = ?').get(req.params.id)
  res.json({ order })
})

app.delete('/api/lab-orders/:id', authenticateToken, allowRoles('doctor'), async (req, res) => {
  await db.prepare("DELETE FROM lab_orders WHERE id = ? AND status = 'ordered'").run(req.params.id)
  res.json({ ok: true })
})

// =========================
// KIỂM TRA TƯƠNG TÁC THUỐC
// =========================

app.post('/api/drug-interactions/check', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const { drugs } = req.body
  if (!drugs || !Array.isArray(drugs) || drugs.length < 2) return res.json({ interactions: [] })
  const normalized = drugs.map((d) => d.trim().toLowerCase())
  const allInteractions = await db.prepare('SELECT * FROM drug_interactions').all()
  const found = []
  for (const interaction of allInteractions) {
    const a = interaction.drug_a.toLowerCase()
    const b = interaction.drug_b.toLowerCase()
    for (let i = 0; i < normalized.length; i++) {
      for (let j = i + 1; j < normalized.length; j++) {
        if ((normalized[i].includes(a) || a.includes(normalized[i])) && (normalized[j].includes(b) || b.includes(normalized[j]))) {
          found.push(interaction)
        } else if ((normalized[j].includes(a) || a.includes(normalized[j])) && (normalized[i].includes(b) || b.includes(normalized[i]))) {
          found.push(interaction)
        }
      }
    }
  }
  res.json({ interactions: found })
})

// =========================
// CHỮ KÝ SỐ
// =========================

app.post('/api/visits/:id/sign', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const visit = await db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id)
  if (!visit) return res.status(404).json({ message: 'Không tìm thấy lượt khám!' })
  if (visit.result_status !== 'published') return res.status(400).json({ message: 'Chỉ có thể ký kết quả đã công bố!' })
  const { password } = req.body
  if (!password) return res.status(400).json({ message: 'Vui lòng nhập mật khẩu để xác nhận!' })
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  const passwordCorrect = await bcrypt.compare(password, user.password)
  if (!passwordCorrect) return res.status(401).json({ message: 'Mật khẩu không đúng!' })

  const content = [visit.exam_notes, visit.result_text, visit.prescription, visit.icd_code, visit.soap_subjective, visit.soap_objective, visit.soap_assessment, visit.soap_plan].filter(Boolean).join('|')
  const hash = crypto.createHash('sha256').update(`${req.user.id}:${visit.id}:${content}:${Date.now()}`).digest('hex')
  await db.prepare('UPDATE visits SET signed_at = CURRENT_TIMESTAMP, signature_hash = ? WHERE id = ?').run(hash, visit.id)
  await addNotification(visit.patient_id, 'Kết quả khám đã được ký xác nhận', 'Bác sĩ đã ký xác nhận kết quả khám của bạn.', 'success')
  const updated = await db.prepare('SELECT * FROM visits WHERE id = ?').get(visit.id)
  res.json({ visit: updated })
})

// =========================
// LỊCH TÁI KHÁM (DỮ LIỆU THẬT)
// =========================

app.get('/api/appointments', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const rows = await db.prepare(`
    SELECT visits.*, users.full_name AS patient_name, patients.patient_code
    FROM visits
    JOIN users ON users.id = visits.patient_id
    LEFT JOIN patients ON patients.user_id = visits.patient_id
    WHERE (visits.doctor_id = ? OR visits.doctor_id IS NULL)
      AND visits.status != 'absent'
    ORDER BY visits.visit_date DESC, visits.id DESC
    LIMIT 50
  `).all(req.user.id)
  res.json({ appointments: rows })
})

// =========================
// TEMPLATE KẾT QUẢ KHÁM
// =========================

app.get('/api/templates', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const templates = await db.prepare('SELECT * FROM result_templates ORDER BY usage_count DESC, id').all()
  res.json({ templates })
})

app.post('/api/templates', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const { name, examNotes, resultText, prescription } = req.body
  if (!name) return res.status(400).json({ message: 'Tên mẫu không được để trống!' })
  const result = await db.prepare('INSERT INTO result_templates (name, exam_notes, result_text, prescription, created_by) VALUES (?, ?, ?, ?, ?)').run(name, examNotes || null, resultText || null, prescription || null, req.user.id)
  const template = await db.prepare('SELECT * FROM result_templates WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json({ template })
})

app.put('/api/templates/:id', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const { name, examNotes, resultText, prescription } = req.body
  await db.prepare('UPDATE result_templates SET name = ?, exam_notes = ?, result_text = ?, prescription = ? WHERE id = ?').run(name, examNotes || null, resultText || null, prescription || null, req.params.id)
  const template = await db.prepare('SELECT * FROM result_templates WHERE id = ?').get(req.params.id)
  res.json({ template })
})

app.delete('/api/templates/:id', authenticateToken, allowRoles('doctor'), async (req, res) => {
  await db.prepare('DELETE FROM result_templates WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

app.post('/api/templates/:id/use', authenticateToken, allowRoles('doctor'), async (req, res) => {
  await db.prepare('UPDATE result_templates SET usage_count = usage_count + 1 WHERE id = ?').run(req.params.id)
  const template = await db.prepare('SELECT * FROM result_templates WHERE id = ?').get(req.params.id)
  res.json({ template })
})

// =========================
// XUẤT BỆNH ÁN
// =========================

app.get('/api/patients/:userId/export', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const patient = await db.prepare(`
    SELECT patients.*, users.full_name, users.email
    FROM patients JOIN users ON patients.user_id = users.id WHERE patients.user_id = ?
  `).get(req.params.userId)
  if (!patient) return res.status(404).json({ message: 'Không tìm thấy bệnh nhân!' })

  const vitals = await db.prepare('SELECT * FROM vitals WHERE user_id = ? ORDER BY id DESC LIMIT 20').all(req.params.userId)
  const visits = await db.prepare(`
    SELECT visits.*, doctors.full_name AS doctor_name
    FROM visits LEFT JOIN users doctors ON doctors.id = visits.doctor_id
    WHERE visits.patient_id = ? ORDER BY visits.visit_date DESC
  `).all(req.params.userId)

  res.json({
    patient: {
      fullName: patient.full_name, email: patient.email, patientCode: patient.patient_code,
      dateOfBirth: patient.date_of_birth, gender: patient.gender, phone: patient.phone, address: patient.address,
    },
    vitals: vitals.map((v) => ({
      weight: v.weight, systolic: v.systolic, diastolic: v.diastolic,
      heartRate: v.heart_rate, spo2: v.spo2,
      dyspnea: Boolean(v.dyspnea), edema: Boolean(v.edema), chestPain: Boolean(v.chest_pain),
      createdAt: v.created_at,
    })),
    visits: visits.map((v) => ({
      visitDate: v.visit_date, specialty: v.specialty, reason: v.reason,
      status: v.status, examNotes: v.exam_notes, resultText: v.result_text,
      prescription: v.prescription, followUpAt: v.follow_up_at,
      doctorName: v.doctor_name, completedAt: v.completed_at,
    })),
  })
})

// SPA fallback — must be after all API routes
app.use((req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'))
})

// =========================
// KHỞI ĐỘNG
// =========================

async function start() {
  await initDatabase()

  // Demo receptionist account
  const receptionDemo = await db.prepare('SELECT id FROM users WHERE email = ?').get('reception@demo.vn')
  if (!receptionDemo) {
    const password = bcrypt.hashSync('123456', 10)
    await db.prepare('INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)').run('Nhân viên y tế', 'reception@demo.vn', password, 'receptionist')
  } else {
    await db.prepare('UPDATE users SET full_name = ? WHERE email = ?').run('Nhân viên y tế', 'reception@demo.vn')
  }

  app.listen(PORT, () => {
    console.log(`CRE-HINT Backend đang chạy tại http://localhost:${PORT}`)
  })
}

start().catch((error) => {
  console.error('Không thể khởi động server:', error)
  process.exit(1)
})
