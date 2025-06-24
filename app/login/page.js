'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState('admin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false)
  const router = useRouter()

  const handleRoleChange = (role) => {
    setSelectedRole(role)
    setEmail('')
    setPassword('')
    setError('')
    setSuccess('')
  }

  // Function to fill demo credentials
  const fillDemoCredentials = () => {
    if (selectedRole === 'admin') {
      setEmail('admin@beautyorder.com')
      setPassword('admin123')
    } else {
      setEmail('reseller@beautyorder.com')
      setPassword('reseller123')
    }
  }

  const validateInput = () => {
    if (!email || (!isForgotPasswordMode && !password)) {
      setError('Email dan password harus diisi')
      return false
    }
    
    if (!isForgotPasswordMode && password.length < 6) {
      setError('Password minimal 6 karakter')
      return false
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Format email tidak valid')
      return false
    }
    
    return true
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    if (!email) {
      setError('Email harus diisi')
      setIsLoading(false)
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Format email tidak valid')
      setIsLoading(false)
      return
    }

    try {
      await sendPasswordResetEmail(auth, email)
      setSuccess('Email reset password telah dikirim. Silakan cek email Anda.')
      setError('')
    } catch (error) {
      console.error('Forgot password error:', error)
      setError(getErrorMessage(error.code))
    }
    
    setIsLoading(false)
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    if (!validateInput()) {
      setIsLoading(false)
      return
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        role: selectedRole,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      })

      const token = await user.getIdToken()
      const maxAge = 60 * 60 * 24 * 7
      
      document.cookie = `auth-token=${token}; path=/; max-age=${maxAge}; secure; samesite=strict`
      document.cookie = `user-role=${selectedRole}; path=/; max-age=${maxAge}; secure; samesite=strict`
      document.cookie = `email=${email}; path=/; max-age=${maxAge}; secure; samesite=strict`
      
      const redirectUrl = selectedRole === 'admin' ? '/admin' : '/reseller'
      router.push(redirectUrl)
      
    } catch (error) {
      console.error('Registration error:', error)
      setError(getErrorMessage(error.code))
    }
    
    setIsLoading(false)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    if (!validateInput()) {
      setIsLoading(false)
      return
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      const userDoc = await getDoc(doc(db, 'users', user.uid))
      let userRole = selectedRole

      if (userDoc.exists()) {
        userRole = userDoc.data().role
        
        await setDoc(doc(db, 'users', user.uid), {
          ...userDoc.data(),
          lastLogin: new Date().toISOString()
        })
      } else {
        setError('Data pengguna tidak ditemukan')
        return
      }

      if (userRole !== selectedRole) {
        setError(`Akun ini terdaftar sebagai ${userRole}, silakan pilih role yang sesuai`)
        return
      }

      const token = await user.getIdToken()
      const maxAge = 60 * 60 * 24 * 7
      
      document.cookie = `auth-token=${token}; path=/; max-age=${maxAge}; secure; samesite=strict`
      document.cookie = `user-role=${userRole}; path=/; max-age=${maxAge}; secure; samesite=strict`
      document.cookie = `email=${email}; path=/; max-age=${maxAge}; secure; samesite=strict`
      
      const redirectUrl = userRole === 'admin' ? '/admin' : '/reseller'
      router.push(redirectUrl)
      
    } catch (error) {
      console.error('Login error:', error)
      setError(getErrorMessage(error.code))
    }
    
    setIsLoading(false)
  }

  const getErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'Akun tidak ditemukan'
      case 'auth/wrong-password':
        return 'Password salah'
      case 'auth/email-already-in-use':
        return 'Email sudah terdaftar'
      case 'auth/weak-password':
        return 'Password terlalu lemah (minimal 6 karakter)'
      case 'auth/invalid-email':
        return 'Format email tidak valid'
      case 'auth/invalid-credential':
        return 'Email atau password salah'
      case 'auth/too-many-requests':
        return 'Terlalu banyak percobaan. Coba lagi nanti.'
      case 'auth/network-request-failed':
        return 'Koneksi bermasalah. Periksa internet Anda.'
      default:
        return 'Terjadi kesalahan. Silakan coba lagi.'
    }
  }

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setError('')
    setSuccess('')
    setIsRegisterMode(false)
    setIsForgotPasswordMode(false)
  }

  return (
    <>
      <link 
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" 
        rel="stylesheet" 
      />
      
      <div className="login-page d-flex align-items-center justify-content-center">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-12 col-sm-10 col-md-8 col-lg-6 col-xl-5">
              <div className="login-card">
                
                {/* Header */}
                <div className="text-center mb-4">
                  <h4 className="login-title">
                    {isForgotPasswordMode ? 'Reset Password' : (isRegisterMode ? 'Daftar ke' : 'Login ke')}
                  </h4>
                  <h5 className="brand-name">BeautyOrder</h5>
                </div>

                {/* Role Selector - Hide in forgot password mode */}
                {!isForgotPasswordMode && (
                  <div className="role-selector mb-4">
                    <div className="btn-group w-100" role="group">
                      <button
                        type="button"
                        className={`btn role-btn ${selectedRole === 'admin' ? 'active' : ''}`}
                        onClick={() => handleRoleChange('admin')}
                      >
                        Admin
                      </button>
                      <button
                        type="button"
                        className={`btn role-btn ${selectedRole === 'reseller' ? 'active' : ''}`}
                        onClick={() => handleRoleChange('reseller')}
                      >
                        Reseller
                      </button>
                    </div>
                  </div>
                )}

                {/* Forms */}
                <form onSubmit={isForgotPasswordMode ? handleForgotPassword : (isRegisterMode ? handleRegister : handleLogin)}>
                  <div className="mb-3">
                    <input
                      type="email"
                      className="form-control form-input"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value.toLowerCase().trim())}
                      required
                      autoComplete="email"
                    />
                  </div>

                  {!isForgotPasswordMode && (
                    <div className="mb-4">
                      <input
                        type="password"
                        className="form-control form-input"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength="6"
                        autoComplete={isRegisterMode ? "new-password" : "current-password"}
                      />
                    </div>
                  )}

                  {error && (
                    <div className="alert alert-danger py-2 mb-3" role="alert">
                      <small>{error}</small>
                    </div>
                  )}

                  {success && (
                    <div className="alert alert-success py-2 mb-3" role="alert">
                      <small>{success}</small>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn btn-login w-100 mb-3"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        {isForgotPasswordMode ? 'Mengirim...' : (isRegisterMode ? 'Mendaftar...' : 'Masuk...')}
                      </>
                    ) : (
                      isForgotPasswordMode ? 'Kirim Reset Email' : (isRegisterMode ? 'Daftar' : 'Masuk')
                    )}
                  </button>
                </form>

                {/* Demo Credentials Button - Only show in login mode */}
                {!isRegisterMode && !isForgotPasswordMode && (
                  <button
                    type="button"
                    className="btn btn-demo w-100 mb-3"
                    onClick={fillDemoCredentials}
                  >
                    Isi Kredensial Demo
                  </button>
                )}

                {/* Navigation Links */}
                <div className="text-center mb-4">
                  <div className="d-flex flex-column gap-2">
                    {!isForgotPasswordMode && (
                      <small className="text-muted">
                        {isRegisterMode ? 'Sudah punya akun? ' : 'Belum punya akun? '}
                        <button
                          type="button"
                          className="btn-link"
                          onClick={() => {
                            setIsRegisterMode(!isRegisterMode)
                            setError('')
                            setSuccess('')
                          }}
                        >
                          {isRegisterMode ? 'Masuk di sini' : 'Daftar di sini'}
                        </button>
                      </small>
                    )}
                    
                    {!isRegisterMode && (
                      <small className="text-muted">
                        {isForgotPasswordMode ? 'Kembali ke ' : 'Lupa password? '}
                        <button
                          type="button"
                          className="btn-link"
                          onClick={() => {
                            if (isForgotPasswordMode) {
                              resetForm()
                            } else {
                              setIsForgotPasswordMode(true)
                              setError('')
                              setSuccess('')
                            }
                          }}
                        >
                          {isForgotPasswordMode ? 'halaman login' : 'Reset di sini'}
                        </button>
                      </small>
                    )}
                  </div>
                </div>

                {/* Demo Credentials Info - Only show in login mode */}
                {!isRegisterMode && !isForgotPasswordMode && (
                  <div className="demo-info">
                    <div className="text-center mb-2">
                      <small className="text-muted demo-title">Keterangan Demo:</small>
                    </div>
                    <div className="demo-credentials">
                      <div className="demo-section">
                        <small className="demo-role">Admin:</small>
                        <div className="demo-text">
                          <span>username: admin@beautyorder.com | password: admin123</span>
                        </div>
                      </div>
                      <div className="demo-section">
                        <small className="demo-role">Reseller:</small>
                        <div className="demo-text">
                          <span>username: reseller@beautyorder.com | password: reseller123</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-center mt-2">
                      <small className="demo-note">
                        * Username ini hanya untuk keperluan demo, tidak bisa digunakan untuk registrasi
                      </small>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #e8d5ff 0%, #f0e6ff 50%, #e8d5ff 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          padding: 2rem 0;
        }

        .login-card {
          background: white;
          border-radius: 20px;
          padding: 2.5rem;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          max-width: 500px;
          width: 100%;
          margin: 0 auto;
        }

        .login-title {
          color: #666;
          font-weight: 400;
          font-size: 1.2rem;
          margin-bottom: 0.25rem;
        }

        .brand-name {
          color: #333;
          font-weight: 600;
          font-size: 1.6rem;
          margin-bottom: 0;
        }

        .role-btn {
          border: 2px solid #d8b4fe !important;
          background: white !important;
          color: #8b5cf6 !important;
          font-weight: 500;
          padding: 0.6rem 1.2rem;
          border-radius: 25px !important;
          transition: all 0.2s ease;
          font-size: 0.95rem;
        }

        .role-btn.active {
          background: linear-gradient(135deg, #d8b4fe 0%, #c084fc 100%) !important;
          color: white !important;
          border-color: #c084fc !important;
        }

        .role-btn:hover {
          background: linear-gradient(135deg, #d8b4fe 0%, #c084fc 100%) !important;
          color: white !important;
          border-color: #c084fc !important;
        }

        .form-input {
          border: 2px solid #e5e7eb;
          border-radius: 14px;
          padding: 0.9rem 1.2rem;
          font-size: 1rem;
          transition: all 0.2s ease;
          background: #fafafa;
          height: 50px;
        }

        .form-input:focus {
          border-color: #d8b4fe;
          box-shadow: 0 0 0 0.2rem rgba(216, 180, 254, 0.25);
          background: white;
          outline: none;
        }

        .form-input::placeholder {
          color: #9ca3af;
        }

        .btn-login {
          background: linear-gradient(135deg, #d8b4fe 0%, #c084fc 100%);
          border: none;
          border-radius: 14px;
          padding: 0.9rem 1.5rem;
          font-weight: 500;
          color: white;
          font-size: 1rem;
          transition: all 0.2s ease;
          height: 50px;
        }

        .btn-login:hover:not(:disabled) {
          background: linear-gradient(135deg, #c084fc 0%, #a855f7 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(168, 85, 247, 0.3);
          color: white;
        }

        .btn-login:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .btn-demo {
          background: #f8f9fa;
          border: 2px solid #e9ecef;
          color: #6c757d;
          border-radius: 14px;
          padding: 0.9rem 1.5rem;
          font-weight: 500;
          font-size: 1rem;
          transition: all 0.2s ease;
          height: 50px;
        }

        .btn-demo:hover {
          background: #e9ecef;
          border-color: #dee2e6;
          color: #495057;
          transform: translateY(-1px);
        }

        .btn-link {
          background: none;
          border: none;
          color: #8b5cf6;
          text-decoration: none;
          font-size: inherit;
          padding: 0;
          cursor: pointer;
        }

        .btn-link:hover {
          color: #7c3aed;
          text-decoration: underline;
        }

        .alert-danger {
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          border-radius: 10px;
        }

        .alert-success {
          background-color: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #16a34a;
          border-radius: 10px;
        }

        .btn-group .btn:first-child {
          border-top-right-radius: 0 !important;
          border-bottom-right-radius: 0 !important;
        }

        .btn-group .btn:last-child {
          border-top-left-radius: 0 !important;
          border-bottom-left-radius: 0 !important;
        }

        .btn-group .btn:not(:first-child) {
          border-left: none !important;
        }

        /* Demo Info Styles */
        .demo-info {
          background: #f8f9fa;
          border-radius: 14px;
          padding: 1.2rem;
          border: 1px solid #e9ecef;
        }

        .demo-title {
          font-weight: 600;
          color: #495057;
          font-size: 0.9rem;
        }

        .demo-credentials {
          margin: 0.6rem 0;
        }

        .demo-section {
          margin-bottom: 0.6rem;
        }

        .demo-role {
          font-weight: 600;
          color: #6c757d;
          font-size: 0.85rem;
        }

        .demo-text {
          margin-top: 0.3rem;
        }

        .demo-text span {
          font-size: 0.8rem;
          color: #6c757d;
          font-family: monospace;
          background: #ffffff;
          padding: 0.3rem 0.5rem;
          border-radius: 6px;
          border: 1px solid #dee2e6;
          display: inline-block;
          width: 100%;
        }

        .demo-note {
          color: #6c757d;
          font-size: 0.75rem;
          font-style: italic;
        }

        @media (max-width: 768px) {
          .login-card {
            padding: 2rem;
            margin: 1rem;
            border-radius: 16px;
          }
        }

        @media (max-width: 576px) {
          .login-card {
            padding: 1.5rem;
            margin: 0.5rem;
          }
          
          .brand-name {
            font-size: 1.4rem;
          }
          
          .login-title {
            font-size: 1.1rem;
          }

          .demo-text span {
            font-size: 0.75rem;
          }

          .form-input, .btn-login, .btn-demo {
            height: 45px;
            font-size: 0.95rem;
          }
        }
      `}</style>
    </>
  )
}