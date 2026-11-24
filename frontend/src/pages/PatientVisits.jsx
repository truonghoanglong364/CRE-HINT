import { useEffect, useState } from 'react'
import {
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  BellIcon,
  PlusIcon
} from '../components/Icons'

const statusLabels = {
  registered: 'Đã gửi đăng ký',
  waiting: 'Đang xếp hàng chờ gọi',
  called: 'Mời vào phòng khám',
  in_progress: 'Bác sĩ đang khám',
  waiting_result: 'Chờ kết quả xét nghiệm',
  completed: 'Khám hoàn thành',
  absent: 'Vắng mặt'
}

function PatientVisits({ user, onBack, onBook }) {
  const [visits, setVisits] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      setLoading(true)
      const [visitResponse, notificationResponse] = await Promise.all([
        fetch('/api/visits/mine', { headers: { Authorization: `Bearer ${user.token}` } }),
        fetch('/api/notifications', { headers: { Authorization: `Bearer ${user.token}` } }),
      ])
      const visitData = await visitResponse.json()
      const notificationData = await notificationResponse.json()
      setVisits(visitData.visits || [])
      setNotifications(notificationData.notifications || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="feature-page">
      <div className="feature-container">
        <button className="back-button" onClick={onBack}>
          <ArrowLeftIcon size={16} />
          <span>Quay lại trang tổng quan</span>
        </button>

        <div className="feature-header">
          <div>
            <h1>Lượt khám & Thông báo của bạn</h1>
            <p>Theo dõi trực tiếp số thứ tự hàng đợi, kết quả khám và đơn thuốc từ bác sĩ.</p>
          </div>

          <button className="primary-action" onClick={onBook}>
            <PlusIcon size={16} />
            <span>Đăng ký lượt khám mới</span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
          {/* Column 1: Visits list */}
          <section className="feature-card">
            <div className="section-title">
              <div>
                <h2>Lịch sử các lượt khám ({visits.length})</h2>
                <p>Tiến trình khám và kết luận bác sĩ chuyên khoa</p>
              </div>
            </div>

            {loading && <p style={{ color: 'var(--slate-500)' }}>Đang nạp dữ liệu lượt khám...</p>}

            {!loading && visits.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--slate-400)' }}>
                <ClockIcon size={40} style={{ margin: '0 auto 12px', display: 'block' }} />
                <h3>Bạn chưa có lượt khám nào</h3>
                <p>Nhấn vào "Đăng ký lượt khám mới" để đặt lịch khám tim mạch.</p>
              </div>
            )}

            {!loading && visits.map((visit) => (
              <VisitCard key={visit.id} visit={visit} />
            ))}
          </section>

          {/* Column 2: Notifications */}
          <section className="feature-card">
            <div className="section-title">
              <div>
                <h2>Thông báo từ hệ thống</h2>
                <p>Tin nhắn cập nhật lượt khám và kết quả</p>
              </div>
              <BellIcon size={18} style={{ color: 'var(--primary)' }} />
            </div>

            {loading && <p style={{ color: 'var(--slate-500)' }}>Đang nạp thông báo...</p>}

            {!loading && notifications.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--slate-400)' }}>
                <p>Chưa có thông báo nào.</p>
              </div>
            )}

            {!loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-lg)',
                      background: item.read_at ? 'var(--slate-50)' : 'var(--primary-50)',
                      border: `1px solid ${item.read_at ? 'var(--slate-200)' : 'var(--primary-200)'}`,
                      transition: 'all 0.15s'
                    }}
                  >
                    <strong style={{ display: 'block', fontSize: '14px', color: 'var(--slate-900)', marginBottom: '3px' }}>
                      {item.title}
                    </strong>
                    <p style={{ fontSize: '13px', color: 'var(--slate-600)', margin: '0 0 6px' }}>
                      {item.message}
                    </p>
                    <small style={{ fontSize: '11px', color: 'var(--slate-400)' }}>
                      {new Date(item.created_at).toLocaleString('vi-VN')}
                    </small>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function VisitCard({ visit }) {
  const isWaiting = ['waiting', 'called', 'in_progress'].includes(visit.status)

  return (
    <article
      style={{
        border: '1.5px solid var(--slate-200)',
        borderRadius: 'var(--radius-xl)',
        padding: '20px',
        background: 'var(--bg-surface)',
        marginBottom: '16px',
        boxShadow: 'var(--shadow-xs)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div>
          <strong style={{ fontSize: '17px', color: 'var(--slate-900)' }}>
            {visit.queue_number ? `Số thứ tự: #${visit.queue_number}` : 'Lượt đăng ký mới'} · {visit.specialty}
          </strong>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--slate-500)' }}>
            Ngày khám: <strong>{visit.visitDate || visit.visit_date}</strong> · {visit.room || 'Đang chờ phân phòng'}
          </p>
        </div>

        <span className={`visit-status status-${visit.status}`}>
          ● {statusLabels[visit.status] || visit.status}
        </span>
      </div>

      <p style={{ fontSize: '13.5px', color: 'var(--slate-700)', margin: '0 0 12px' }}>
        <strong>Lý do khám: </strong> {visit.reason}
      </p>

      {/* Queue progress indicator */}
      {visit.peopleAhead != null && isWaiting && (
        <div
          style={{
            background: 'var(--primary-50)',
            border: '1px solid var(--primary-200)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            margin: '12px 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <strong style={{ color: 'var(--primary-800)', fontSize: '14px', display: 'block' }}>
              Phòng khám đang gọi số: #{Math.max(visit.queue_number - visit.peopleAhead, 0)}
            </strong>
            <span style={{ fontSize: '12.5px', color: 'var(--slate-600)' }}>
              Còn {visit.peopleAhead} bệnh nhân phía trước bạn
            </span>
          </div>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--primary)' }}>
            Đang hoạt động
          </span>
        </div>
      )}

      {visit.result_text && (
        <div
          style={{
            background: 'var(--slate-50)',
            border: '1px solid var(--slate-200)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            margin: '10px 0'
          }}
        >
          <strong style={{ fontSize: '13px', color: 'var(--slate-900)', display: 'block', marginBottom: '4px' }}>
            Kết luận của Bác sĩ:
          </strong>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--slate-700)' }}>{visit.result_text}</p>
        </div>
      )}

      {visit.prescription && (
        <div
          style={{
            background: 'var(--success-50)',
            border: '1px solid var(--success-200)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            margin: '10px 0'
          }}
        >
          <strong style={{ fontSize: '13px', color: 'var(--success-800)', display: 'block', marginBottom: '4px' }}>
            Đơn thuốc & Hướng dẫn:
          </strong>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--slate-700)', whiteSpace: 'pre-line' }}>{visit.prescription}</p>
        </div>
      )}

      {visit.follow_up_at && (
        <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--primary-700)', fontWeight: 'bold' }}>
          ⏰ Lịch hẹn tái khám dự kiến: {visit.follow_up_at}
        </p>
      )}
    </article>
  )
}

export default PatientVisits
