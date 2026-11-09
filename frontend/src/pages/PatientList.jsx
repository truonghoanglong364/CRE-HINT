import { useEffect, useState } from 'react'

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

        if (!response.ok) {
          throw new Error(data.message || 'Không thể tải bệnh nhân')
        }

        setPatients(data.patients)
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
          ← Quay lại tổng quan
        </button>

        <div className="patient-list-header">
          <div>
            <h1>Danh sách bệnh nhân</h1>
            <p>Quản lý và theo dõi bệnh nhân suy tim.</p>
          </div>

          <div className="doctor-small-profile">
            <div className="doctor-small-avatar">MT</div>

            <div>
              <strong>BS. Nguyễn Minh Tuấn</strong>
              <span>Bác sĩ Tim mạch</span>
            </div>
          </div>
        </div>

        {/* THỐNG KÊ */}
        <div className="patient-list-summary">

          <div className="patient-summary-box">
            <span>Tổng bệnh nhân</span>
            <strong>{patients.length}</strong>
          </div>

          <div className="patient-summary-box">
            <span>Đang ổn định</span>
            <strong>
              {patientsWithReadings.length - alertPatients.length}
            </strong>
          </div>

          <div className="patient-summary-box warning-summary">
            <span>Cần chú ý</span>
            <strong>{alertPatients.length}</strong>
          </div>

        </div>

        {/* FILTER */}
        <div className="patient-filter-bar">
          {[
            { key: 'all', label: `Tất cả (${patients.length})` },
            { key: 'alert', label: `Cần chú ý (${alertPatients.length})` },
            { key: 'stable', label: `Ổn định (${patientsWithReadings.length - alertPatients.length})` },
            { key: 'no-data', label: `Chưa gửi chỉ số (${patients.length - patientsWithReadings.length})` },
          ].map((f) => (
            <button
              key={f.key}
              className={statusFilter === f.key ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setStatusFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* SEARCH */}
        <div className="patient-search-box">
          <span>⌕</span>

          <input
            type="text"
            placeholder="Tìm kiếm theo tên, mã BN, SĐT hoặc email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* DANH SÁCH */}
        <div className="patient-list-card">

          <div className="patient-list-table-header">
            <span>BỆNH NHÂN</span>
            <span>THÔNG TIN</span>
            <span>LIÊN HỆ</span>
            <span>TRẠNG THÁI</span>
            <span></span>
          </div>

          {loading && (
            <p style={{ padding: '20px' }}>
              Đang tải danh sách bệnh nhân...
            </p>
          )}

          {!loading && filteredPatients.length === 0 && (
            <p style={{ padding: '20px' }}>
              Không tìm thấy bệnh nhân.
            </p>
          )}

          {!loading &&
            filteredPatients.map((patient) => {

              const isAlert = patient.weight != null && isAbnormalReading(patient)

              return (
                <div
                  className={
                    isAlert
                      ? 'patient-list-row patient-alert-row'
                      : 'patient-list-row'
                  }
                  key={patient.id}
                >

                  {/* TÊN + MÃ */}
                  <div className="patient-name-cell">

                    <div className="patient-list-avatar">
                      {patient.fullName
                        ?.split(' ')
                        .slice(-2)
                        .map((word) => word[0])
                        .join('')
                        .toUpperCase()}
                    </div>

                    <div>
                      <strong>{patient.fullName}</strong>
                      <span>{patient.patientCode}</span>
                    </div>

                  </div>

                  {/* THÔNG TIN */}
                  <div className="patient-info-cell">

                    <strong>
                      {patient.dateOfBirth || 'Chưa cập nhật'}
                    </strong>

                    <span>
                      {patient.gender || 'Chưa cập nhật'}
                    </span>

                  </div>

                  {/* LIÊN HỆ */}
                  <div className="patient-phone">
                    {patient.phone || patient.email}
                  </div>

                  {/* TRẠNG THÁI */}
                  <div>
                    <span
                      className={
                        isAlert
                          ? 'patient-status-badge patient-status-warning'
                          : 'patient-status-badge'
                      }
                    >
                      ● {patient.weight == null
                        ? 'Chưa gửi chỉ số'
                        : isAlert ? 'Cần chú ý' : 'Ổn định'}
                    </span>
                  </div>

                  {/* CHI TIẾT */}
                  <div>
                    <button
                      className="view-patient-button"
                      onClick={() => onViewPatient(patient)}
                    >
                      Xem chi tiết
                    </button>
                  </div>

                </div>
              )
            })}

        </div>

        {!loading && (
          <p className="patient-list-footer">
            Đang hiển thị {filteredPatients.length} trong tổng số{' '}
            {patients.length} bệnh nhân
          </p>
        )}

      </div>
    </div>
  )
}

export default PatientList

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