import { useEffect, useState } from 'react'

function HealthHistory({ vitals, user, onBack }) {
  const [records, setRecords] = useState([])
  const latestVitals = records[0] || (vitals.weight != null ? vitals : null)
  const previousVitals = records[1]

  useEffect(() => {
    if (!user?.id) return

    const loadHistory = async () => {
      try {
        const response = await fetch(
          `/api/vitals?userId=${user.id}`,
          { headers: { Authorization: `Bearer ${user.token}` } }
        )
        const data = await response.json()
        if (response.ok) setRecords(data.vitals)
      } catch (error) {
        console.error('Không thể tải lịch sử sức khỏe:', error)
      }
    }

    loadHistory()
  }, [user?.id, user?.token])

  return (
    <div className="health-history-page">
      <div className="health-history-container">

        <button className="back-button" onClick={onBack}>
          ← Quay lại tổng quan
        </button>

        <div className="history-page-header">
          <div>
            <h1>Lịch sử sức khỏe</h1>
            <p>Theo dõi sự thay đổi các chỉ số sức khỏe theo thời gian.</p>
          </div>

          <div className="history-patient">
            <div className="small-avatar">NA</div>
            <div>
              <strong>{user?.fullName || 'Bệnh nhân'}</strong>
              <span>Lịch sử ghi nhận của bạn</span>
            </div>
          </div>
        </div>

        <section className="history-summary-grid">
          <SummaryCard
            title="Cân nặng hiện tại"
            value={`${latestVitals?.weight ?? '--'} kg`}
            previous={previousVitals ? `${previousVitals.weight} kg` : 'Chưa có'}
          />

          <SummaryCard
            title="Huyết áp gần nhất"
            value={`${latestVitals?.systolic ?? '--'}/${latestVitals?.diastolic ?? '--'}`}
            previous={previousVitals ? `${previousVitals.systolic}/${previousVitals.diastolic} mmHg` : 'Chưa có'}
          />

          <SummaryCard
            title="Nhịp tim"
            value={`${latestVitals?.heartRate ?? '--'} bpm`}
            previous={previousVitals ? `${previousVitals.heartRate} bpm` : 'Chưa có'}
          />

          <SummaryCard
            title="SpO₂"
            value={`${latestVitals?.spo2 ?? '--'}%`}
            previous={previousVitals ? `${previousVitals.spo2}%` : 'Chưa có'}
          />
        </section>

        <section className="health-history-card">
          <div className="history-card-heading">
            <div>
              <h2>Lịch sử ghi nhận</h2>
              <p>{records.length} lần ghi nhận</p>
            </div>

            <select>
              <option>7 ngày gần nhất</option>
              <option>30 ngày gần nhất</option>
            </select>
          </div>

          <div className="full-history-table">

            <div className="full-history-header">
              <span>Thời gian</span>
              <span>Cân nặng</span>
              <span>Huyết áp</span>
              <span>Nhịp tim</span>
              <span>SpO₂</span>
              <span>Trạng thái</span>
            </div>

            {records.map((record) => (
              <HistoryItem
                key={record.id}
                date={new Date(record.createdAt).toLocaleDateString('vi-VN')}
                time={new Date(record.createdAt).toLocaleTimeString('vi-VN')}
                weight={`${record.weight} kg`}
                bp={`${record.systolic}/${record.diastolic}`}
                heart={`${record.heartRate} bpm`}
                spo2={`${record.spo2}%`}
                warning={isAbnormalReading(record)}
              />
            ))}

            {records.length === 0 && (
              <p>{user ? 'Bạn chưa gửi chỉ số sức khỏe nào.' : 'Đang tải lịch sử...'}</p>
            )}

          </div>
        </section>

      </div>
    </div>
  )
}

function SummaryCard({ title, value, previous }) {
  return (
    <div className="history-summary-card">
      <p>{title}</p>
      <strong>{value}</strong>
      <span>Trước đó: {previous}</span>
    </div>
  )
}

function HistoryItem({
  date,
  time,
  weight,
  bp,
  heart,
  spo2,
  warning = false,
}) {
  return (
    <div className={warning ? 'full-history-row warning-row' : 'full-history-row'}>
      <div>
        <strong>{date}</strong>
        <small>{time}</small>
      </div>

      <span>{weight}</span>
      <span>{bp}</span>
      <span>{heart}</span>
      <span>{spo2}</span>

      <span className={warning ? 'history-warning' : 'history-normal'}>
        {warning ? '● Cần chú ý' : '● Bình thường'}
      </span>
    </div>
  )
}

export default HealthHistory

function isAbnormalReading(record) {
  return (
    record.weight >= 68.8 ||
    record.systolic >= 160 ||
    record.heartRate >= 100 ||
    record.spo2 <= 93 ||
    Boolean(record.dyspnea) ||
    Boolean(record.edema) ||
    Boolean(record.chestPain)
  )
}