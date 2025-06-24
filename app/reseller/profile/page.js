'use client'

import { useState, useEffect } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../../lib/firebase'
import SidebarReseller from '../../components/sidebar-reseller'
import { useRouter } from 'next/navigation'

export default function ResellerProfile() {
  const [user, loading, error] = useAuthState(auth)
  const router = useRouter()
  
  // Profile state
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    profileImage: '',
    businessName: '',
    businessType: '',
    joinDate: '',
    role: 'reseller'
  })
  
  // UI state
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setSaving] = useState(false)
  const [isUploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  
  // Load profile data
  useEffect(() => {
    if (user) {
      loadProfile()
    }
  }, [user])

  const loadProfile = async () => {
    try {
      console.log('Loading profile for user:', user.uid) // Debug log
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      
      if (userDoc.exists()) {
        const userData = userDoc.data()
        console.log('User data loaded:', userData) // Debug log
        
        const profileData = {
          name: userData.name || '',
          email: userData.email || user.email,
          phone: userData.phone || '',
          address: userData.address || '',
          city: userData.city || '',
          province: userData.province || '',
          postalCode: userData.postalCode || '',
          profileImage: userData.profileImage || '',
          businessName: userData.businessName || '',
          businessType: userData.businessType || '',
          joinDate: userData.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A',
          role: userData.role || 'reseller'
        }
        
        setProfile(profileData)
        // Set preview URL dari database
        setPreviewUrl(userData.profileImage || '/default-avatar.png')
        console.log('Profile image URL:', userData.profileImage) // Debug log
        
      } else {
        console.log('No user document found')
        setMessage('Data profil tidak ditemukan')
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      setMessage('Gagal memuat profil: ' + error.message)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setProfile(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      const maxSize = 5 * 1024 * 1024 // 5MB
      
      if (!allowedTypes.includes(file.type)) {
        setMessage('Tipe file tidak didukung. Gunakan JPG, PNG, atau WebP.')
        return
      }
      
      if (file.size > maxSize) {
        setMessage('Ukuran file terlalu besar. Maksimal 5MB.')
        return
      }
      
      setSelectedFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviewUrl(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

 // Alternative upload method using base64 storage in Firebase
// Update uploadImage function in page.js

const uploadImageBase64 = async () => {
  if (!selectedFile) return profile.profileImage

  setUploading(true)
  console.log('Using base64 fallback upload method...')
  
  try {
    // Convert to base64 for temporary storage
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = () => {
        const base64 = reader.result
        console.log('Image converted to base64, length:', base64.length)
        
        // For now, return the base64 (you can store this in Firebase)
        // Note: In production, you should upload to a proper file storage
        resolve(base64)
      }
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }
      
      reader.readAsDataURL(selectedFile)
    })
  } catch (error) {
    console.error('Error converting image:', error)
    setMessage('❌ Gagal memproses gambar: ' + error.message)
    return profile.profileImage
  } finally {
    setUploading(false)
  }
}

// Update handleSave to use base64 fallback if Cloudinary fails
const handleSave = async () => {
  setSaving(true)
  setMessage('')

  try {
    let imageUrl = profile.profileImage
    
    if (selectedFile) {
      console.log('Trying Cloudinary upload first...')
      
      try {
        // Try Cloudinary first
        imageUrl = await uploadImage()
      } catch (cloudinaryError) {
        console.log('Cloudinary failed, using base64 fallback:', cloudinaryError.message)
        
        // Show user we're using alternative method
        setMessage('🔄 Menggunakan metode alternatif untuk upload...')
        
        // Use base64 fallback
        imageUrl = await uploadImageBase64()
      }
      
      console.log('Final image URL:', imageUrl)
    }

    const updateData = {
      name: profile.name,
      phone: profile.phone,
      address: profile.address,
      city: profile.city,
      province: profile.province,
      postalCode: profile.postalCode,
      businessName: profile.businessName,
      businessType: profile.businessType,
      profileImage: imageUrl || '',
      updatedAt: new Date()
    }

    console.log('Updating profile with data:', updateData)
    await updateDoc(doc(db, 'users', user.uid), updateData)
    
    setProfile(prev => ({ 
      ...prev, 
      profileImage: imageUrl || '' 
    }))
    
    setPreviewUrl(imageUrl)

    
    setIsEditing(false)
    setSelectedFile(null)
    setMessage('✅ Profil berhasil diperbarui!')
    
    setTimeout(() => {
      loadProfile()
    }, 1000)
    
  } catch (error) {
    console.error('Error saving profile:', error)
    setMessage('❌ Gagal menyimpan profil: ' + error.message)
  } finally {
    setSaving(false)
  }
}
  const handleCancel = () => {
    setIsEditing(false)
    setSelectedFile(null)
    // Reset preview to original image
    setPreviewUrl(profile.profileImage)
    setMessage('')
    // Reload original data
    loadProfile()
  }

  // Redirect if not authenticated
  if (!loading && !user) {
    router.push('/login')
    return null
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="layout-container">
        <SidebarReseller />
        
        {/* Main Content dengan Responsive Margin */}
        <div className="main-content">
          <div className="container-fluid p-3 p-md-4">
            {/* Header with Gradient - Responsive Design */}
            <div className="row mb-3 mb-md-4">
              <div className="col-12">
                <div 
                  className="card border-0 shadow-sm"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '12px'
                  }}
                >
                  <div className="card-body p-3 p-md-4">
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
                      <div className="d-flex align-items-center">
                        <div 
                          className="rounded-circle me-2 me-md-3 d-flex align-items-center justify-content-center"
                          style={{
                            width: '50px',
                            height: '50px',
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            backdropFilter: 'blur(10px)'
                          }}
                        >
                          <i className="fas fa-user-tie text-white fs-5"></i>
                        </div>
                        <div>
                          <h2 className="h4 h-md-3 mb-1 text-white">Profil Reseller</h2>
                          <p className="mb-0 text-white opacity-75 small">
                            {profile.name || 'Nama Belum Diisi'} • 
                            <span className="badge bg-success ms-2">
                              <i className="fas fa-circle me-1" style={{ fontSize: '8px' }}></i>
                              Aktif
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="w-10 w-md-auto">
                        {!isEditing ? (
                          <button 
                            className="btn btn-light btn-sm px-9 w-20 w-md-auto"
                            onClick={() => setIsEditing(true)}
                            style={{ borderRadius: '20px' }}
                          >
                            <i className="fas fa-edit me-2"></i>
                            Edit Profil
                          </button>
                        ) : (
                          <div className="d-flex gap-2 w-100 w-md-auto">
                            <button 
                              className="btn btn-success btn-sm flex-fill"
                              onClick={handleSave}
                              disabled={isSaving || isUploading}
                              style={{ borderRadius: '20px' }}
                            >
                              {isSaving || isUploading ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                  <span className="d-none d-md-inline">
                                    {isUploading ? 'Upload...' : 'Simpan...'}
                                  </span>
                                  <span className="d-md-none">...</span>
                                </>
                              ) : (
                                <>
                                  <i className="fas fa-save me-2"></i>
                                  Simpan
                                </>
                              )}
                            </button>
                            <button 
                              className="btn btn-outline-light btn-sm flex-fill"
                              onClick={handleCancel}
                              disabled={isSaving || isUploading}
                              style={{ borderRadius: '20px' }}
                            >
                              Batal
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Alert Messages */}
            {message && (
              <div className={`alert ${message.includes('berhasil') ? 'alert-success' : 'alert-danger'} alert-dismissible fade show border-0 shadow-sm mb-3`} style={{ borderRadius: '10px' }}>
                <i className={`fas ${message.includes('berhasil') ? 'fa-check-circle' : 'fa-exclamation-circle'} me-2`}></i>
                {message}
                <button type="button" className="btn-close" onClick={() => setMessage('')}></button>
              </div>
            )}

            <div className="row g-3 g-md-4">
              {/* Profile Image Section - Full width on mobile */}
              <div className="col-12 col-lg-4 order-2 order-lg-1">
                <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
                  <div 
                    className="card-header border-0 text-white"
                    style={{
                      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                      borderRadius: '12px 12px 0 0'
                    }}
                  >
                    <h5 className="card-title mb-0 d-flex align-items-center h6">
                      <i className="fas fa-camera me-2"></i>
                      Foto Profil
                    </h5>
                  </div>
                  <div className="card-body text-center p-3 p-md-4">
                    <div className="mb-3">
                      <div 
                        className="position-relative d-inline-block"
                        style={{
                          border: '3px solid #f093fb',
                          borderRadius: '50%',
                          padding: '3px'
                        }}
                      >
                        <img 
                          src={previewUrl || '/default-avatar.png'} 
                          alt="Profile" 
                          className="rounded-circle"
                          style={{ 
                            width: '120px', 
                            height: '120px', 
                            objectFit: 'cover',
                            border: '3px solid white'
                          }}
                          onError={(e) => {
                            console.log('Image failed to load:', previewUrl)
                            e.target.src = 'https://via.placeholder.com/120x120/f8f9fa/6c757d?text=No+Image'
                          }}
                        />
                        {isEditing && (
                          <div 
                            className="position-absolute bottom-0 end-0 bg-primary rounded-circle d-flex align-items-center justify-content-center"
                            style={{ width: '30px', height: '30px' }}
                          >
                            <i className="fas fa-camera text-white small"></i>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {isEditing && (
                      <div>
                        <input 
                          type="file" 
                          className="form-control form-control-sm mb-2" 
                          accept="image/*"
                          onChange={handleFileSelect}
                          style={{ borderRadius: '8px' }}
                        />
                        <small className="text-muted">
                          <i className="fas fa-info-circle me-1"></i>
                          Max 5MB (JPG, PNG, WebP)
                        </small>
                        {isUploading && (
                          <div className="mt-2">
                            <div className="spinner-border spinner-border-sm" role="status">
                              <span className="visually-hidden">Uploading...</span>
                            </div>
                            <small className="text-primary ms-2">Uploading...</small>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Profile Information - Better spacing */}
              <div className="col-12 col-lg-8 order-1 order-lg-2">
                <div className="card border-0 shadow-sm mb-3 mb-md-4" style={{ borderRadius: '12px' }}>
                  <div 
                    className="card-header border-0 text-white"
                    style={{
                      background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                      borderRadius: '12px 12px 0 0'
                    }}
                  >
                    <h5 className="card-title mb-0 d-flex align-items-center h6">
                      <i className="fas fa-user me-2"></i>
                      Informasi Pribadi
                    </h5>
                  </div>
                  <div className="card-body p-3 p-md-4">
                    <div className="row g-3">
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-bold text-primary small">
                          <i className="fas fa-user-circle me-2"></i>Nama Lengkap
                        </label>
                        <input 
                          type="text" 
                          className="form-control form-control-sm border-2" 
                          name="name"
                          value={profile.name}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          style={{ borderRadius: '8px', borderColor: '#e3f2fd' }}
                        />
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-bold text-primary small">
                          <i className="fas fa-envelope me-2"></i>Email
                        </label>
                        <input 
                          type="email" 
                          className="form-control form-control-sm border-2" 
                          value={profile.email}
                          disabled
                          style={{ borderRadius: '8px', borderColor: '#e3f2fd', backgroundColor: '#f8f9fa' }}
                        />
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-bold text-primary small">
                          <i className="fas fa-phone me-2"></i>Nomor Telepon
                        </label>
                        <input 
                          type="tel" 
                          className="form-control form-control-sm border-2" 
                          name="phone"
                          value={profile.phone}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          placeholder="08xxxxxxxxxx"
                          style={{ borderRadius: '8px', borderColor: '#e3f2fd' }}
                        />
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-bold text-primary small">
                          <i className="fas fa-city me-2"></i>Kota
                        </label>
                        <input 
                          type="text" 
                          className="form-control form-control-sm border-2" 
                          name="city"
                          value={profile.city}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          style={{ borderRadius: '8px', borderColor: '#e3f2fd' }}
                        />
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-bold text-primary small">
                          <i className="fas fa-map-marker-alt me-2"></i>Provinsi
                        </label>
                        <input 
                          type="text" 
                          className="form-control form-control-sm border-2" 
                          name="province"
                          value={profile.province}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          style={{ borderRadius: '8px', borderColor: '#e3f2fd' }}
                        />
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-bold text-primary small">
                          <i className="fas fa-mail-bulk me-2"></i>Kode Pos
                        </label>
                        <input 
                          type="text" 
                          className="form-control form-control-sm border-2" 
                          name="postalCode"
                          value={profile.postalCode}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          style={{ borderRadius: '8px', borderColor: '#e3f2fd' }}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-bold text-primary small">
                          <i className="fas fa-home me-2"></i>Alamat Lengkap
                        </label>
                        <textarea 
                          className="form-control form-control-sm border-2" 
                          rows="2"
                          name="address"
                          value={profile.address}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          style={{ borderRadius: '8px', borderColor: '#e3f2fd' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Business Information */}
                <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                  <div 
                    className="card-header border-0 text-dark"
                    style={{
                      background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                      borderRadius: '12px 12px 0 0'
                    }}
                  >
                    <h5 className="card-title mb-0 d-flex align-items-center text-dark h6">
                      <i className="fas fa-briefcase me-2"></i>
                      Informasi Bisnis
                    </h5>
                  </div>
                  <div className="card-body p-3 p-md-4">
                    <div className="row g-3">
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-bold text-success small">
                          <i className="fas fa-store me-2"></i>Nama Bisnis
                        </label>
                        <input 
                          type="text" 
                          className="form-control form-control-sm border-2" 
                          name="businessName"
                          value={profile.businessName}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          placeholder="Nama toko/bisnis Anda"
                          style={{ borderRadius: '8px', borderColor: '#e8f5e8' }}
                        />
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-bold text-success small">
                          <i className="fas fa-tags me-2"></i>Jenis Bisnis
                        </label>
                        <select 
                          className="form-select form-select-sm border-2" 
                          name="businessType"
                          value={profile.businessType}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          style={{ borderRadius: '8px', borderColor: '#e8f5e8' }}
                        >
                          <option value="">Pilih jenis bisnis</option>
                          <option value="online_shop">🛒 Toko Online</option>
                          <option value="physical_store">🏪 Toko Fisik</option>
                          <option value="both">🏪🛒 Keduanya</option>
                          <option value="individual">👤 Individu</option>
                        </select>
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-bold text-success small">
                          <i className="fas fa-calendar-alt me-2"></i>Tanggal Bergabung
                        </label>
                        <input 
                          type="text" 
                          className="form-control form-control-sm border-2" 
                          value={profile.joinDate}
                          disabled
                          style={{ borderRadius: '8px', borderColor: '#e8f5e8', backgroundColor: '#f8f9fa' }}
                        />
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-bold text-success small">
                          <i className="fas fa-check-circle me-2"></i>Status
                        </label>
                        <div className="form-control form-control-sm border-2 d-flex align-items-center" style={{ borderRadius: '8px', borderColor: '#e8f5e8', backgroundColor: '#f8f9fa' }}>
                          <span className="badge bg-success me-2">
                            <i className="fas fa-circle me-1" style={{ fontSize: '6px' }}></i>
                            Reseller Aktif
                          </span>
                          <small className="text-muted d-none d-md-inline">Bergabung sejak {profile.joinDate}</small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .layout-container {
          display: flex;
          min-height: 100vh;
          background-color: #f5f7fa;
        }

        .main-content {
          flex: 1;
          margin-left: 0;
          transition: margin-left 0.3s ease;
          min-height: 100vh;
          overflow-x: hidden;
        }

        /* Desktop - Sidebar visible */
        @media (min-width: 768px) {
          .main-content {
            margin-left: 250px;
          }
        }

        /* Large Desktop - Wider sidebar */
        @media (min-width: 1200px) {
          .main-content {
            margin-left: 250px;
          }
        }

        /* Mobile - Full width */
        @media (max-width: 767.98px) {
          .main-content {
            margin-left: 0;
            padding-top: 60px; /* Space for mobile menu button */
          }
          
          .card-body {
            padding: 1rem !important;
          }
          
          .container-fluid {
            padding-left: 0.75rem !important;
            padding-right: 0.75rem !important;
          }
        }

        /* Tablet adjustments */
        @media (max-width: 1024px) and (min-width: 768px) {
          .main-content {
            margin-left: 200px;
          }
        }

        /* Ensure responsive images */
        img {
          max-width: 100%;
          height: auto;
        }

        /* Better button spacing on mobile */
        @media (max-width: 576px) {
          .btn-group {
            width: 100%;
          }
          
          .btn-group .btn {
            font-size: 0.8rem;
          }
        }

        /* Improved form spacing */
        .form-control, .form-select {
          font-size: 0.9rem;
        }

        .form-label {
          font-size: 0.85rem;
        }

        /* Card title sizing */
        .card-title.h6 {
          font-size: 0.95rem;
        }

        /* Responsive badge text */
        @media (max-width: 576px) {
          .badge {
            font-size: 0.7rem;
          }
        }
      `}</style>
    </>
  )
}