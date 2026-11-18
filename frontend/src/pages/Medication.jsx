import { ArrowLeftIcon, PillIcon } from '../components/Icons'

function Medication({ onBack }) {
  const medications = [
    {
      id: 1,
      name: 'Furosemide',
      dose: '40 mg',
      group: 'Thuốc lợi tiểu quai',
      frequency: '1 lần / ngày',
      time: 'Buổi sáng (08:00)',
      instruction: 'Uống sau bữa ăn sáng. Giúp giảm tích tụ dịch, giảm phù chân và giảm gánh nặng cho tim.',
      caution: 'Theo dõi cân nặng hàng ngày và báo bác sĩ nếu sút cân quá nhanh hoặc tụt huyết áp.',
      color: 'var(--primary)'
    },
    {
      id: 2,
      name: 'Bisoprolol',
      dose: '2.5 mg',
      group: 'Chẹn thụ thể beta giao cảm',
      frequency: '1 lần / ngày',
      time: 'Buổi sáng (08:00)',
      instruction: 'Uống đều đặn mỗi sáng. Giúp kiểm soát nhịp tim, bảo vệ cơ tim và cải thiện phân suất tống máu lâu dài.',
      caution: 'Không tự ý dừng thuốc đột ngột. Kiểm tra mạch trước khi uống, báo bác sĩ nếu nhịp tim < 50 bpm.',
      color: '#7e22ce'
    },
    {
      id: 3,
      name: 'Enalapril',
      dose: '5 mg',
      group: 'Ức chế men chuyển (ACEI)',
      frequency: '1 lần / ngày',
      time: 'Buổi tối (20:00)',
      instruction: 'Giãn mạch, hạ huyết áp và làm chậm quá trình tái cấu trúc cơ tim do suy tim.',
      caution: 'Báo bác sĩ nếu xuất hiện ho khan kéo dài hoặc sưng môi, mắt, họng.',
      color: '#059669'
    }
  ]

  return (
    <div className="medication-page">
      <div className="medication-container">
        <button className="back-button" onClick={onBack}>
          <ArrowLeftIcon size={16} />
          <span>Quay lại trang tổng quan</span>
        </button>

        <div className="medication-header">
          <div>
            <h1>Đơn thuốc điều trị suy tim</h1>
            <p>Danh mục thuốc đang được chỉ định bởi bác sĩ chuyên khoa và hướng dẫn tuân thủ.</p>
          </div>

          <div style={{ background: 'var(--primary-50)', color: 'var(--primary)', padding: '6px 14px', borderRadius: 'var(--radius-pill)', fontWeight: 'bold', fontSize: '13px' }}>
            3 loại thuốc đang điều trị
          </div>
        </div>

        {/* Clinical Safety Notice */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px',
            padding: '18px 22px',
            background: 'var(--primary-50)',
            border: '1.5px solid var(--primary-200)',
            borderRadius: 'var(--radius-xl)',
            marginBottom: '28px'
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--primary)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              flexShrink: 0
            }}
          >
            <PillIcon size={20} />
          </div>

          <div>
            <strong style={{ fontSize: '15px', color: 'var(--slate-900)', display: 'block', marginBottom: '4px' }}>
              Nguyên tắc vàng khi dùng thuốc điều trị suy tim
            </strong>
            <p style={{ fontSize: '13.5px', color: 'var(--slate-600)', margin: 0, lineHeight: 1.5 }}>
              Uống thuốc đúng giờ, đúng liều lượng mỗi ngày. <strong>Tuyệt đối không tự ý ngừng thuốc hoặc đổi liều</strong> ngay cả khi cảm thấy sức khỏe đã cải thiện. Luôn tham vấn bác sĩ điều trị khi có thắc mắc hoặc tác dụng phụ.
            </p>
          </div>
        </div>

        {/* Medication Cards */}
        <section className="feature-card">
          <div className="section-title">
            <div>
              <h2>Danh mục thuốc đang sử dụng</h2>
              <p>Chi tiết liều lượng và thời điểm uống trong ngày</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {medications.map((med) => (
              <div
                key={med.id}
                style={{
                  border: '1.5px solid var(--slate-200)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '20px',
                  background: 'var(--bg-surface)',
                  display: 'flex',
                  gap: '20px',
                  alignItems: 'flex-start',
                  boxShadow: 'var(--shadow-xs)'
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--slate-100)',
                    color: med.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    flexShrink: 0
                  }}
                >
                  Rx
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <h3 style={{ fontSize: '18px', color: 'var(--slate-900)', margin: 0 }}>
                      {med.name} {med.dose}
                    </h3>
                    <span style={{ fontSize: '12px', background: 'var(--slate-100)', color: 'var(--slate-700)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', fontWeight: '600' }}>
                      {med.group}
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: '13px', fontWeight: 'bold', color: 'var(--primary)' }}>
                      ⏰ {med.time}
                    </span>
                  </div>

                  <p style={{ fontSize: '14px', color: 'var(--slate-700)', marginBottom: '8px' }}>
                    {med.instruction}
                  </p>

                  <div style={{ fontSize: '12.5px', color: 'var(--warning-800)', background: 'var(--warning-50)', padding: '6px 12px', borderRadius: 'var(--radius-md)' }}>
                    <strong>Lưu ý: </strong> {med.caution}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export default Medication
