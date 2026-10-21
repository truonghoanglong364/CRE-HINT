const express = require('express')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const db = require('./database')

const app = express()
const PORT = process.env.PORT || 3000
const JWT_SECRET = process.env.JWT_SECRET || 'cre-hint-development-secret'

app.use(cors())
app.use(express.json())

function authenticateToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: 'Vui lòng đăng nhập lại!' })
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' })
  }
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Bạn không có quyền thực hiện thao tác này.' })
    }

    next()
  }
}

// Demo account for the reception desk.
const receptionDemo = db.prepare('SELECT id FROM users WHERE email = ?').get('reception@demo.vn')
if (!receptionDemo) {
  const password = bcrypt.hashSync('123456', 10)
  db.prepare('INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)')
    .run('Nhân viên y tế', 'reception@demo.vn', password, 'receptionist')
} else {
  db.prepare('UPDATE users SET full_name = ? WHERE email = ?').run('Nhân viên y tế', 'reception@demo.vn')
}

function addNotification(userId, title, message, type = 'info') {
  db.prepare(`
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (?, ?, ?, ?)
  `).run(userId, title, message, type)
}

function visitDetails(visit) {
  if (!visit) return null

  const ahead = visit.queue_number
    ? db.prepare(`
        SELECT COUNT(*) AS count
        FROM visits
        WHERE visit_date = ?
          AND queue_number < ?
          AND status IN ('waiting', 'called', 'in_progress')
      `).get(visit.visit_date, visit.queue_number).count
    : null

  return { ...visit, peopleAhead: ahead }
}

function publicVisit(visit) {
  const result = visitDetails(visit)
  if (!result || result.result_status === 'published') return result
  return {
    ...result,
    exam_notes: null,
    result_text: null,
    prescription: null,
    follow_up_at: null,
  }
}

function saveVisitVersion(visit, userId) {
  const nextVersion = db.prepare('SELECT COALESCE(MAX(version_no), 0) + 1 AS next FROM visit_versions WHERE visit_id = ?').get(visit.id).next
  db.prepare(`
    INSERT INTO visit_versions (visit_id, version_no, exam_notes, result_text, prescription, follow_up_at, result_status, saved_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(visit.id, nextVersion, visit.exam_notes, visit.result_text, visit.prescription, visit.follow_up_at, visit.result_status, userId)
}

// =========================
// KIỂM TRA SERVER
// =========================

app.get('/', (req, res) => {
  res.json({
    message: 'CRE-HINT Backend đang hoạt động!'
  })
})

// =========================
// ĐĂNG KÝ
// =========================

app.post('/api/register', async (req, res) => {
  try {
    const { fullName,email, password, role } = req.body

    // Kiểm tra dữ liệu
    if (!fullName || !password || !role || (role !== 'patient' && !email)) {
      return res.status(400).json({
        message: 'Vui lòng nhập đầy đủ thông tin!'
      })
    }

    if (!['patient', 'doctor', 'receptionist'].includes(role)) {
      return res.status(400).json({
        message: 'Vai trò không hợp lệ!'
      })
    }

    // Kiểm tra email đã tồn tại chưa
    const existingUser = email ? db.prepare('SELECT * FROM users WHERE email = ?').get(email) : null

    if (existingUser) {
      return res.status(409).json({
        message: 'Email này đã được đăng ký!'
      })
    }

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10)

    // Lưu vào database
    const result = db.prepare(`
      INSERT INTO users (full_name, email, password, role)
      VALUES (?, ?, ?, ?)
    `).run(fullName, email || null, hashedPassword, role)

    let patientCode = null

    if (role === 'patient') {
      // Tạo hồ sơ bệnh nhân
      const patientResult = db.prepare(`
        INSERT INTO patients (user_id)
        VALUES (?)
      `).run(result.lastInsertRowid)

      // Tự sinh mã BN0001, BN0002,...
      patientCode = `BN${String(patientResult.lastInsertRowid).padStart(4, '0')}`

      db.prepare(`
        UPDATE patients
        SET patient_code = ?
        WHERE id = ?
      `).run(patientCode, patientResult.lastInsertRowid)
    }

    res.status(201).json({
      message: 'Đăng ký tài khoản thành công!',
      user: {
        id: result.lastInsertRowid,
        fullName,
        email: email || null,
        role,
        patientCode
      }
    })

  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: 'Có lỗi xảy ra ở server!'
    })
  }
})

// =========================
// ĐĂNG NHẬP
// =========================

app.post('/api/login', async (req, res) => {
  try {
    const { identifier, email, password } = req.body
    const loginIdentifier = identifier || email

    if (!loginIdentifier || !password) {
      return res.status(400).json({
        message: 'Vui lòng nhập email và mật khẩu!'
      })
    }

    // Tìm tài khoản theo email
    const user = db.prepare(`
      SELECT users.*, patients.patient_code
      FROM users
      LEFT JOIN patients ON patients.user_id = users.id
      WHERE (users.email = ? AND users.role != 'patient')
         OR (patients.patient_code = ? AND users.role = 'patient')
    `).get(loginIdentifier, loginIdentifier)

    if (!user) {
      return res.status(401).json({
        message: 'Email hoặc mật khẩu không đúng!'
      })
    }

    // So sánh mật khẩu với mật khẩu đã mã hóa
    const passwordCorrect = await bcrypt.compare(
      password,
      user.password
    )

    if (!passwordCorrect) {
      return res.status(401).json({
        message: 'Email hoặc mật khẩu không đúng!'
      })
    }

    res.json({
      message: 'Đăng nhập thành công!',
      token: jwt.sign(
        { id: user.id, role: user.role },
        JWT_SECRET,
        { expiresIn: '12h' }
      ),
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        patientCode: user.patient_code,
        role: user.role
      }
    })

  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: 'Có lỗi xảy ra ở server!'
    })
  }
})

// =========================
// GHI NHẬN VÀ LẤY CHỈ SỐ
// =========================

app.post('/api/vitals', authenticateToken, allowRoles('patient'), (req, res) => {
  try {
    const userId = req.user.id
    const measurements = {
      weight: Number(req.body.weight),
      systolic: Number(req.body.systolic),
      diastolic: Number(req.body.diastolic),
      heartRate: Number(req.body.heartRate),
      spo2: Number(req.body.spo2),
    }
    const symptoms = {
      dyspnea: Boolean(req.body.dyspnea),
      edema: Boolean(req.body.edema),
      chestPain: Boolean(req.body.chestPain),
    }

    if (!Number.isInteger(userId) || userId < 1 ||
        !Object.values(measurements).every(Number.isFinite) ||
        measurements.weight <= 0 || measurements.systolic <= 0 ||
        measurements.diastolic <= 0 || measurements.heartRate <= 0 ||
        measurements.spo2 < 0 || measurements.spo2 > 100) {
      return res.status(400).json({ message: 'Chỉ số gửi lên không hợp lệ!' })
    }

    const patient = db.prepare(`
      SELECT users.id
      FROM users
      JOIN patients ON patients.user_id = users.id
      WHERE users.id = ? AND users.role = 'patient'
    `).get(userId)

    if (!patient) {
      return res.status(404).json({ message: 'Không tìm thấy bệnh nhân!' })
    }

    const result = db.prepare(`
      INSERT INTO vitals (
        user_id, weight, systolic, diastolic, heart_rate, spo2,
        dyspnea, edema, chest_pain
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      measurements.weight,
      measurements.systolic,
      measurements.diastolic,
      measurements.heartRate,
      measurements.spo2,
      symptoms.dyspnea ? 1 : 0,
      symptoms.edema ? 1 : 0,
      symptoms.chestPain ? 1 : 0
    )

    res.status(201).json({
      message: 'Đã gửi chỉ số sức khỏe cho bác sĩ.',
      vital: {
        id: result.lastInsertRowid,
        ...measurements,
        ...symptoms,
        createdAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Không thể lưu chỉ số sức khỏe!' })
  }
})

app.get('/api/vitals', authenticateToken, (req, res) => {
  try {
    const userId = Number(req.query.userId)

    if (!Number.isInteger(userId) || userId < 1) {
      return res.status(400).json({ message: 'Mã bệnh nhân không hợp lệ!' })
    }

    if (req.user.role === 'patient' && req.user.id !== userId) {
      return res.status(403).json({ message: 'Bạn chỉ có thể xem chỉ số của mình.' })
    }

    if (!['patient', 'doctor'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Bạn không có quyền xem chỉ số.' })
    }

    const vitals = db.prepare(`
      SELECT
        id,
        user_id AS userId,
        weight,
        systolic,
        diastolic,
        heart_rate AS heartRate,
        spo2,
        dyspnea,
        edema,
        chest_pain AS chestPain,
        created_at AS createdAt
      FROM vitals
      WHERE user_id = ?
      ORDER BY id DESC
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

app.get('/api/patients', authenticateToken, allowRoles('doctor'), (req, res) => {
  try {
    const patients = db.prepare(`
      SELECT
        patients.id,
        patients.user_id AS userId,
        patients.patient_code AS patientCode,
        users.full_name AS fullName,
        users.email,
        patients.date_of_birth AS dateOfBirth,
        patients.gender,
        patients.phone,
        patients.address,
        latest.weight,
        latest.systolic,
        latest.diastolic,
        latest.heart_rate AS heartRate,
        latest.spo2,
        latest.dyspnea,
        latest.edema,
        latest.chest_pain AS chestPain,
        latest.created_at AS lastSubmittedAt
      FROM patients
      JOIN users ON patients.user_id = users.id
      LEFT JOIN vitals AS latest
        ON latest.id = (
          SELECT id FROM vitals
          WHERE user_id = patients.user_id
          ORDER BY id DESC
          LIMIT 1
        )
      ORDER BY patients.id DESC
    `).all()

    res.json({
      patients
    })

  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: 'Không thể lấy danh sách bệnh nhân!'
    })
  }
})

// =========================
// CẬP NHẬT HỒ SƠ BỆNH NHÂN
// =========================

app.put('/api/patients/:userId/profile', (req, res) => {
  try {
    const { userId } = req.params
    const {
      dateOfBirth,
      gender,
      phone,
      address
    } = req.body

    const patient = db
      .prepare('SELECT * FROM patients WHERE user_id = ?')
      .get(userId)

    if (!patient) {
      return res.status(404).json({
        message: 'Không tìm thấy hồ sơ bệnh nhân!'
      })
    }

    db.prepare(`
      UPDATE patients
      SET
        date_of_birth = ?,
        gender = ?,
        phone = ?,
        address = ?
      WHERE user_id = ?
    `).run(
      dateOfBirth,
      gender,
      phone,
      address,
      userId
    )

    res.json({
      message: 'Cập nhật hồ sơ thành công!'
    })

  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: 'Không thể cập nhật hồ sơ!'
    })
  }
})

app.listen(PORT, () => {
  console.log(`CRE-HINT Backend đang chạy tại http://localhost:${PORT}`)
})

// =========================
// LƯỢT KHÁM VÀ THÔNG BÁO
// =========================

app.post('/api/visits', authenticateToken, allowRoles('patient'), (req, res) => {
  try {
    const { visitDate, specialty, reason, doctorId } = req.body

    if (!visitDate || !specialty || !reason) {
      return res.status(400).json({ message: 'Vui lòng nhập ngày khám, chuyên khoa và lý do khám!' })
    }

    const result = db.prepare(`
      INSERT INTO visits (patient_id, doctor_id, visit_date, specialty, reason)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user.id, doctorId || null, visitDate, specialty, reason)

    addNotification(
      req.user.id,
      'Đăng ký khám thành công',
      `Yêu cầu khám ngày ${visitDate} đã được ghi nhận. Vui lòng chờ bệnh viện tiếp nhận.`,
      'success'
    )

    res.status(201).json({ visit: visitDetails(db.prepare('SELECT * FROM visits WHERE id = ?').get(result.lastInsertRowid)) })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Không thể tạo lượt khám!' })
  }
})

app.get('/api/visits/mine', authenticateToken, allowRoles('patient'), (req, res) => {
  const visits = db.prepare(`
    SELECT visits.*, users.full_name AS doctor_name
    FROM visits
    LEFT JOIN users ON users.id = visits.doctor_id
    WHERE visits.patient_id = ?
    ORDER BY visits.visit_date DESC, visits.id DESC
  `).all(req.user.id).map(publicVisit)

  res.json({ visits })
})

app.get('/api/visits/queue', authenticateToken, allowRoles('doctor', 'receptionist'), (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10)
  const visits = db.prepare(`
    SELECT visits.*, patients.patient_code, users.full_name AS patient_name,
           doctors.full_name AS doctor_name
    FROM visits
    JOIN users ON users.id = visits.patient_id
    LEFT JOIN patients ON patients.user_id = visits.patient_id
    LEFT JOIN users doctors ON doctors.id = visits.doctor_id
    WHERE visits.visit_date = ?
    ORDER BY CASE visits.status
      WHEN 'in_progress' THEN 1 WHEN 'called' THEN 2 WHEN 'waiting' THEN 3
      WHEN 'registered' THEN 4 ELSE 5 END, visits.queue_number, visits.id
  `).all(date).map(visitDetails)

  res.json({ visits, date })
})

app.get('/api/visits/:id/clinical-support', authenticateToken, allowRoles('doctor'), (req, res) => {
  const visit = db.prepare(`
    SELECT visits.*, users.full_name AS patient_name, users.email AS patient_email,
           patients.patient_code
    FROM visits
    JOIN users ON users.id = visits.patient_id
    LEFT JOIN patients ON patients.user_id = visits.patient_id
    WHERE visits.id = ?
  `).get(req.params.id)
  if (!visit) return res.status(404).json({ message: 'Không tìm thấy lượt khám!' })
  const hospitalData = db.prepare('SELECT * FROM hospital_data WHERE visit_id = ? ORDER BY id DESC LIMIT 1').get(visit.id)
  const aiSupport = db.prepare('SELECT * FROM ai_support WHERE visit_id = ? ORDER BY id DESC LIMIT 1').get(visit.id)
  const versions = db.prepare('SELECT * FROM visit_versions WHERE visit_id = ? ORDER BY version_no DESC').all(visit.id)
  res.json({ visit, hospitalData, aiSupport, versions })
})

app.post('/api/visits/:id/mock-hospital-data', authenticateToken, allowRoles('doctor'), (req, res) => {
  const visit = db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id)
  if (!visit) return res.status(404).json({ message: 'Không tìm thấy lượt khám!' })
  const payload = {
    patientId: visit.patient_id,
    visitId: visit.id,
    vitals: { bloodPressure: '145/90', heartRate: 96, spo2: 94, weight: 68.5 },
    medications: ['Bisoprolol 2.5 mg', 'Furosemide 40 mg'],
    note: 'Dữ liệu mẫu phục vụ trình diễn AI-CDSS',
  }
  const result = db.prepare(`
    INSERT INTO hospital_data (visit_id, source_system, payload_json, validation_status, missing_fields, validation_errors, duplicate_check)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(visit.id, req.body.sourceSystem || 'HIS/EMR mô phỏng', JSON.stringify(payload), 'valid', 'Chưa có dữ liệu BNP/NT-proBNP', null, 'Không phát hiện bản ghi trùng')
  res.status(201).json({ hospitalData: db.prepare('SELECT * FROM hospital_data WHERE id = ?').get(result.lastInsertRowid) })
})

app.post('/api/visits/:id/ai-support', authenticateToken, allowRoles('doctor'), (req, res) => {
  const visit = db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id)
  const hospitalData = db.prepare('SELECT * FROM hospital_data WHERE visit_id = ? ORDER BY id DESC LIMIT 1').get(req.params.id)
  if (!visit) return res.status(404).json({ message: 'Không tìm thấy lượt khám!' })
  if (!hospitalData) return res.status(400).json({ message: 'Cần tiếp nhận dữ liệu bệnh viện trước khi chạy hỗ trợ chuyên môn.' })
  const result = db.prepare(`
    INSERT INTO ai_support (visit_id, hospital_data_id, input_summary, missing_data, diagnosis, lab_test, treatment, med_safety)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(visit.id, hospitalData.id, 'Sinh hiệu, thuốc đang dùng và lý do khám từ bộ dữ liệu mô phỏng', 'Chưa có BNP/NT-proBNP; cần bổ sung nếu bác sĩ thấy phù hợp', 'Gợi ý theo dõi suy tim sung huyết, cần bác sĩ xác nhận', 'Cân nhắc BNP/NT-proBNP, điện giải đồ và siêu âm tim', 'Tiếp tục theo dõi cân nặng, huyết áp; rà soát đáp ứng lợi tiểu', 'Kiểm tra nguy cơ hạ huyết áp và rối loạn điện giải khi phối hợp thuốc')
  res.status(201).json({ aiSupport: db.prepare('SELECT * FROM ai_support WHERE id = ?').get(result.lastInsertRowid), simulated: true })
})

app.put('/api/visits/:id/ai-review', authenticateToken, allowRoles('doctor'), (req, res) => {
  const status = ['accepted', 'adjusted', 'rejected'].includes(req.body.status) ? req.body.status : null
  if (!status) return res.status(400).json({ message: 'Trạng thái phản hồi không hợp lệ!' })
  const ai = db.prepare('SELECT * FROM ai_support WHERE visit_id = ? ORDER BY id DESC LIMIT 1').get(req.params.id)
  if (!ai) return res.status(404).json({ message: 'Chưa có kết quả hỗ trợ chuyên môn!' })
  db.prepare(`UPDATE ai_support SET review_status = ?, doctor_feedback = ?, confirmed_plan = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?`).run(status, req.body.feedback || null, req.body.confirmedPlan || null, ai.id)
  res.json({ aiSupport: db.prepare('SELECT * FROM ai_support WHERE id = ?').get(ai.id) })
})

app.put('/api/visits/:id/draft', authenticateToken, allowRoles('doctor'), (req, res) => {
  const visit = db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id)
  if (!visit) return res.status(404).json({ message: 'Không tìm thấy lượt khám!' })
  db.prepare(`UPDATE visits SET exam_notes = ?, result_text = ?, prescription = ?, follow_up_at = ?, result_status = 'draft', result_version = result_version + 1 WHERE id = ?`).run(req.body.examNotes || null, req.body.resultText || null, req.body.prescription || null, req.body.followUpAt || null, visit.id)
  saveVisitVersion(db.prepare('SELECT * FROM visits WHERE id = ?').get(visit.id), req.user.id)
  res.json({ visit: db.prepare('SELECT * FROM visits WHERE id = ?').get(visit.id) })
})

app.post('/api/visits/:id/restore-version', authenticateToken, allowRoles('doctor'), (req, res) => {
  const version = db.prepare('SELECT * FROM visit_versions WHERE id = ? AND visit_id = ?').get(req.body.versionId, req.params.id)
  if (!version) return res.status(404).json({ message: 'Không tìm thấy phiên bản backup!' })
  db.prepare(`UPDATE visits SET exam_notes = ?, result_text = ?, prescription = ?, follow_up_at = ?, result_status = 'draft', result_version = result_version + 1 WHERE id = ?`).run(version.exam_notes, version.result_text, version.prescription, req.params.id)
  saveVisitVersion(db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id), req.user.id)
  res.json({ visit: db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id) })
})

app.post('/api/visits/:id/publish', authenticateToken, allowRoles('doctor'), (req, res) => {
  const visit = db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id)
  if (!visit) return res.status(404).json({ message: 'Không tìm thấy lượt khám!' })
  db.prepare(`UPDATE visits SET result_status = 'published', status = 'completed', published_at = CURRENT_TIMESTAMP, completed_at = CURRENT_TIMESTAMP WHERE id = ?`).run(visit.id)
  saveVisitVersion(db.prepare('SELECT * FROM visits WHERE id = ?').get(visit.id), req.user.id)
  addNotification(visit.patient_id, 'Kết quả khám đã sẵn sàng', 'Bác sĩ đã xác nhận và công bố kết quả, đơn thuốc hoặc hướng dẫn sau khám.', 'success')
  res.json({ visit: db.prepare('SELECT * FROM visits WHERE id = ?').get(visit.id) })
})

app.post('/api/visits/reception', authenticateToken, allowRoles('receptionist'), (req, res) => {
  try {
    const { patientEmail, visitDate, specialty, reason } = req.body
    const patient = db.prepare("SELECT id FROM users WHERE email = ? AND role = 'patient'").get(patientEmail)

    if (!patient) return res.status(404).json({ message: 'Không tìm thấy bệnh nhân với email này!' })
    if (!visitDate || !specialty || !reason) return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin lượt khám!' })

    const result = db.prepare(`
      INSERT INTO visits (patient_id, visit_date, specialty, reason, room)
      VALUES (?, ?, ?, ?, ?)
    `).run(patient.id, visitDate, specialty, reason, req.body.room || null)

    addNotification(patient.id, 'Đã tạo lượt khám trực tiếp', `Nhân viên y tế đã tạo lượt khám ngày ${visitDate}. Vui lòng đến quầy để được cấp số.`, 'info')
    res.status(201).json({ visit: visitDetails(db.prepare('SELECT * FROM visits WHERE id = ?').get(result.lastInsertRowid)) })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Không thể tạo lượt khám trực tiếp!' })
  }
})

app.post('/api/visits/:id/check-in', authenticateToken, allowRoles('doctor', 'receptionist'), (req, res) => {
  const visit = db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id)
  if (!visit) return res.status(404).json({ message: 'Không tìm thấy lượt khám!' })

  const nextQueue = db.prepare(`
    SELECT COALESCE(MAX(queue_number), 0) + 1 AS next
    FROM visits WHERE visit_date = ?
  `).get(visit.visit_date).next

  db.prepare(`
    UPDATE visits SET doctor_id = ?, room = ?, queue_number = ?, status = 'waiting'
    WHERE id = ?
  `).run(req.user.id, req.body.room || 'Phòng khám Tim mạch 01', nextQueue, visit.id)

  addNotification(visit.patient_id, 'Đã tiếp nhận lượt khám', `Bạn đã được cấp số thứ tự ${nextQueue}. Vui lòng theo dõi hàng đợi.`, 'success')
  res.json({ visit: visitDetails(db.prepare('SELECT * FROM visits WHERE id = ?').get(visit.id)) })
})

app.post('/api/visits/:id/call', authenticateToken, allowRoles('doctor'), (req, res) => {
  const visit = db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id)
  if (!visit) return res.status(404).json({ message: 'Không tìm thấy lượt khám!' })
  db.prepare(`UPDATE visits SET status = 'called', called_at = CURRENT_TIMESTAMP WHERE id = ?`).run(visit.id)
  addNotification(visit.patient_id, 'Đến lượt khám', `Mời bệnh nhân đến ${visit.room || 'phòng khám'} để gặp bác sĩ.`, 'urgent')
  res.json({ visit: visitDetails(db.prepare('SELECT * FROM visits WHERE id = ?').get(visit.id)) })
})

app.post('/api/visits/:id/start', authenticateToken, allowRoles('doctor'), (req, res) => {
  const visit = db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id)
  if (!visit) return res.status(404).json({ message: 'Không tìm thấy lượt khám!' })
  db.prepare(`UPDATE visits SET status = 'in_progress', started_at = CURRENT_TIMESTAMP WHERE id = ?`).run(visit.id)
  res.json({ visit: visitDetails(db.prepare('SELECT * FROM visits WHERE id = ?').get(visit.id)) })
})

app.post('/api/visits/:id/absent', authenticateToken, allowRoles('doctor'), (req, res) => {
  const visit = db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id)
  if (!visit) return res.status(404).json({ message: 'Không tìm thấy lượt khám!' })
  db.prepare(`UPDATE visits SET status = 'absent' WHERE id = ?`).run(visit.id)
  addNotification(visit.patient_id, 'Lượt khám đã được cập nhật', 'Bạn chưa có mặt khi được gọi. Vui lòng liên hệ quầy tiếp nhận nếu cần khám lại.', 'warning')
  res.json({ visit: visitDetails(db.prepare('SELECT * FROM visits WHERE id = ?').get(visit.id)) })
})

app.put('/api/visits/:id/result', authenticateToken, allowRoles('doctor'), (req, res) => {
  const visit = db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id)
  if (!visit) return res.status(404).json({ message: 'Không tìm thấy lượt khám!' })

  const { examNotes, testInstruction, resultDueAt, resultMethod, resultText, prescription, followUpAt, status } = req.body
  const nextStatus = status === 'waiting_result' ? 'waiting_result' : 'completed'
  db.prepare(`
    UPDATE visits SET exam_notes = ?, test_instruction = ?, result_due_at = ?, result_method = ?,
      result_text = ?, prescription = ?, follow_up_at = ?, status = ?, completed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(examNotes || null, testInstruction || null, resultDueAt || null, resultMethod || null,
    resultText || null, prescription || null, followUpAt || null, nextStatus, visit.id)

  addNotification(
    visit.patient_id,
    nextStatus === 'waiting_result' ? 'Đã có lịch trả kết quả' : 'Kết quả khám đã sẵn sàng',
    nextStatus === 'waiting_result'
      ? `Vui lòng thực hiện theo hướng dẫn. Dự kiến trả kết quả: ${resultDueAt || 'sẽ cập nhật sau'}.`
      : 'Bạn có thể mở lượt khám để xem kết luận, đơn thuốc và hướng dẫn sau khám.',
    nextStatus === 'waiting_result' ? 'info' : 'success'
  )

  if (followUpAt) addNotification(visit.patient_id, 'Đã tạo lịch tái khám', `Lịch tái khám dự kiến vào ${followUpAt}.`, 'info')
  res.json({ visit: visitDetails(db.prepare('SELECT * FROM visits WHERE id = ?').get(visit.id)) })
})

app.get('/api/notifications', authenticateToken, (req, res) => {
  const notifications = db.prepare(`
    SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 30
  `).all(req.user.id)
  res.json({ notifications })
})

app.post('/api/notifications/:id/read', authenticateToken, (req, res) => {
  db.prepare(`UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`).run(req.params.id, req.user.id)
  res.json({ ok: true })
})
