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

  return (
    <div className="dashboard-page">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span>♥</span>
          <h2>CRE-HINT</h2>
        </div>

        <nav>
          <button className="nav-item active">⌂ Tổng quan</button>
          <button className="nav-item" onClick={onAddVitals}>＋ Ghi nhận chỉ số</button>
          <button className="nav-item" onClick={onViewHistory}>▥ Lịch sử sức khỏe</button>
          <button className="nav-item" onClick={onViewMedication}>💊 Đơn thuốc</button>
          <button className="nav-item" onClick={onViewAppointments}>▣ Lịch tái khám</button>
          <button className="nav-item" onClick={onViewVisits}>⌛ Lượt khám & thông báo</button>
        </nav>

        <button className="logout-button" onClick={onLogout}>
          Đăng xuất
        </button>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="welcome">Xin chào,</p>
            <h1>{user?.fullName} 👋</h1>
            <p>Đây là tình trạng sức khỏe của bạn hôm nay.</p>
          </div>

          <div className="patient-avatar">NA</div>
        </header>

        <div className={hasAlert ? "status-banner alert-banner" : "status-banner"}>
        <div>
            <span className={hasAlert ? "status-icon alert-icon" : "status-icon"}>
            {hasAlert ? "!" : "✓"}
            </span>
        </div>

        <div>
            <strong>
            {hasAlert
                ? "Phát hiện chỉ số cần được theo dõi"
              : hasVitals ? "Tình trạng hiện tại ổn định" : "Bạn chưa ghi nhận chỉ số"}
            </strong>

            <p>
            {hasAlert
                ? "Một số chỉ số hoặc triệu chứng bạn vừa ghi nhận nằm ngoài ngưỡng theo dõi. Vui lòng làm theo hướng dẫn của cơ sở y tế và chờ nhân viên y tế đánh giá."
                : hasVitals
                  ? "Các chỉ số gần nhất của bạn đang trong giới hạn theo dõi."
                  : "Gửi lần đo đầu tiên để bác sĩ có thể theo dõi tình trạng của bạn."}
            </p>
        </div>
        </div>

        <section>
          <div className="section-title">
            <div>
              <h2>Chỉ số gần nhất</h2>
              <p>{vitals.createdAt ? `Gửi lúc ${new Date(vitals.createdAt).toLocaleString('vi-VN')}` : 'Chưa có lần gửi nào'}</p>
            </div>

            <button className="primary-action" onClick={onViewBookVisit}>
              + Đăng ký khám
            </button>
            <button className="primary-action" onClick={onAddVitals}>
              + Ghi nhận chỉ số
            </button>
          </div>

          <div className="vital-grid">
            <VitalCard
                icon="⚖"
                title="Cân nặng"
                value={vitals.weight ?? '--'}
                unit="kg"
                status={hasAlert ? "Cần chú ý" : hasVitals ? "Bình thường" : "Chưa ghi nhận"}
            />

            <VitalCard
                icon="♥"
                title="Huyết áp"
                value={`${vitals.systolic ?? '--'}/${vitals.diastolic ?? '--'}`}
                unit="mmHg"
                status={hasAlert ? "Cần chú ý" : hasVitals ? "Bình thường" : "Chưa ghi nhận"}
            />

            <VitalCard
                icon="⌁"
                title="Nhịp tim"
                value={vitals.heartRate ?? '--'}
                unit="bpm"
                status={hasAlert ? "Cần chú ý" : hasVitals ? "Bình thường" : "Chưa ghi nhận"}
            />

            <VitalCard
                icon="O₂"
                title="SpO₂"
                value={vitals.spo2 ?? '--'}
                unit="%"
                status={hasAlert ? "Cần chú ý" : hasVitals ? "Bình thường" : "Chưa ghi nhận"}
            />
          </div>
        </section>

        <div className="dashboard-columns">
          <section className="dashboard-box">
            <div className="box-heading">
              <h2>Xu hướng cân nặng</h2>
              <span>7 ngày gần nhất</span>
            </div>

            <div className="fake-chart">
              <div style={{ height: '42%' }}></div>
              <div style={{ height: '48%' }}></div>
              <div style={{ height: '45%' }}></div>
              <div style={{ height: '55%' }}></div>
              <div style={{ height: '52%' }}></div>
              <div style={{ height: '61%' }}></div>
              <div style={{ height: '58%' }}></div>
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
              <h2>Thuốc hôm nay</h2>
              <span>3 loại thuốc</span>
            </div>

            <Medication
              name="Bisoprolol 2.5 mg"
              time="08:00"
              done={true}
            />

            <Medication
              name="Furosemide 40 mg"
              time="08:00"
              done={true}
            />

            <Medication
              name="Enalapril 5 mg"
              time="20:00"
              done={false}
            />
          </section>
        </div>

        <section className="appointment-card">
          <div className="appointment-date">
            <strong>15</strong>
            <span>THÁNG 10</span>
          </div>

          <div>
            <p className="small-label">LỊCH TÁI KHÁM TIẾP THEO</p>
            <h3>Khám Tim mạch định kỳ</h3>
            <p>08:30 · Bệnh viện · BS. Nguyễn Minh Tuấn</p>
          </div>

          <button onClick={onViewAppointments}>Xem chi tiết</button>
        </section>
      </main>
    </div>
  )
}

function VitalCard({ icon, title, value, unit, status }) {
  return (
    <div className="vital-card">
      <div className="vital-top">
        <span className="vital-icon">{icon}</span>
        <span className="normal-badge">● {status}</span>
      </div>

      <p>{title}</p>

      <div>
        <strong>{value}</strong>
        <span className="unit">{unit}</span>
      </div>
    </div>
  )
}

function Medication({ name, time, done }) {
  return (
    <div className="medication">
      <div className={done ? 'medicine-check done' : 'medicine-check'}>
        {done ? '✓' : ''}
      </div>

      <div>
        <strong>{name}</strong>
        <p>{time}</p>
      </div>

      <span className={done ? 'taken' : 'pending'}>
        {done ? 'Đã uống' : 'Chưa uống'}
      </span>
    </div>
  )
}

export default PatientDashboard
