import { ArrowLeftIcon } from '../components/Icons'

function DoctorAppointments({ onBack, onViewPatient }) {
  const appointments = [
    {
      id: 1,
      date: '30/09/2026',
      time: '08:00 - 08:30',
      patient: 'Trần Thị Lan',
      code: 'BN0002',
      type: 'Tái khám định kỳ sau đợt cấp',
      status: 'Đã hoàn thành',
      completed: true,
    },
    {
      id: 2,
      date: '15/10/2026',
      time: '08:30 - 09:00',
      patient: 'Nguyễn Văn An',
      code: 'BN0001',
      type: 'Khám Tim mạch định kỳ & Siêu âm tim EF',
      status: 'Sắp tới',
      completed: false,
    },
    {
      id: 3,
      date: '18/10/2026',
      time: '10:30 - 11:00',
      patient: 'Lê Văn Hùng',
      code: 'BN0003',
      type: 'Tái khám suy tim phân độ NYHA III',
      status: 'Sắp tới',
      completed: false,
    },
    {
      id: 4,
      date: '22/10/2026',
      time: '14:00 - 14:30',
      patient: 'Phạm Thị Mai',
      code: 'BN0004',
      type: 'Khám định kỳ & Điều chỉnh thuốc huyết áp',
      status: 'Sắp tới',
      completed: false,
    },
  ]

  return (
    <div className="feature-page">
      <div className="feature-container">
        <button className="back-button" onClick={onBack}>
          <ArrowLeftIcon size={16} />
          <span>Quay lại trang tổng quan</span>
        </button>

        <div className="feature-header">
          <div>
            <h1>Lịch khám & Tái khám bệnh nhân</h1>
            <p>Theo dõi danh sách các cuộc hẹn khám chuyên khoa tim mạch được xếp trước.</p>
          </div>

          <div className="doctor-avatar">
            BS
          </div>
        </div>

        <section className="feature-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: 'var(--slate-50)', borderBottom: '1.5px solid var(--slate-200)', color: 'var(--slate-500)', fontSize: '12px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '14px 20px' }}>Ngày & Giờ</th>
                  <th style={{ padding: '14px 20px' }}>Bệnh nhân & Mã</th>
                  <th style={{ padding: '14px 20px' }}>Nội dung khám</th>
                  <th style={{ padding: '14px 20px' }}>Trạng thái</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((item) => (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: '1px solid var(--slate-100)',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--slate-50)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '16px 20px' }}>
                      <strong style={{ display: 'block', color: 'var(--slate-900)' }}>{item.date}</strong>
                      <span style={{ fontSize: '12px', color: 'var(--slate-400)' }}>{item.time}</span>
                    </td>

                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="small-avatar" style={{ width: '36px', height: '36px', fontSize: '12px' }}>
                          {item.patient.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <strong style={{ display: 'block', color: 'var(--slate-900)' }}>{item.patient}</strong>
                          <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 'bold' }}>{item.code}</span>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '16px 20px', color: 'var(--slate-700)' }}>
                      {item.type}
                    </td>

                    <td style={{ padding: '16px 20px' }}>
                      <span className={item.completed ? 'normal-badge' : 'alert-badge'} style={{ background: item.completed ? 'var(--success-100)' : 'var(--primary-100)', color: item.completed ? 'var(--success-700)' : 'var(--primary-700)' }}>
                        ● {item.status}
                      </span>
                    </td>

                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <button
                        onClick={() => onViewPatient && onViewPatient({ fullName: item.patient, patientCode: item.code })}
                        style={{
                          padding: '6px 14px',
                          border: '1px solid var(--slate-200)',
                          borderRadius: 'var(--radius-md)',
                          background: 'white',
                          color: 'var(--primary)',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Hồ sơ →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

export default DoctorAppointments
