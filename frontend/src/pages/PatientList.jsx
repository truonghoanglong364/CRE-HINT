import { useEffect, useState } from 'react'
import {
  ArrowLeftIcon,
  SearchIcon,
  UsersIcon
} from '../components/Icons'

function PatientList({ user, onBack, onViewPatient }) {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await fetch('/api/patients', {
          headers: { Authorization: `Bearer ${user.token}` },
        })
        const data = await response.json()
        if (response.ok) {
          setPatients(data.patients || [])
        }
      } catch (error) {
        console.error('Lỗi lấy danh sách bệnh nhân:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPatients()
  }, [user.token])

  const filteredPatients = patients.filter((patient) => {
    const keyword = search.toLowerCase()
    const matchesSearch =
      patient.fullName?.toLowerCase().includes(keyword) ||
      patient.patientCode?.toLowerCase().includes(keyword) ||
      patient.phone?.toLowerCase().includes(keyword) ||
      patient.email?.toLowerCase().includes(keyword)

    if (!matchesSearch) return false

    if (statusFilter === 'alert') return patient.weight != null && isAbnormalReading(patient)
    if (statusFilter === 'stable') return patient.weight != null && !isAbnormalReading(patient)
    if (statusFilter === 'no-data') return patient.weight == null
    return true
  })

  const patientsWithReadings = patients.filter((patient) => patient.weight != null)
  const alertPatients = patientsWithReadings.filter(isAbnormalReading)

  return (
    <div className="patient-list-page">
      <div className="patient-list-container">
        <button className="back-button" onClick={onBack}>
          <ArrowLeftIcon size={16} />
          <span>Quay lại trang tổng quan</span>
        </button>

        <div className="patient-list-header">
          <div>
            <h1>Danh sách bệnh nhân suy tim</h1>
            <p>Quản lý toàn bộ hồ sơ bệnh nhân, tiền sử bệnh và dữ liệu đo từ xa.</p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ background: 'var(--primary-50)', color: 'var(--primary)', padding: '6px 14px', borderRadius: 'var(--radius-pill)', fontWeight: 'bold', fontSize: '13px' }}>
              Tổng: {patients.length} bệnh nhân
            </span>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xl)',
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            flexWrap: 'wrap',
            boxShadow: 'var(--shadow-card)'
          }}
        >
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <SearchIcon
              size={18}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }}
            />
            <input
              type="text"
              placeholder="Tìm theo tên, mã bệnh nhân (BN0001), điện thoại..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 38px',
                border: '1.5px solid var(--slate-200)',
                borderRadius: 'var(--radius-md)',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setStatusFilter('all')}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--slate-200)',
                background: statusFilter === 'all' ? 'var(--primary)' : 'white',
                color: statusFilter === 'all' ? 'white' : 'var(--slate-700)',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Tất cả ({patients.length})
            </button>
            <button
              onClick={() => setStatusFilter('alert')}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--slate-200)',
                background: statusFilter === 'alert' ? 'var(--danger)' : 'white',
                color: statusFilter === 'alert' ? 'white' : 'var(--slate-700)',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Cần chú ý ({alertPatients.length})
            </button>
            <button
              onClick={() => setStatusFilter('stable')}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--slate-200)',
                background: statusFilter === 'stable' ? 'var(--success)' : 'white',
                color: statusFilter === 'stable' ? 'white' : 'var(--slate-700)',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Ổn định ({patientsWithReadings.length - alertPatients.length})
            </button>
            <button
              onClick={() => setStatusFilter('no-data')}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--slate-200)',
                background: statusFilter === 'no-data' ? 'var(--slate-700)' : 'white',
                color: statusFilter === 'no-data' ? 'white' : 'var(--slate-700)',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Chưa gửi đo ({patients.length - patientsWithReadings.length})
            </button>
          </div>
        </div>

        {/* Patient Table */}
        <section className="feature-card" style={{ padding: '0', overflow: 'hidden' }}>
          {loading && (
            <p style={{ color: 'var(--slate-500)', padding: '24px' }}>Đang nạp dữ liệu bệnh nhân...</p>
          )}

          {!loading && filteredPatients.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--slate-400)' }}>
              <UsersIcon size={40} style={{ margin: '0 auto 12px', display: 'block' }} />
              <h3>Không tìm thấy bệnh nhân phù hợp</h3>
              <p>Hãy thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.</p>
            </div>
          )}

          {!loading && filteredPatients.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: 'var(--slate-50)', borderBottom: '1.5px solid var(--slate-200)', color: 'var(--slate-500)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '14px 20px' }}>Hồ sơ & Mã BN</th>
                    <th style={{ padding: '14px 20px' }}>Liên hệ</th>
                    <th style={{ padding: '14px 20px' }}>Chỉ số đo gần nhất</th>
                    <th style={{ padding: '14px 20px' }}>Đánh giá an toàn</th>
                    <th style={{ padding: '14px 20px', textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((patient) => {
                    const hasVitals = patient.weight != null
                    const isAlert = hasVitals && isAbnormalReading(patient)

                    return (
                      <tr
                        key={patient.userId}
                        onClick={() => onViewPatient(patient)}
                        style={{
                          borderBottom: '1px solid var(--slate-100)',
                          cursor: 'pointer',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--slate-50)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div className="small-avatar" style={{ width: '40px', height: '40px', fontSize: '13px' }}>
                              {patient.fullName?.slice(0, 2).toUpperCase() || 'BN'}
                            </div>
                            <div>
                              <strong style={{ display: 'block', color: 'var(--slate-900)' }}>{patient.fullName}</strong>
                              <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 'bold' }}>
                                {patient.patientCode || 'Chưa cấp'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '16px 20px', color: 'var(--slate-600)' }}>
                          <div style={{ fontSize: '13px' }}>{patient.phone || 'Chưa cập nhật SĐT'}</div>
                          <div style={{ fontSize: '12px', color: 'var(--slate-400)' }}>{patient.email || '—'}</div>
                        </td>

                        <td style={{ padding: '16px 20px' }}>
                          {hasVitals ? (
                            <div style={{ display: 'flex', gap: '8px', fontSize: '13px' }}>
                              <span style={{ background: 'var(--slate-100)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontWeight: '600' }}>
                                {patient.weight} kg
                              </span>
                              <span style={{ background: 'var(--slate-100)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontWeight: '600' }}>
                                {patient.systolic}/{patient.diastolic} mmHg
                              </span>
                              <span style={{ background: 'var(--slate-100)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontWeight: '600' }}>
                                {patient.heartRate} bpm
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--slate-400)', fontStyle: 'italic' }}>
                              Chưa gửi dữ liệu đo
                            </span>
                          )}
                        </td>

                        <td style={{ padding: '16px 20px' }}>
                          {hasVitals ? (
                            <span className={isAlert ? 'alert-badge' : 'normal-badge'}>
                              ● {isAlert ? 'Cần chú ý' : 'Ổn định'}
                            </span>
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--slate-400)' }}>
                              ● Chưa có dữ liệu
                            </span>
                          )}
                        </td>

                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); onViewPatient(patient) }}
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
                            Xem bệnh án →
                          </button>
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

function isAbnormalReading(patient) {
  return (
    patient.weight >= 68.8 ||
    patient.systolic >= 160 ||
    patient.heartRate >= 100 ||
    patient.spo2 <= 93 ||
    Boolean(patient.dyspnea) ||
    Boolean(patient.edema) ||
    Boolean(patient.chestPain)
  )
}

export default PatientList
