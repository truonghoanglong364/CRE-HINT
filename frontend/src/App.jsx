import { useState } from 'react'
import PatientDashboard from './pages/PatientDashboard'
import AddVitals from './pages/AddVitals'
import DoctorDashboard from './pages/DoctorDashboard'
import PatientDetail from './pages/PatientDetail'
import HealthHistory from './pages/HealthHistory'
import Medication from './pages/Medication'
import Appointments from './pages/Appointments'
import PatientList from './pages/PatientList'
import Alerts from './pages/Alerts'
import DoctorAppointments from './pages/DoctorAppointments'
import Register from './pages/Register'
import Profile from './pages/Profile'
import VisitBooking from './pages/VisitBooking'
import PatientVisits from './pages/PatientVisits'
import DoctorQueue from './pages/DoctorQueue'
import ReceptionDashboard from './pages/ReceptionDashboard'
import ClinicalSupport from './pages/ClinicalSupport'
import './App.css'

const EMPTY_VITALS = {
  weight: null,
  systolic: null,
  diastolic: null,
  heartRate: null,
  spo2: null,
  dyspnea: false,
  edema: false,
  chestPain: false,
}

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [authPage, setAuthPage] = useState('login')
  const [loggedInUser, setLoggedInUser] = useState(null)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [selectedVisit, setSelectedVisit] = useState(null)

  const [vitals, setVitals] = useState(EMPTY_VITALS)

  const [hasAlert, setHasAlert] = useState(false)

const handleLogin = async (e) => {
  e.preventDefault()

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifier: email,
        password,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      alert(data.message || 'Đăng nhập thất bại!')
      return
    }

    const authenticatedUser = { ...data.user, token: data.token }
    setCurrentUser(data.user.role)
    setLoggedInUser(authenticatedUser)
    setCurrentPage('dashboard')
    setVitals(EMPTY_VITALS)
    setHasAlert(false)

    if (data.user.role === 'patient') {
      try {
        const vitalsResponse = await fetch(
          `/api/vitals?userId=${data.user.id}`,
          { headers: { Authorization: `Bearer ${data.token}` } }
        )
        const vitalsData = await vitalsResponse.json().catch(() => null)

        if (!vitalsResponse.ok) {
          throw new Error(vitalsData?.message || `Lỗi máy chủ (${vitalsResponse.status})`)
        }

        if (vitalsData?.vitals?.length > 0) {
          const latestVitals = vitalsData.vitals[0]
          setVitals(latestVitals)
          setHasAlert(isAbnormalVitals(latestVitals))
        }
      } catch (error) {
        console.error('Đăng nhập thành công nhưng không tải được lịch sử chỉ số:', error)
        alert(`Đăng nhập thành công nhưng không tải được lịch sử chỉ số: ${error.message}`)
      }
    }

    console.log('Người dùng đăng nhập:', data.user)

  } catch (error) {
    console.error(error)
    alert('Không thể kết nối tới server!')
  }
}

  const handleSaveVitals = async (newVitals) => {
    try {
      const response = await fetch('/api/vitals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${loggedInUser.token}`,
        },
        body: JSON.stringify(newVitals),
      })
      const data = await response.json()

      if (!response.ok) {
        return data.message || 'Không thể gửi chỉ số sức khỏe.'
      }

      setVitals(data.vital)
      setHasAlert(isAbnormalVitals(data.vital))
      setCurrentPage('dashboard')
    } catch (error) {
      console.error(error)
      return 'Không thể kết nối tới server!'
    }
  }

  // =========================
  // PATIENT
  // =========================

  if (currentUser === 'patient') {
    if (currentPage === 'profile') {
      return (
        <Profile
          user={loggedInUser}
          onBack={() => setCurrentPage('dashboard')}
        />
      )
    }
    if (currentPage === 'book-visit') {
      return <VisitBooking user={loggedInUser} onBack={() => setCurrentPage('dashboard')} onCreated={() => setCurrentPage('visits')} />
    }
    if (currentPage === 'visits') {
      return <PatientVisits user={loggedInUser} onBack={() => setCurrentPage('dashboard')} onBook={() => setCurrentPage('book-visit')} />
    }
    if (currentPage === 'health-history') {
      return (
        <HealthHistory
          vitals={vitals}
          user={loggedInUser}
          onBack={() => setCurrentPage('dashboard')}
        />
      )
    }

    if (currentPage === 'medication') {
      return (
        <Medication
          onBack={() => setCurrentPage('dashboard')}
        />
      )
    }

    if (currentPage === 'appointments') {
      return (
        <Appointments
          onBack={() => setCurrentPage('dashboard')}
        />
      )
    }

    if (currentPage === 'add-vitals') {
      return (
        <AddVitals
          onBack={() => setCurrentPage('dashboard')}
          onSave={handleSaveVitals}
        />
      )
    }

    return (
      <PatientDashboard
        user={loggedInUser}
        vitals={vitals}
        hasAlert={hasAlert}
        onAddVitals={() => setCurrentPage('add-vitals')}
        onViewHistory={() => setCurrentPage('health-history')}
        onViewMedication={() => setCurrentPage('medication')}
        onViewAppointments={() => setCurrentPage('appointments')}
        onViewVisits={() => setCurrentPage('visits')}
        onViewBookVisit={() => setCurrentPage('book-visit')}
        onLogout={() => {
          setCurrentUser(null)
          setLoggedInUser(null)
          setCurrentPage('dashboard')
          setEmail('')
          setPassword('')
        }}
      />
    )
  }

  // =========================
  // DOCTOR
  // =========================
// =========================
// DOCTOR
// =========================

  if (currentUser === 'doctor') {
  if (currentPage === 'clinical-support') {
    return <ClinicalSupport user={loggedInUser} visit={selectedVisit} onBack={() => setCurrentPage('doctor-queue')} />
  }
  if (currentPage === 'doctor-queue') {
    return <DoctorQueue user={loggedInUser} onBack={() => setCurrentPage('dashboard')} onOpenSupport={(visit) => { setSelectedVisit(visit); setCurrentPage('clinical-support') }} />
  }
  if (currentPage === 'doctor-appointments') {
  return (
    <DoctorAppointments
      onBack={() => setCurrentPage('dashboard')}
      onViewPatient={() => setCurrentPage('patient-detail')}
    />
  )
  }
  if (currentPage === 'alerts') {
  return (
    <Alerts
      user={loggedInUser}
      onBack={() => setCurrentPage('dashboard')}
      onViewPatient={(patient) => {
        setSelectedPatient(patient)
        setCurrentPage('patient-detail')
      }}
    />
  )
  }
  if (currentPage === 'patient-list') {
    return (
      <PatientList
        user={loggedInUser}
        onBack={() => setCurrentPage('dashboard')}
        onViewPatient={(patient) => {
          setSelectedPatient(patient)
          setCurrentPage('patient-detail')
        }}
      />
    )
  }

  if (currentPage === 'patient-detail') {
    return (
      <PatientDetail
        patient={selectedPatient}
        authToken={loggedInUser.token}
        vitals={vitals}
        hasAlert={hasAlert}
        onBack={() => setCurrentPage('dashboard')}
      />
    )
  }

  return (
    <DoctorDashboard
      user={loggedInUser}
      onViewPatient={(patient) => {
        setSelectedPatient(patient)
        setCurrentPage('patient-detail')
      }}
      onViewPatientList={() => setCurrentPage('patient-list')}
      onViewAlerts={() => setCurrentPage('alerts')}
      onViewAppointments={() => setCurrentPage('doctor-appointments')}
      onViewQueue={() => setCurrentPage('doctor-queue')}
      onLogout={() => {
        setCurrentUser(null)
        setCurrentPage('dashboard')
        setEmail('')
        setPassword('')
      }}
    />
  )
}

  if (currentUser === 'receptionist') {
    return (
      <ReceptionDashboard
        user={loggedInUser}
        onLogout={() => {
          setCurrentUser(null)
          setLoggedInUser(null)
          setEmail('')
          setPassword('')
        }}
      />
    )
  }

  // =========================
  // LOGIN
  // =========================

  if (authPage === 'register') {
    return (
      <Register
        onBackToLogin={() => setAuthPage('login')}
      />
    )
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="logo">
          <div className="heart">♥</div>
          <h1>CRE-HINT</h1>
        </div>

        <h2>Hệ thống quản lý bệnh nhân suy tim</h2>

        <p className="subtitle">
          Theo dõi sức khỏe và hỗ trợ quản lý bệnh nhân từ xa
        </p>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email hoặc mã bệnh nhân</label>

            <input
              type="text"
              placeholder="Nhập email hoặc mã bệnh nhân"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Mật khẩu</label>

            <input
              type="password"
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-options">
            <label className="remember">
              <input type="checkbox" />
              Ghi nhớ đăng nhập
            </label>

            <button type="button" className="forgot-password">
              Quên mật khẩu?
            </button>
          </div>

          <button className="login-button" type="submit">
            Đăng nhập
          </button>
        </form>

        <div className="register-login-link">
          <span>Chưa có tài khoản?</span>

          <button
            type="button"
            onClick={() => setAuthPage('register')}
          >
            Đăng ký
          </button>
        </div>

        <div className="demo">
          <p>Tài khoản demo</p>

          <div className="demo-accounts">
            <button
              type="button"
              onClick={() => {
                setEmail('BN0001')
                setPassword('123456')
              }}
            >
              👤 Bệnh nhân
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail('doctor@demo.vn')
                setPassword('123456')
              }}
            >
              🩺 Bác sĩ
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('reception@demo.vn')
                setPassword('123456')
              }}
            >
              🧾 Nhân viên y tế
            </button>
          </div>
        </div>

        <p className="footer">
          CRE-HINT · Heart Failure Patient Management System
        </p>
      </div>
    </div>
  )
}

export default App

function isAbnormalVitals(vitals) {
  if (vitals.weight == null) return false

  return (
    vitals.weight >= 68.8 ||
    vitals.systolic >= 160 ||
    vitals.heartRate >= 100 ||
    vitals.spo2 <= 93 ||
    Boolean(vitals.dyspnea) ||
    Boolean(vitals.edema) ||
    Boolean(vitals.chestPain)
  )
}
