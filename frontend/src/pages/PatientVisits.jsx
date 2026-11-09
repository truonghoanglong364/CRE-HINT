import { useEffect, useState } from 'react'

const statusLabels = { registered: 'Đã đăng ký', waiting: 'Chờ khám', called: 'Đã gọi lượt', in_progress: 'Đang khám', waiting_result: 'Chờ kết quả', completed: 'Đã hoàn thành', absent: 'Vắng mặt' }

function PatientVisits({ user, onBack, onBook }) {
  const [visits, setVisits] = useState([])
  const [notifications, setNotifications] = useState([])

  const load = async () => {
    const [visitResponse, notificationResponse] = await Promise.all([
      fetch('/api/visits/mine', { headers: { Authorization: `Bearer ${user.token}` } }),
      fetch('/api/notifications', { headers: { Authorization: `Bearer ${user.token}` } }),
    ])
    const visitData = await visitResponse.json()
    const notificationData = await notificationResponse.json()
    setVisits(visitData.visits || [])
    setNotifications(notificationData.notifications || [])
  }

  useEffect(() => { load().catch(console.error) }, [])

  return (
    <div className="feature-page">
      <div className="feature-container">
        <button className="back-button" onClick={onBack}>← Quay lại tổng quan</button>
        <div className="feature-header"><div><h1>Lượt khám & thông báo</h1><p>Theo dõi hàng đợi, kết quả và lịch tái khám của bạn.</p></div><button className="primary-action" onClick={onBook}>+ Đăng ký khám</button></div>
        <div className="feature-grid">
          <section className="feature-card"><h2>Lượt khám của tôi</h2>{visits.length === 0 && <p className="muted">Bạn chưa có lượt khám nào.</p>}{visits.map((visit) => <VisitCard key={visit.id} visit={visit} />)}</section>
          <section className="feature-card"><h2>Thông báo</h2>{notifications.length === 0 && <p className="muted">Chưa có thông báo.</p>}{notifications.map((item) => <div className={item.read_at ? 'notification-item' : 'notification-item unread'} key={item.id}><strong>{item.title}</strong><p>{item.message}</p><small>{new Date(item.created_at).toLocaleString('vi-VN')}</small></div>)}</section>
        </div>
      </div>
    </div>
  )
}

function VisitCard({ visit }) {
  return <article className="visit-card"><div className="visit-card-top"><div><strong>#{visit.queue_number || '—'} · {visit.specialty}</strong><p>{visit.visit_date} · {visit.room || 'Chưa phân phòng'}</p></div><span className={`visit-status status-${visit.status}`}>{statusLabels[visit.status]}</span></div><p className="visit-reason">Lý do: {visit.reason}</p>{visit.peopleAhead != null && ['waiting', 'called', 'in_progress'].includes(visit.status) && <div className="queue-info"><strong>Đang gọi đến số {Math.max(visit.queue_number - visit.peopleAhead, 0)}</strong><span>Còn {visit.peopleAhead} người phía trước</span></div>}{visit.result_text && <div className="result-box"><strong>Kết quả</strong><p>{visit.result_text}</p></div>}{visit.prescription && <div className="result-box"><strong>Đơn thuốc / hướng dẫn</strong><p>{visit.prescription}</p></div>}{visit.follow_up_at && <p className="follow-up">Tái khám dự kiến: {visit.follow_up_at}</p>}</article>
}

export default PatientVisits
