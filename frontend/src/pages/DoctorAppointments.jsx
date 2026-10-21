function DoctorAppointments({ onBack, onViewPatient }) {
    const appointments = [
    {
        date: '30/09/2026',
        time: '08:00',
        patient: 'Trần Thị Lan',
        code: 'BN002',
        type: 'Tái khám định kỳ',
        status: 'Đã hoàn thành',
        completed: true,
    },
    {
        date: '15/10/2026',
        time: '08:30',
        patient: 'Nguyễn Văn An',
        code: 'BN001',
        type: 'Khám Tim mạch định kỳ',
        status: 'Sắp tới',
        completed: false,
    },
    {
        date: '18/10/2026',
        time: '10:30',
        patient: 'Lê Văn Hùng',
        code: 'BN003',
        type: 'Tái khám suy tim',
        status: 'Sắp tới',
        completed: false,
    },
    {
        date: '22/10/2026',
        time: '14:00',
        patient: 'Phạm Thị Mai',
        code: 'BN004',
        type: 'Khám định kỳ',
        status: 'Sắp tới',
        completed: false,
    },
    ]

  return (
    <div className="doctor-appointments-page">
      <div className="doctor-appointments-container">

        <button className="back-button" onClick={onBack}>
          ← Quay lại tổng quan
        </button>

        <div className="doctor-appointments-header">
          <div>
            <h1>Lịch khám</h1>
            <p>Quản lý lịch khám và tái khám của bệnh nhân.</p>
          </div>

          <div className="doctor-small-profile">
            <div className="doctor-small-avatar">MT</div>

            <div>
              <strong>BS. Nguyễn Minh Tuấn</strong>
              <span>Bác sĩ Tim mạch</span>
            </div>
          </div>
        </div>

        <div className="doctor-appointment-summary">
        <div className="doctor-appointment-stat">
            <span>Tổng lịch khám</span>
            <strong>4</strong>
        </div>

        <div className="doctor-appointment-stat">
            <span>Đã hoàn thành</span>
            <strong>1</strong>
        </div>

        <div className="doctor-appointment-stat">
            <span>Sắp tới</span>
            <strong>3</strong>
        </div>
        </div>

        <section className="doctor-schedule-card">

          <div className="doctor-schedule-heading">
            <div>
              <h2>Lịch tái khám sắp tới</h2>
              <p>Các lịch khám và tái khám đã được lên lịch</p>
            </div>

            <span>4 lịch khám</span>
          </div>

          <div className="doctor-schedule-list">
            {appointments.map((appointment) => (
              <div
                className="doctor-schedule-item"
                key={`${appointment.code}-${appointment.time}`}
              >
                <div className="doctor-schedule-time">
                  <strong>{appointment.time}</strong>
                  <span>{appointment.date}</span>
                </div>

                <div className="doctor-schedule-line">
                  <div
                    className={
                      appointment.completed
                        ? 'schedule-dot completed-dot'
                        : 'schedule-dot'
                    }
                  ></div>
                </div>

                <div className="doctor-schedule-info">
                  <div className="doctor-schedule-top">
                    <div>
                      <h3>{appointment.patient}</h3>
                      <span>{appointment.code}</span>
                    </div>

                    <span
                      className={
                        appointment.completed
                          ? 'schedule-status completed-status'
                          : 'schedule-status upcoming-status'
                      }
                    >
                      ● {appointment.status}
                    </span>
                  </div>

                  <p>{appointment.type}</p>

                  {appointment.code === 'BN001' && (
                    <button
                      className="view-patient-button"
                      onClick={onViewPatient}
                    >
                      Xem bệnh nhân
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

        </section>

        <div className="doctor-schedule-note">
          <strong>Ghi chú</strong>
          <p>
            Lịch khám hiển thị theo ngày. Bác sĩ có thể xem hồ sơ bệnh
            nhân trước buổi khám để kiểm tra các chỉ số và cảnh báo gần đây.
          </p>
        </div>

      </div>
    </div>
  )
}

export default DoctorAppointments