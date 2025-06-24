'use client';
import { useState, useEffect } from 'react'
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth, db } from '../../lib/firebase'
import { useRouter } from 'next/navigation'
import Sidebar from '../../components/Sidebar'

export default function ProductsPage() {
  const [user, loading, error] = useAuthState(auth)
  const [userRole, setUserRole] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [products, setProducts] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [editingProduct, setEditingProduct] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    category: '',
    price: '',
    expiryDate: '',
    stock: '',
    description: ''
  })
  const router = useRouter()

  // Check authentication and user role
  useEffect(() => {
    if (loading) return

    if (!user) {
      router.push('/')
      return
    }

    // Check user role from Firestore
    const checkUserRole = async () => {
      try {
        const userDoc = await getDocs(collection(db, 'users'))
        const userData = userDoc.docs.find(doc => doc.id === user.uid)
        
        if (userData && userData.data().role === 'admin') {
          setUserRole('admin')
        } else {
          alert('Akses ditolak! Hanya admin yang dapat mengakses halaman ini.')
          router.push('/')
        }
      } catch (error) {
        console.error('Error checking user role:', error)
        router.push('/')
      }
    }

    checkUserRole()
  }, [user, loading, router])

  // Load products from Firestore
  useEffect(() => {
    if (!userRole) return

    const productsRef = collection(db, 'products')
    
    // Real-time listener for products
    const unsubscribe = onSnapshot(productsRef, (snapshot) => {
      const productsData = []
      snapshot.forEach((doc) => {
        productsData.push({
          id: doc.id,
          ...doc.data()
        })
      })
      setProducts(productsData)
      setIsLoading(false)
    }, (error) => {
      console.error('Error loading products:', error)
      setIsLoading(false)
      
      // If error, initialize with mock data (fallback)
      const mockProducts = [
        {
          id: 'mock1',
          name: 'Power Bright Expert Serum',
          category: 'Skincare',
          brand: 'Hanasui',
          price: 22000,
          expiryDate: '2025-12-15',
          stock: 156,
          sold: 45,
          status: 'available',
          image: '/images/serum-hanasui.jpg',
          description: 'Serum yang membantu meningkatkan tingkat kecerahan kulit 3x lebih baik* serta melembapkan',
          createdAt: new Date()
        }
      ]
      setProducts(mockProducts)
    })

    return () => unsubscribe()
  }, [userRole])

  // Handle image file selection
  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('File harus berupa gambar!')
        return
      }
      
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('Ukuran file maksimal 2MB!')
        return
      }

      setImageFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  // Upload image to Cloudinary via API
  const uploadImage = async (file, productName) => {
    if (!file) return null
    
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('productName', productName)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const data = await response.json()
      setUploading(false)
      return data.url

    } catch (error) {
      console.error('Upload error:', error)
      setUploading(false)
      alert('Gagal upload gambar: ' + error.message)
      throw error
    }
  }

  // Delete image from Cloudinary
  const deleteImageFromCloudinary = async (publicId) => {
    if (!publicId) return
    
    try {
      const response = await fetch('/api/delete-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ publicId })
      })

      if (!response.ok) {
        console.error('Failed to delete image from Cloudinary')
      }
    } catch (error) {
      console.error('Error deleting image:', error)
    }
  }

  // Extract public ID from Cloudinary URL
  const extractPublicIdFromUrl = (url) => {
    if (!url || !url.includes('cloudinary.com')) return null
    
    try {
      const parts = url.split('/')
      const filename = parts[parts.length - 1]
      const publicId = filename.split('.')[0]
      return publicId
    } catch (error) {
      console.error('Error extracting public ID:', error)
      return null
    }
  }

  const getStatusBadge = (status, stock) => {
    if (status === 'out_of_stock' || stock === 0) {
      return <span className="badge bg-danger">Habis</span>
    } else if (status === 'low_stock' || stock < 50) {
      return <span className="badge bg-warning">Stok Rendah</span>
    } else {
      return <span className="badge bg-success">Tersedia</span>
    }
  }

  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return { status: 'no-expiry', text: 'Tidak ada', class: 'text-muted' }
    
    const today = new Date()
    const expiry = new Date(expiryDate)
    const diffTime = expiry - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) {
      return { status: 'expired', text: 'Kadaluarsa', class: 'text-danger' }
    } else if (diffDays <= 30) {
      return { status: 'expiring-soon', text: `${diffDays} hari lagi`, class: 'text-warning' }
    } else {
      return { status: 'fresh', text: `${diffDays} hari lagi`, class: 'text-success' }
    }
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.brand.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
    const matchesStatus = selectedStatus === 'all' || 
                         (selectedStatus === 'available' && product.status === 'available' && product.stock > 0) ||
                         (selectedStatus === 'low_stock' && (product.status === 'low_stock' || product.stock < 50)) ||
                         (selectedStatus === 'out_of_stock' && (product.status === 'out_of_stock' || product.stock === 0))
    
    return matchesSearch && matchesCategory && matchesStatus
  })

  const handleEdit = (product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      brand: product.brand,
      category: product.category,
      price: product.price,
      expiryDate: product.expiryDate || '',
      stock: product.stock,
      description: product.description || ''
    })
    setImagePreview(product.image)
    setImageFile(null)
    setShowModal(true)
  }

  const handleDelete = async (productId) => {
    if (confirm('Apakah Anda yakin ingin menghapus produk ini?')) {
      try {
        const product = products.find(p => p.id === productId)
        
        // Delete image from Cloudinary if it exists and it's not default image
        if (product?.image && product.image !== '/images/default-product.jpg') {
          const publicId = product.publicId || extractPublicIdFromUrl(product.image)
          if (publicId) {
            await deleteImageFromCloudinary(publicId)
          }
        }
        
        // Delete product from Firestore
        await deleteDoc(doc(db, 'products', productId))
        alert('Produk berhasil dihapus!')
      } catch (error) {
        console.error('Error deleting product:', error)
        alert('Gagal menghapus produk: ' + error.message)
      }
    }
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSaveProduct = async (e) => {
    e.preventDefault()
    
    // Basic validation
    if (!formData.name || !formData.brand || !formData.category || !formData.price || !formData.stock) {
      alert('Mohon lengkapi semua field yang wajib diisi!')
      return
    }

    const stock = parseInt(formData.stock)
    const price = parseInt(formData.price)

    if (stock < 0 || price < 0) {
      alert('Stok dan harga tidak boleh negatif!')
      return
    }

    try {
      let imageUrl = editingProduct ? editingProduct.image : '/images/default-product.jpg'
      let publicId = editingProduct ? editingProduct.publicId : null
      
      // Upload new image if selected
      if (imageFile) {
        const uploadResult = await uploadImage(imageFile, formData.name)
        imageUrl = uploadResult
        
        // Extract public ID from the new image URL
        publicId = extractPublicIdFromUrl(uploadResult)
        
        // Delete old image if editing and old image exists
        if (editingProduct && editingProduct.image && editingProduct.image !== '/images/default-product.jpg') {
          const oldPublicId = editingProduct.publicId || extractPublicIdFromUrl(editingProduct.image)
          if (oldPublicId) {
            await deleteImageFromCloudinary(oldPublicId)
          }
        }
      }

      const productData = {
        name: formData.name,
        brand: formData.brand,
        category: formData.category,
        price: price,
        stock: stock,
        expiryDate: formData.expiryDate || null,
        description: formData.description || '',
        status: stock === 0 ? 'out_of_stock' : stock < 50 ? 'low_stock' : 'available',
        image: imageUrl,
        publicId: publicId, // Store public ID for future deletion
        updatedAt: serverTimestamp()
      }

      if (editingProduct) {
        // Update existing product
        await updateDoc(doc(db, 'products', editingProduct.id), productData)
        alert('Produk berhasil diupdate!')
      } else {
        // Add new product
        await addDoc(collection(db, 'products'), {
          ...productData,
          sold: 0,
          createdAt: serverTimestamp()
        })
        alert('Produk berhasil ditambahkan!')
      }
      
      closeModal()
    } catch (error) {
      console.error('Error saving product:', error)
      alert('Gagal menyimpan produk: ' + error.message)
    }
  }

  const resetFilters = () => {
    setSearchTerm('')
    setSelectedCategory('all')
    setSelectedStatus('all')
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingProduct(null)
    setImageFile(null)
    setImagePreview(null)
    setFormData({
      name: '',
      brand: '',
      category: '',
      price: '',
      expiryDate: '',
      stock: '',
      description: ''
    })
  }

  // Show loading spinner while checking authentication
  if (loading || isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  // Don't render if not admin
  if (!userRole || userRole !== 'admin') {
    return null
  }

  return (
    <div className="container-fluid">
      <div className="row">
        <Sidebar />
        
        <main className="col-md-9 ms-sm-auto col-lg-10 px-md-4">
          <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
            <h1 className="h2">
              <i className="fas fa-box me-2 text-primary"></i>
              Kelola Produk
            </h1>
            <div className="btn-toolbar mb-2 mb-md-0">
              <span className="badge bg-info fs-6 me-2">
                <i className="fas fa-cubes me-1"></i>
                {products.length} Total Produk
              </span>
              <button 
                className="btn btn-primary"
                onClick={() => setShowModal(true)}
              >
                <i className="fas fa-plus me-1"></i>
                Tambah Produk
              </button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="row mb-4">
            <div className="col-md-3 mb-3">
              <div className="card bg-success text-white">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <div>
                      <h6 className="card-title">Produk Tersedia</h6>
                      <h4>{products.filter(p => p.status === 'available' && p.stock > 0).length}</h4>
                    </div>
                    <i className="fas fa-check-circle fa-2x opacity-75"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card bg-warning text-dark">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <div>
                      <h6 className="card-title">Stok Rendah</h6>
                      <h4>{products.filter(p => p.status === 'low_stock' || p.stock < 50).length}</h4>
                    </div>
                    <i className="fas fa-exclamation-triangle fa-2x opacity-75"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card bg-danger text-white">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <div>
                      <h6 className="card-title">Stok Habis</h6>
                      <h4>{products.filter(p => p.status === 'out_of_stock' || p.stock === 0).length}</h4>
                    </div>
                    <i className="fas fa-times-circle fa-2x opacity-75"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card bg-info text-white">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <div>
                      <h6 className="card-title">Akan Expired</h6>
                      <h4>{products.filter(p => {
                        if (!p.expiryDate) return false
                        const expiry = getExpiryStatus(p.expiryDate)
                        return expiry.status === 'expiring-soon' || expiry.status === 'expired'
                      }).length}</h4>
                    </div>
                    <i className="fas fa-calendar-times fa-2x opacity-75"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row">
                <div className="col-md-4 mb-3">
                  <label className="form-label">Cari Produk</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="fas fa-search"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Cari nama produk atau brand..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label">Kategori</label>
                  <select
                    className="form-select"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="all">Semua Kategori</option>
                    <option value="Skincare">Skincare</option>
                    <option value="Makeup">Makeup</option>
                    <option value="Haircare">Haircare</option>
                    <option value="Fragrance">Fragrance</option>
                  </select>
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label">Status Stok</label>
                  <select
                    className="form-select"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                  >
                    <option value="all">Semua Status</option>
                    <option value="available">Tersedia</option>
                    <option value="low_stock">Stok Rendah</option>
                    <option value="out_of_stock">Stok Habis</option>
                  </select>
                </div>
                <div className="col-md-2 mb-3">
                  <label className="form-label">&nbsp;</label>
                  <button
                    className="btn btn-outline-secondary d-block w-100"
                    onClick={resetFilters}
                  >
                    <i className="fas fa-undo me-1"></i>
                    Reset
                  </button>
                </div>
              </div>
              <div className="text-muted">
                Menampilkan {filteredProducts.length} dari {products.length} produk
              </div>
            </div>
          </div>

          {/* Products Table */}
          <div className="card">
            <div className="card-body">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-search fa-3x text-muted mb-3"></i>
                  <h5 className="text-muted">Tidak ada produk ditemukan</h5>
                  <p className="text-muted">Coba ubah filter pencarian Anda atau tambah produk baru</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="table-light">
                      <tr>
                        <th width="5%">#</th>
                        <th width="30%">Produk</th>
                        <th width="15%">Kategori</th>
                        <th width="10%">Harga</th>
                        <th width="10%">Stok</th>
                        <th width="15%">Tanggal Expired</th>
                        <th width="10%">Status</th>
                        <th width="5%">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product, index) => {
                        const expiryStatus = getExpiryStatus(product.expiryDate)
                        return (
                          <tr key={product.id}>
                            <td>{index + 1}</td>
                            <td>
                              <div className="d-flex align-items-center">
                                <img 
                                  src={product.image || '/images/default-product.jpg'} 
                                  alt={product.name}
                                  className="rounded me-3"
                                  width="50"
                                  height="50"
                                  style={{objectFit: 'cover'}}
                                  onError={(e) => {
                                    e.target.src = '/images/default-product.jpg'
                                  }}
                                />
                                <div>
                                  <h6 className="mb-1">{product.name}</h6>
                                  <small className="text-muted">{product.brand}</small>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="badge bg-light text-dark">{product.category}</span>
                            </td>
                            <td>Rp {product.price.toLocaleString('id-ID')}</td>
                            <td>
                              <span className={`fw-bold ${product.stock === 0 ? 'text-danger' : product.stock < 50 ? 'text-warning' : 'text-success'}`}>
                                {product.stock}
                              </span>
                            </td>
                            <td>
                              <div>
                                <small className="d-block">
                                  {product.expiryDate ? new Date(product.expiryDate).toLocaleDateString('id-ID') : '-'}
                                </small>
                                <small className={expiryStatus.class}>{expiryStatus.text}</small>
                              </div>
                            </td>
                            <td>
                              {getStatusBadge(product.status, product.stock)}
                            </td>
                            <td>
                              <div className="btn-group btn-group-sm">
                                <button
                                  className="btn btn-outline-primary"
                                  onClick={() => handleEdit(product)}
                                  title="Edit Produk"
                                >
                                  <i className="fas fa-edit"></i>
                                </button>
                                <button
                                  className="btn btn-outline-danger"
                                  onClick={() => handleDelete(product.id)}
                                  title="Hapus Produk"
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Modal for Add/Edit Product */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className={`fas ${editingProduct ? 'fa-edit' : 'fa-plus'} me-2`}></i>
                  {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
                </h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <form onSubmit={handleSaveProduct}>
                <div className="modal-body">
                  {/* Image Upload Section */}
                  <div className="mb-4">
                    <label className="form-label">Gambar Produk</label>
                    <div className="row">
                      <div className="col-md-6">
                        <input
                          type="file"
                          className="form-control"
                          accept="image/*"
                          onChange={handleImageChange}
                        />
                        <small className="text-muted">
                          Format: JPG, PNG, GIF. Maksimal 2MB.
                        </small>
                      </div>
                      <div className="col-md-6">
                        {imagePreview && (
                          <div className="text-center">
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="Images-thumbnail"
                              style={{ maxWidth: '150px', maxHeight: '150px', objectFit: 'cover' }}
                            />
                            <div className="mt-2">
                              <small className="text-muted">Preview Gambar</small>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Nama Produk <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        name="name"
                        value={formData.name}
                        onChange={handleFormChange}
                        placeholder="Masukkan nama produk..."
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Brand <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        name="brand"
                        value={formData.brand}
                        onChange={handleFormChange}
                        placeholder="Masukkan nama brand..."
                        required
                      />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Kategori <span className="text-danger">*</span></label>
                      <select
                        className="form-select"
                        name="category"
                        value={formData.category}
                        onChange={handleFormChange}
                        required
                      >
                        <option value="">Pilih Kategori</option>
                        <option value="Skincare">Skincare</option>
                        <option value="Makeup">Makeup</option>
                        <option value="Haircare">Haircare</option>
                        <option value="Fragrance">Fragrance</option>
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Harga <span className="text-danger">*</span></label>
                      <div className="input-group">
                        <span className="input-group-text">Rp</span>
                        <input
                          type="number"
                          className="form-control"
                          name="price"
                          value={formData.price}
                          onChange={handleFormChange}
                          placeholder="0"
                          min="0"
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Stok <span className="text-danger">*</span></label>
                      <input
                        type="number"
                        className="form-control"
                        name="stock"
                        value={formData.stock}
                        onChange={handleFormChange}
                        placeholder="0"
                        min="0"
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Tanggal Expired</label>
                      <input
                        type="date"
                        className="form-control"
                        name="expiryDate"
                        value={formData.expiryDate}
                        onChange={handleFormChange}
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Deskripsi</label>
                    <textarea
                      className="form-control"
                      name="description"
                      value={formData.description}
                      onChange={handleFormChange}
                      rows="3"
                      placeholder="Masukkan deskripsi produk..."
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
                    <i className="fas fa-times me-1"></i>
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Mengupload...
                      </>
                    ) : (
                      <>
                        <i className={`fas ${editingProduct ? 'fa-save' : 'fa-plus'} me-1`}></i>
                        {editingProduct ? 'Update Produk' : 'Tambah Produk'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
