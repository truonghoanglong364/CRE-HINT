function Appointments({ onBack }) {
  return (
    <div className="appointments-page">
      <div className="appointments-container">

        <button className="back-button" onClick={onBack}>
          ← Quay lại tổng quan
        </button>

        {/* HEADER */}
        <div className="appointments-header">
          <div>
            <h1>Lịch tái khám</h1>
            <p>Theo dõi lịch khám và tái khám của bạn.</p>
          </div>

          <div className="history-patient">
            <div className="small-avatar">NA</div>

            <div>
              <strong>Nguyễn Văn An</strong>
              <span>BN001</span>
            </div>
          </div>
        </div>

        {/* NEXT APPOINTMENT */}
        <section className="next-appointment-card">

          <div className="appointment-date-box">
            <span>THÁNG 10</span>
            <strong>15</strong>
            <small>2026</small>
          </div>

          <div className="appointment-main-info">
            <span className="appointment-label">
              Lịch tái khám sắp tới
            </span>

            <h2>Khám chuyên khoa Tim mạch</h2>

            <div className="appointment-meta">
              <span>🕘 08:30 - 09:00</span>
              <span>📍 Phòng khám Tim mạch</span>
            </div>

            <p>
              Bác sĩ phụ trách: <strong>BS. Nguyễn Minh Tuấn</strong>
            </p>
          </div>

          <span className="appointment-status">
            ● Đã xác nhận
          </span>

        </section>

        {/* NOTE */}
        <div className="appointment-notice">
          <div className="appointment-notice-icon">i</div>

          <div>
            <strong>Lưu ý trước khi tái khám</strong>
            <p>
              Mang theo đơn thuốc hiện tại và các kết quả xét nghiệm gần
              nhất. Tiếp tục ghi nhận chỉ số sức khỏe hằng ngày trước
              buổi khám.
            </p>
          </div>
        </div>

        {/* APPOINTMENT HISTORY */}
        <section className="appointments-card">

          <div className="appointments-card-header">
            <div>
              <h2>Lịch sử khám</h2>
              <p>Các buổi khám và tái khám gần đây</p>
            </div>
          </div>

          <div className="appointment-history-list">

            <AppointmentHistory
              date="05/09/2026"
              title="Tái khám suy tim"
              doctor="BS. Nguyễn Minh Tuấn"
              note="Tình trạng ổn định, tiếp tục theo dõi tại nhà."
            />

            <AppointmentHistory
              date="05/08/2026"
              title="Khám chuyên khoa Tim mạch"
              doctor="BS. Nguyễn Minh Tuấn"
              note="Điều chỉnh đơn thuốc và hướng dẫn theo dõi cân nặng."
            />

            <AppointmentHistory
              date="03/07/2026"
              title="Tái khám định kỳ"
              doctor="BS. Nguyễn Minh Tuấn"
              note="Theo dõi huyết áp, nhịp tim và triệu chứng khó thở."
            />

          </div>
        </section>

      </div>
    </div>
  )
}


function AppointmentHistory({ date, title, doctor, note }) {
  return (
    <div className="appointment-history-item">

      <div className="appointment-history-icon">
        ✓
      </div>

      <div className="appointment-history-content">
        <div className="appointment-history-top">
          <div>
            <h3>{title}</h3>
            <span>{date}</span>
          </div>

          <span className="completed-appointment">
            ● Đã hoàn thành
          </span>
        </div>

        <p className="appointment-doctor">
          {doctor}
        </p>

        <div className="appointment-result">
          <span>Kết luận</span>
          <p>{note}</p>
        </div>
      </div>

    </div>
  )
}


export default Appointments