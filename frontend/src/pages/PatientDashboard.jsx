import { useState } from 'react'
import {
  HeartIcon,
  PlusIcon,
  FileTextIcon,
  PillIcon,
  CalendarIcon,
  ClockIcon,
  LogOutIcon,
  ScaleIcon,
  BloodPressureIcon,
  PulseIcon,
  OxygenIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ChevronRightIcon
} from '../components/Icons'

function PatientDashboard({
  user,
  onLogout,
  onAddVitals,
  onViewHistory,
  onViewMedication,
  onViewAppointments,
  onViewVisits,
  onViewBookVisit,
  vitals,
  hasAlert,
}) {
  const hasVitals = vitals.weight != null

  const getInitials = (name) => {
    if (!name) return 'BN'
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  // Symptoms tracking
  const activeSymptoms = []
  if (vitals.dyspnea) activeSymptoms.push('Khó thở khi gắng sức / nằm')
  if (vitals.edema) activeSymptoms.push('Phù 2 chi dưới')
  if (vitals.chestPain) activeSymptoms.push('Cảm giác đau tức ngực')

  return (
    <div className="dashboard-page">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span>
            <HeartIcon size={22} />
          </span>
          <div>
            <h2>CRE-HINT</h2>
          </div>
        </div>

        <nav>
          <button className="nav-item active">
            <HeartIcon size={18} />
            <span>Tổng quan sức khỏe</span>
          </button>
          <button className="nav-item" onClick={onAddVitals}>
            <PlusIcon size={18} />
            <span>Ghi nhận chỉ số</span>
          </button>
          <button className="nav-item" onClick={onViewHistory}>
            <FileTextIcon size={18} />
            <span>Lịch sử đo sinh hiệu</span>
          </button>
          <button className="nav-item" onClick={onViewMedication}>
            <PillIcon size={18} />
            <span>Đơn thuốc chỉ định</span>
          </button>
          <button className="nav-item" onClick={onViewAppointments}>
            <CalendarIcon size={18} />
            <span>Lịch hẹn tái khám</span>
          </button>
          <button className="nav-item" onClick={onViewVisits}>
            <ClockIcon size={18} />
            <span>Lượt khám & thông báo</span>
          </button>
        </nav>

        <button className="logout-button" onClick={onLogout}>
          <LogOutIcon size={16} />
          <span>Đăng xuất</span>
        </button>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="welcome">Cổng thông tin bệnh nhân</p>
            <h1>Xin chào, {user?.fullName || 'Bệnh nhân'} 👋</h1>
            <p>Hệ thống theo dõi diễn tiến lâm sàng và sinh hiệu tim mạch hàng ngày.</p>
          </div>

          <div className="patient-avatar">
            {getInitials(user?.fullName)}
          </div>
        </header>

        {/* Dynamic Status Alert Banner */}
        <div className={hasAlert ? "status-banner alert-banner" : "status-banner"}>
          <div className={hasAlert ? "status-icon alert-icon" : "status-icon"}>
            {hasAlert ? <AlertTriangleIcon size={22} /> : <CheckCircleIcon size={22} />}
          </div>

          <div style={{ flex: 1 }}>
            <strong>
              {hasAlert
                ? "Phát hiện chỉ số / triệu chứng cần theo dõi sát"
                : hasVitals
                  ? "Tình trạng lâm sàng hiện tại ổn định"
                  : "Chưa ghi nhận chỉ số sức khỏe hôm nay"}
            </strong>

            <p>
              {hasAlert
                ? "Một số chỉ số hoặc triệu chứng bạn vừa ghi nhận nằm ngoài ngưỡng an toàn cho bệnh nhân suy tim. Bác sĩ chuyên khoa đã được gửi cảnh báo và đang rà soát."
                : hasVitals
                  ? "Các chỉ số cân nặng, huyết áp, nhịp tim và SpO₂ gần nhất đều nằm trong ngưỡng an toàn cho phép."
                  : "Hãy dành 2 phút gửi chỉ số huyết áp, cân nặng và nhịp tim sáng nay để bác sĩ quản lý tốt nhất."}
            </p>

            {activeSymptoms.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                {activeSymptoms.map((symptom, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'var(--danger-700)',
                      background: 'var(--danger-100)',
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-pill)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    ⚠ Triệu chứng: {symptom}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Vitals Section */}
        <section>
          <div className="section-title">
            <div>
              <h2>Chỉ số đo gần nhất</h2>
              <p>
                {vitals.createdAt
                  ? `Dữ liệu đo gửi lúc ${new Date(vitals.createdAt).toLocaleString('vi-VN')}`
                  : 'Chưa có dữ liệu sinh hiệu'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="primary-action" onClick={onViewBookVisit} style={{ background: 'var(--slate-800)' }}>
                <CalendarIcon size={16} />
                <span>Đăng ký khám bệnh</span>
              </button>
              <button className="primary-action" onClick={onAddVitals}>
                <PlusIcon size={16} />
                <span>Ghi nhận chỉ số mới</span>
              </button>
            </div>
          </div>

          <div className="vital-grid">
            <VitalCard
              icon={<ScaleIcon size={22} />}
              title="Cân nặng theo dõi"
              value={vitals.weight != null ? vitals.weight : '--'}
              unit="kg"
              status={
                hasAlert && vitals.weight >= 68.8
                  ? "Tăng cân (Cảnh báo)"
                  : hasVitals
                    ? "Trong ngưỡng"
                    : "Chưa ghi nhận"
              }
              isAlert={hasAlert && vitals.weight >= 68.8}
            />

            <VitalCard
              icon={<BloodPressureIcon size={22} />}
              title="Huyết áp đo (HA)"
              value={vitals.systolic != null ? `${vitals.systolic}/${vitals.diastolic}` : '--'}
              unit="mmHg"
              status={
                hasAlert && (vitals.systolic >= 160 || vitals.diastolic >= 100)
                  ? "Tăng huyết áp"
                  : hasVitals
                    ? "Bình thường"
                    : "Chưa ghi nhận"
              }
              isAlert={hasAlert && (vitals.systolic >= 160 || vitals.diastolic >= 100)}
            />

            <VitalCard
              icon={<PulseIcon size={22} />}
              title="Nhịp tim khi nghỉ"
              value={vitals.heartRate != null ? vitals.heartRate : '--'}
              unit="bpm"
              status={
                hasAlert && vitals.heartRate >= 100
                  ? "Nhịp nhanh"
                  : hasVitals
                    ? "Ổn định"
                    : "Chưa ghi nhận"
              }
              isAlert={hasAlert && vitals.heartRate >= 100}
            />

            <VitalCard
              icon={<OxygenIcon size={22} />}
              title="Độ bão hòa oxy (SpO₂)"
              value={vitals.spo2 != null ? vitals.spo2 : '--'}
              unit="%"
              status={
                hasAlert && vitals.spo2 <= 93
                  ? "Giảm oxy máu"
                  : hasVitals
                    ? "Tốt (≥ 95%)"
                    : "Chưa ghi nhận"
              }
              isAlert={hasAlert && vitals.spo2 <= 93}
            />
          </div>
        </section>

        {/* Secondary Panels (Trend & Medication) */}
        <div className="dashboard-columns">
          <section className="dashboard-box">
            <div className="box-heading">
              <div>
                <h2>Diễn tiến cân nặng 7 ngày</h2>
                <span>Theo dõi tích dịch và đáp ứng thuốc lợi tiểu</span>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--primary)' }}>Mục tiêu: ≤ 68.5 kg</span>
            </div>

            <div className="fake-chart">
              <div style={{ height: '42%' }} title="Thứ 2: 67.2 kg"></div>
              <div style={{ height: '48%' }} title="Thứ 3: 67.5 kg"></div>
              <div style={{ height: '45%' }} title="Thứ 4: 67.3 kg"></div>
              <div style={{ height: '55%' }} title="Thứ 5: 67.8 kg"></div>
              <div style={{ height: '52%' }} title="Thứ 6: 67.6 kg"></div>
              <div style={{ height: '61%' }} title="Thứ 7: 68.2 kg"></div>
              <div style={{ height: '58%' }} title="Chủ nhật: 68.0 kg"></div>
            </div>

            <div className="chart-labels">
              <span>T2</span>
              <span>T3</span>
              <span>T4</span>
              <span>T5</span>
              <span>T6</span>
              <span>T7</span>
              <span>CN</span>
            </div>
          </section>

          <section className="dashboard-box">
            <div className="box-heading">
              <div>
                <h2>Lịch uống thuốc hôm nay</h2>
                <span>3 chỉ định điều trị suy tim</span>
              </div>
              <button
                onClick={onViewMedication}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
              >
                Chi tiết →
              </button>
            </div>

            <MedicationItem
              name="Bisoprolol 2.5 mg"
              instruction="Uống sau ăn sáng · 08:00"
              initialDone={true}
            />

            <MedicationItem
              name="Furosemide 40 mg"
              instruction="Thuốc lợi tiểu · 08:00"
              initialDone={true}
            />

            <MedicationItem
              name="Enalapril 5 mg"
              instruction="Uống buổi tối · 20:00"
              initialDone={false}
            />
          </section>
        </div>

        {/* Appointment Card */}
        <section className="appointment-card">
          <div className="appointment-date">
            <strong>15</strong>
            <span>THÁNG 10</span>
          </div>

          <div style={{ flex: 1 }}>
            <p className="small-label">Lịch tái khám tim mạch tiếp theo</p>
            <h3>Tái khám chuyên khoa & Đánh giá phân suất tống máu (EF)</h3>
            <p>08:30 · Phòng khám Tim mạch 01 · BS. Nguyễn Minh Tuấn</p>
          </div>

          <button onClick={onViewAppointments} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span>Xem chi tiết lịch khám</span>
            <ChevronRightIcon size={16} />
          </button>
        </section>
      </main>
    </div>
  )
}

function VitalCard({ icon, title, value, unit, status, isAlert }) {
  return (
    <div className={`vital-card ${isAlert ? 'vital-card-alert' : ''}`}>
      <div className="vital-top">
        <span className="vital-icon">{icon}</span>
        <span className={isAlert ? "alert-badge" : "normal-badge"}>
          ● {status}
        </span>
      </div>

      <p>{title}</p>

      <div className="vital-value-row">
        <strong>{value}</strong>
        <span className="unit">{unit}</span>
      </div>
    </div>
  )
}

function MedicationItem({ name, instruction, initialDone }) {
  const [done, setDone] = useState(initialDone)

  return (
    <div className="medication" onClick={() => setDone(!done)} style={{ cursor: 'pointer' }}>
      <div className={done ? 'medicine-check done' : 'medicine-check'}>
        {done ? '✓' : ''}
      </div>

      <div style={{ flex: 1 }}>
        <strong style={{ textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--slate-400)' : 'var(--slate-800)' }}>
          {name}
        </strong>
        <p>{instruction}</p>
      </div>

      <span className={done ? 'taken' : 'pending'}>
        {done ? 'Đã uống' : 'Chưa uống'}
      </span>
    </div>
  )
}

export default PatientDashboard
