function Medication({ onBack }) {
  const medications = [
    {
      name: 'Furosemide',
      dose: '40 mg',
      frequency: '1 lần/ngày',
      time: 'Buổi sáng',
      instruction: 'Uống sau ăn sáng',
    },
    {
      name: 'Bisoprolol',
      dose: '2.5 mg',
      frequency: '1 lần/ngày',
      time: 'Buổi sáng',
      instruction: 'Uống theo chỉ định của bác sĩ',
    },
  ]

  return (
    <div className="medication-page">
      <div className="medication-container">

        <button className="back-button" onClick={onBack}>
          ← Quay lại tổng quan
        </button>

        <div className="medication-header">
          <div>
            <h1>Đơn thuốc</h1>
            <p>
              Theo dõi các thuốc hiện đang được kê trong hệ thống.
            </p>
          </div>

          <div className="history-patient">
            <div className="small-avatar">NA</div>

            <div>
              <strong>Nguyễn Văn An</strong>
              <span>BN001</span>
            </div>
          </div>
        </div>

        <div className="medication-notice">
          <div className="medication-notice-icon">i</div>

          <div>
            <strong>Lưu ý khi sử dụng thuốc</strong>
            <p>
              Sử dụng thuốc theo đúng hướng dẫn của bác sĩ. Không tự ý
              thay đổi liều hoặc ngừng thuốc.
            </p>
          </div>
        </div>

        <section className="medication-page-card">
          <div className="medication-card-heading">
            <div>
              <h2>Thuốc đang sử dụng</h2>
              <p>Đơn thuốc hiện tại của bạn</p>
            </div>

            <span>2 loại thuốc</span>
          </div>

          <div className="medication-page-list">
            {medications.map((medicine) => (
              <div className="medication-page-item" key={medicine.name}>

                <div className="medication-big-icon">
                  Rx
                </div>

                <div className="medication-main-info">
                  <h3>{medicine.name}</h3>
                  <p>{medicine.dose}</p>
                </div>

                <div className="medication-detail">
                  <span>Tần suất</span>
                  <strong>{medicine.frequency}</strong>
                </div>

                <div className="medication-detail">
                  <span>Thời gian</span>
                  <strong>{medicine.time}</strong>
                </div>

                <div className="medication-detail medication-instruction">
                  <span>Hướng dẫn</span>
                  <strong>{medicine.instruction}</strong>
                </div>

                <span className="medication-active">
                  ● Đang sử dụng
                </span>

              </div>
            ))}
          </div>
        </section>

        <section className="medication-page-card">
          <h2>Lịch uống thuốc hôm nay</h2>

          <div className="medicine-schedule">

            <div className="medicine-schedule-item">
              <div className="schedule-time">
                <strong>08:00</strong>
                <span>Buổi sáng</span>
              </div>

              <div className="schedule-line"></div>

              <div>
                <strong>Furosemide 40 mg</strong>
                <p>1 viên · Sau ăn sáng</p>
              </div>
            </div>

            <div className="medicine-schedule-item">
              <div className="schedule-time">
                <strong>08:00</strong>
                <span>Buổi sáng</span>
              </div>

              <div className="schedule-line"></div>

              <div>
                <strong>Bisoprolol 2.5 mg</strong>
                <p>1 viên · Theo chỉ định</p>
              </div>
            </div>

          </div>
        </section>

      </div>
    </div>
  )
}

export default Medication