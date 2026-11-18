import { useEffect, useState } from 'react'
import {
  ArrowLeftIcon,
  ScaleIcon,
  BloodPressureIcon,
  PulseIcon,
  OxygenIcon,
  CalendarIcon
} from '../components/Icons'

function HealthHistory({ vitals, user, onBack }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  const latestVitals = records[0] || (vitals.weight != null ? vitals : null)
  const previousVitals = records[1]

  useEffect(() => {
    if (!user?.id) return

    const loadHistory = async () => {
      try {
        setLoading(true)
        const response = await fetch(
          `/api/vitals?userId=${user.id}`,
          { headers: { Authorization: `Bearer ${user.token}` } }
        )
        const data = await response.json()
        if (response.ok) setRecords(data.vitals || [])
      } catch (error) {
        console.error('Không thể tải lịch sử sức khỏe:', error)
      } finally {
        setLoading(false)
      }
    }

    loadHistory()
  }, [user?.id, user?.token])

  return (
    <div className="health-history-page">
      <div className="health-history-container">
        <button className="back-button" onClick={onBack}>
          <ArrowLeftIcon size={16} />
          <span>Quay lại trang tổng quan</span>
        </button>

        <div className="history-page-header">
          <div>
            <h1>Lịch sử diễn tiến sinh hiệu</h1>
            <p>Theo dõi sự thay đổi cân nặng, huyết áp, nhịp tim và triệu chứng theo thời gian.</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="small-avatar">
              {user?.fullName?.slice(0, 2).toUpperCase() || 'BN'}
            </div>
            <div>
              <strong style={{ display: 'block', color: 'var(--slate-900)' }}>{user?.fullName || 'Bệnh nhân'}</strong>
              <span style={{ fontSize: '12px', color: 'var(--slate-400)' }}>Hồ sơ cá nhân</span>
            </div>
          </div>
        </div>

        {/* Comparison Summary Cards */}
        <div className="vital-grid" style={{ marginBottom: '28px' }}>
          <div className="vital-card">
            <div className="vital-top">
              <span className="vital-icon"><ScaleIcon size={20} /></span>
              <span className="normal-badge">So với lần trước</span>
            </div>
            <p>Cân nặng hiện tại</p>
            <div className="vital-value-row">
              <strong>{latestVitals?.weight ?? '--'}</strong>
              <span className="unit">kg</span>
            </div>
            <small style={{ color: 'var(--slate-400)', marginTop: '8px', display: 'block' }}>
              Lần trước: {previousVitals ? `${previousVitals.weight} kg` : 'Chưa có'}
            </small>
          </div>

          <div className="vital-card">
            <div className="vital-top">
              <span className="vital-icon"><BloodPressureIcon size={20} /></span>
              <span className="normal-badge">Huyết áp đo</span>
            </div>
            <p>Huyết áp gần nhất</p>
            <div className="vital-value-row">
              <strong>{latestVitals?.systolic != null ? `${latestVitals.systolic}/${latestVitals.diastolic}` : '--'}</strong>
              <span className="unit">mmHg</span>
            </div>
            <small style={{ color: 'var(--slate-400)', marginTop: '8px', display: 'block' }}>
              Lần trước: {previousVitals ? `${previousVitals.systolic}/${previousVitals.diastolic} mmHg` : 'Chưa có'}
            </small>
          </div>

          <div className="vital-card">
            <div className="vital-top">
              <span className="vital-icon"><PulseIcon size={20} /></span>
              <span className="normal-badge">Nhịp tim</span>
            </div>
            <p>Nhịp tim khi nghỉ</p>
            <div className="vital-value-row">
              <strong>{latestVitals?.heartRate ?? '--'}</strong>
              <span className="unit">bpm</span>
            </div>
            <small style={{ color: 'var(--slate-400)', marginTop: '8px', display: 'block' }}>
              Lần trước: {previousVitals ? `${previousVitals.heartRate} bpm` : 'Chưa có'}
            </small>
          </div>

          <div className="vital-card">
            <div className="vital-top">
              <span className="vital-icon"><OxygenIcon size={20} /></span>
              <span className="normal-badge">SpO₂</span>
            </div>
            <p>Độ bão hòa oxy</p>
            <div className="vital-value-row">
              <strong>{latestVitals?.spo2 ?? '--'}</strong>
              <span className="unit">%</span>
            </div>
            <small style={{ color: 'var(--slate-400)', marginTop: '8px', display: 'block' }}>
              Lần trước: {previousVitals ? `${previousVitals.spo2}%` : 'Chưa có'}
            </small>
          </div>
        </div>

        {/* Detailed Records Table */}
        <section className="feature-card">
          <div className="section-title">
            <div>
              <h2>Toàn bộ các lần đo đã ghi nhận ({records.length})</h2>
              <p>Dữ liệu được lưu trữ tự động và bác sĩ chuyên khoa có thể theo dõi trực tiếp.</p>
            </div>
          </div>

          {loading && (
            <p style={{ color: 'var(--slate-500)', padding: '20px 0' }}>Đang nạp lịch sử đo...</p>
          )}

          {!loading && records.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--slate-400)' }}>
              <p>Chưa có dữ liệu đo nào được ghi nhận. Hãy gửi lần đo đầu tiên của bạn!</p>
            </div>
          )}

          {!loading && records.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: 'var(--slate-50)', borderBottom: '1.5px solid var(--slate-200)', color: 'var(--slate-500)', fontSize: '12px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 16px' }}>Thời gian</th>
                    <th style={{ padding: '12px 16px' }}>Cân nặng</th>
                    <th style={{ padding: '12px 16px' }}>Huyết áp</th>
                    <th style={{ padding: '12px 16px' }}>Nhịp tim</th>
                    <th style={{ padding: '12px 16px' }}>SpO₂</th>
                    <th style={{ padding: '12px 16px' }}>Triệu chứng kèm theo</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, idx) => {
                    const syms = []
                    if (r.dyspnea) syms.push('Khó thở')
                    if (r.edema) syms.push('Phù chi')
                    if (r.chestPain) syms.push('Đau ngực')

                    return (
                      <tr
                        key={r.id}
                        style={{
                          borderBottom: '1px solid var(--slate-100)',
                          background: idx === 0 ? 'var(--primary-50)' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '14px 16px', fontWeight: idx === 0 ? 'bold' : 'normal' }}>
                          {new Date(r.createdAt).toLocaleString('vi-VN')} {idx === 0 ? '(Mới nhất)' : ''}
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 'bold' }}>
                          {r.weight} kg
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {r.systolic}/{r.diastolic} mmHg
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {r.heartRate} bpm
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {r.spo2}%
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {syms.length > 0 ? (
                            <span style={{ color: 'var(--danger-700)', fontWeight: 'bold' }}>
                              ⚠ {syms.join(', ')}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--slate-400)' }}>Không có</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default HealthHistory
