import { ArrowLeftIcon } from '../components/Icons'

function Appointments({ onBack }) {
  return (
    <div className="appointments-page">
      <div className="appointments-container">
        <button className="back-button" onClick={onBack}>
          <ArrowLeftIcon size={16} />
          <span>Quay lại trang tổng quan</span>
        </button>

        <div className="appointments-header">
          <div>
            <h1>Lịch tái khám chuyên khoa</h1>
            <p>Theo dõi lịch khám định kỳ, hướng dẫn chuẩn bị và thông tin bác sĩ phụ trách.</p>
          </div>

          <div style={{ background: 'var(--success-50)', color: 'var(--success-700)', padding: '6px 14px', borderRadius: 'var(--radius-pill)', fontWeight: 'bold', fontSize: '13px' }}>
            ● Lịch khám đã xác nhận
          </div>
        </div>

        {/* Next Appointment Card */}
        <section
          style={{
            background: 'var(--bg-surface)',
            border: '1.5px solid var(--primary-border)',
            borderRadius: 'var(--radius-2xl)',
            padding: '28px',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            gap: '24px',
            alignItems: 'center',
            marginBottom: '28px',
            flexWrap: 'wrap'
          }}
        >
          <div className="appointment-date" style={{ width: '84px', height: '84px' }}>
            <strong>15</strong>
            <span>THÁNG 10</span>
            <small style={{ fontSize: '10px', opacity: 0.85 }}>2026</small>
          </div>

          <div style={{ flex: 1, minWidth: '260px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em' }}>
              Lịch tái khám sắp tới
            </span>
            <h2 style={{ fontSize: '22px', color: 'var(--slate-900)', margin: '4px 0 8px' }}>
              Khám chuyên khoa Tim mạch & Đánh giá EF
            </h2>
            <div style={{ display: 'flex', gap: '16px', color: 'var(--slate-600)', fontSize: '14px', flexWrap: 'wrap' }}>
              <span>⏰ 08:30 - 09:30</span>
              <span>📍 Phòng khám Tim mạch 01 (Tầng 2)</span>
              <span>👨‍⚕️ Bác sĩ: <strong>BS. Nguyễn Minh Tuấn</strong></span>
            </div>
          </div>

          <span className="normal-badge" style={{ fontSize: '13px', padding: '6px 14px' }}>
            ● Đã xếp lịch khám
          </span>
        </section>

        {/* Preparation Guidelines */}
        <section className="feature-card">
          <div className="section-title">
            <div>
              <h2>Hướng dẫn chuẩn bị trước khi đến khám</h2>
              <p>Các điều cần lưu ý để buổi khám đạt kết quả tốt nhất.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div style={{ padding: '16px', background: 'var(--slate-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--slate-200)' }}>
              <strong style={{ display: 'block', fontSize: '14px', color: 'var(--slate-900)', marginBottom: '4px' }}>
                1. Mang theo thuốc đang dùng
              </strong>
              <p style={{ fontSize: '13px', color: 'var(--slate-600)', margin: 0 }}>
                Mang toàn bộ vỏ hộp hoặc đơn thuốc hiện tại để bác sĩ đối chiếu và đánh giá tương tác thuốc.
              </p>
            </div>

            <div style={{ padding: '16px', background: 'var(--slate-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--slate-200)' }}>
              <strong style={{ display: 'block', fontSize: '14px', color: 'var(--slate-900)', marginBottom: '4px' }}>
                2. Nhịn ăn sáng nếu có xét nghiệm máu
              </strong>
              <p style={{ fontSize: '13px', color: 'var(--slate-600)', margin: 0 }}>
                Nếu có chỉ định xét nghiệm sinh hóa, điện giải hoặc BNP, vui lòng nhịn ăn sáng (được uống nước lọc).
              </p>
            </div>

            <div style={{ padding: '16px', background: 'var(--slate-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--slate-200)' }}>
              <strong style={{ display: 'block', fontSize: '14px', color: 'var(--slate-900)', marginBottom: '4px' }}>
                3. Ghi lại các triệu chứng bất thường
              </strong>
              <p style={{ fontSize: '13px', color: 'var(--slate-600)', margin: 0 }}>
                Ghi nhận lại các đợt mệt, khó thở hoặc số lần tăng cân đột ngột trong tuần qua để báo bác sĩ.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Appointments
