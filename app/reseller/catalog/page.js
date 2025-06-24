'use client'

import { useAuth } from '../../components/AuthProvider'
import Sidebar from '../../components/sidebar-reseller'
import { useState, useEffect } from 'react'
import { 
  collection, 
  onSnapshot,
  query,
  orderBy,
  doc,
  getDoc
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { createOrder } from '../../lib/orders'
import { useRouter } from 'next/navigation'

export default function CatalogPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [products, setProducts] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [userProfile, setUserProfile] = useState(null)

  // Shopping Cart State - with localStorage persistence
  const [cart, setCart] = useState([])
  const [showCart, setShowCart] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false)

  // Product Detail Modal
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showProductDetail, setShowProductDetail] = useState(false)

  // Load cart from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem('reseller_cart')
      if (savedCart) {
        try {
          setCart(JSON.parse(savedCart))
        } catch (error) {
          console.error('Error parsing saved cart:', error)
        }
      }
    }
  }, [])

  // Save cart to localStorage whenever cart changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('reseller_cart', JSON.stringify(cart))
    }
  }, [cart])

  // Load user profile data
  useEffect(() => {
    const loadUserProfile = async () => {
      if (user?.uid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid))
          if (userDoc.exists()) {
            setUserProfile(userDoc.data())
          }
        } catch (error) {
          console.error('Error loading user profile:', error)
        }
      }
    }

    loadUserProfile()
  }, [user])

  // Load products from Firestore with real-time updates
  useEffect(() => {
    const productsRef = collection(db, 'products')
    const productsQuery = query(productsRef, orderBy('createdAt', 'desc'))
    
    const unsubscribe = onSnapshot(productsQuery, (snapshot) => {
      try {
        const productsData = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          
          const retailPrice = Math.round(data.price * 1.4)
          const commission = retailPrice - data.price
          const commissionPercentage = Math.round(((commission / data.price) * 100))
          
          let status = 'available'
          if (data.stock === 0) {
            status = 'out_of_stock'
          } else if (data.stock < 50) {
            status = 'low_stock'
          }
          
          productsData.push({
            id: doc.id,
            name: data.name,
            category: data.category,
            retailPrice: retailPrice,
            wholesalePrice: data.price,
            commission: commissionPercentage,
            commissionAmount: commission,
            stock: data.stock,
            image: data.image || '/images/default-product.jpg',
            brand: data.brand,
            description: data.description || '',
            expiryDate: data.expiryDate,
            sold: data.sold || 0,
            status: status,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          })
        })
        
        setProducts(productsData)
        setIsLoading(false)
        setError(null)
      } catch (err) {
        console.error('Error processing products:', err)
        setError('Gagal memuat data produk')
        setIsLoading(false)
      }
    }, (error) => {
      console.error('Error loading products:', error)
      setError('Gagal terhubung ke database: ' + error.message)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Shopping Cart Functions
  const addToCart = (product, quantity = 1) => {
    if (product.stock < quantity) {
      alert('Stok tidak mencukupi!')
      return
    }

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id)
      
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity
        if (newQuantity > product.stock) {
          alert('Jumlah melebihi stok yang tersedia!')
          return prevCart
        }
        return prevCart.map(item =>
          item.id === product.id 
            ? { ...item, quantity: newQuantity }
            : item
        )
      } else {
        return [...prevCart, {
          id: product.id,
          name: product.name,
          price: product.wholesalePrice,
          retailPrice: product.retailPrice,
          commission: product.commissionAmount,
          image: product.image,
          brand: product.brand,
          category: product.category,
          maxStock: product.stock,
          quantity: quantity
        }]
      }
    })
    
    // Show success toast
    showToast(`${product.name} ditambahkan ke keranjang!`, 'success')
  }

  const updateCartQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId)
      return
    }

    const product = products.find(p => p.id === productId)
    if (product && newQuantity > product.stock) {
      alert('Jumlah melebihi stok yang tersedia!')
      return
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId 
          ? { ...item, quantity: newQuantity }
          : item
      )
    )
  }

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId))
  }

  const clearCart = () => {
    setCart([])
  }

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  const getCartItemsCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0)
  }

  const getTotalCommission = () => {
    return cart.reduce((total, item) => total + (item.commission * item.quantity), 0)
  }

  const showToast = (message, type = 'success') => {
    const toast = document.createElement('div')
    toast.className = `toast align-items-center text-white bg-${type} position-fixed top-0 end-0 m-3`
    toast.style.zIndex = '9999'
    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">
          <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2"></i>
          ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" onclick="this.parentElement.parentElement.remove()"></button>
      </div>
    `
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 3000)
  }

 // Di file checkout/pembuat order, pastikan data seperti ini:
// Fixed handleCheckout function - replace the existing one in your page.js

const handleCheckout = async (e) => {
  e.preventDefault();
  setIsSubmittingOrder(true);

  try {
    // Check if user is logged in
    if (!user?.uid) {
      alert('Silakan login terlebih dahulu');
      setIsSubmittingOrder(false);
      return;
    }

    // Check if cart is not empty
    if (cart.length === 0) {
      alert('Keranjang kosong');
      setIsSubmittingOrder(false);
      return;
    }

    // Get form data
    const formData = new FormData(e.target);
    const shippingData = {
      name: formData.get('recipientName'),
      phone: formData.get('phone'),
      address: formData.get('address'),
      city: formData.get('city'),
      province: 'West Java', // You can make this dynamic
      postalCode: formData.get('postalCode') || '',
      notes: formData.get('notes') || ''
    };

    // Validate required fields
    if (!shippingData.name || !shippingData.phone || !shippingData.address || !shippingData.city) {
      alert('Harap lengkapi semua data pengiriman yang wajib diisi');
      setIsSubmittingOrder(false);
      return;
    }

    // Prepare order data
    const orderData = {
      resellerName: userProfile?.fullName || userProfile?.name || user.displayName || 'Unknown',
      resellerEmail: userProfile?.email || user.email || 'Unknown',
      resellerPhone: userProfile?.phoneNumber || userProfile?.phone || '',
      products: cart.map(item => ({
        id: item.id,
        name: item.name,
        brand: item.brand,
        category: item.category,
        price: item.price,
        retailPrice: item.retailPrice,
        quantity: item.quantity,
        commission: item.commission,
        image: item.image,
        subtotal: item.price * item.quantity,
        totalCommission: item.commission * item.quantity
      })),
      totalAmount: getCartTotal(),
      totalCommission: getTotalCommission(),
      shippingAddress: shippingData,
      paymentStatus: 'waiting_payment',
      status: 'pending'
    };

    console.log('Order data being sent:', orderData);

    // Create order
    const result = await createOrder(user.uid, orderData);
    
    if (result.success) {
      alert(`Pesanan berhasil dibuat!\nNomor Pesanan: ${result.orderNumber}`);
      
      // Clear cart and close modals
      clearCart();
      setShowCheckout(false);
      setShowCart(false);
      
      // Redirect to orders page or show success message
      // router.push('/reseller/orders');
      
    } else {
      throw new Error(result.error || 'Gagal membuat pesanan');
    }
    
  } catch (error) {
    console.error('Checkout error:', error);
    alert('Terjadi kesalahan saat checkout: ' + error.message);
  } finally {
    setIsSubmittingOrder(false);
  }
};

  if (loading || isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="alert alert-danger" role="alert">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
          <button 
            className="btn btn-outline-danger btn-sm ms-3"
            onClick={() => window.location.reload()}
          >
            Coba Lagi
          </button>
        </div>
      </div>
    )
  }

  const categories = [...new Set(products.map(product => product.category))].filter(Boolean)

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.brand.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  const availableProducts = products.filter(p => p.status === 'available').length
  const lowStockProducts = products.filter(p => p.status === 'low_stock').length
  const outOfStockProducts = products.filter(p => p.status === 'out_of_stock').length

  const resetFilters = () => {
    setSearchTerm('')
    setSelectedCategory('all')
  }

  const showProductDetails = (product) => {
    setSelectedProduct(product)
    setShowProductDetail(true)
  }

  return (
    <div className="container-fluid">
      <div className="row">
        <Sidebar />
        
        <main className="col-md-9 ms-sm-auto col-lg-10 px-md-4">
          <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
            <h1 className="h2">
              <i className="fas fa-book-open me-2 text-primary"></i>
              Katalog Harga Grosir
            </h1>
            <div className="btn-toolbar mb-2 mb-md-0">
              <button 
                className="btn btn-success position-relative me-2"
                onClick={() => setShowCart(true)}
              >
                <i className="fas fa-shopping-cart me-1"></i>
                Keranjang
                {getCartItemsCount() > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                    {getCartItemsCount()}
                  </span>
                )}
              </button>
              <span className="badge bg-info fs-6">
                <i className="fas fa-sync-alt me-1"></i>
                Real-time Updates
              </span>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="row mb-4">
            <div className="col-md-4 mb-3">
              <div className="card bg-success text-white">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <div>
                      <h6 className="card-title">Produk Tersedia</h6>
                      <h4>{availableProducts}</h4>
                    </div>
                    <i className="fas fa-check-circle fa-2x opacity-75"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-4 mb-3">
              <div className="card bg-warning text-dark">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <div>
                      <h6 className="card-title">Stok Terbatas</h6>
                      <h4>{lowStockProducts}</h4>
                    </div>
                    <i className="fas fa-exclamation-triangle fa-2x opacity-75"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-4 mb-3">
              <div className="card bg-danger text-white">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <div>
                      <h6 className="card-title">Stok Habis</h6>
                      <h4>{outOfStockProducts}</h4>
                    </div>
                    <i className="fas fa-times-circle fa-2x opacity-75"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row">
                <div className="col-md-5 mb-3">
                  <label className="form-label">Cari Produk</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="fas fa-search"></i>
                    </span>
                    <input 
                      type="text"
                      className="form-control"
                      placeholder="Cari produk atau brand..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label">Kategori</label>
                  <select 
                    className="form-select"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="all">Semua Kategori</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label">&nbsp;</label>
                  <button 
                    className="btn btn-outline-secondary w-100"
                    onClick={resetFilters}
                  >
                    <i className="fas fa-filter me-1"></i>
                    Reset Filter
                  </button>
                </div>
              </div>
              <div className="text-muted">
                Menampilkan {filteredProducts.length} dari {products.length} produk
              </div>
            </div>
          </div>

          {/* Products Grid */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-5">
              <i className="fas fa-search fa-3x text-muted mb-3"></i>
              <h5 className="text-muted">
                {products.length === 0 ? 'Belum ada produk tersedia' : 'Produk tidak ditemukan'}
              </h5>
              <p className="text-muted">
                {products.length === 0 
                  ? 'Admin belum menambahkan produk ke dalam sistem' 
                  : 'Coba ubah filter pencarian Anda'
                }
              </p>
            </div>
          ) : (
            <div className="row">
              {filteredProducts.map(product => {
                const cartItem = cart.find(item => item.id === product.id)
                
                return (
                  <div key={product.id} className="col-lg-4 col-md-6 mb-4">
                    <div className="card h-100 shadow border-0 product-card">
                      <div className="position-relative">
                        <img 
                          src={product.image} 
                          className="card-img-top product-image"
                          alt={product.name}
                          onError={(e) => {
                            e.target.src = '/images/default-product.jpg'
                          }}
                        />
                        <span className={`badge position-absolute top-0 end-0 m-2 ${
                          product.status === 'out_of_stock' ? 'bg-danger' :
                          product.status === 'low_stock' ? 'bg-warning text-dark' : 'bg-success'
                        }`}>
                          {product.status === 'out_of_stock' ? 'Habis' : 
                           product.status === 'low_stock' ? 'Stok Terbatas' : 'Tersedia'}
                        </span>
                        
                        {product.createdAt && 
                         new Date() - new Date(product.createdAt.seconds * 1000) < 7 * 24 * 60 * 60 * 1000 && (
                          <span className="badge bg-primary position-absolute top-0 start-0 m-2">
                            <i className="fas fa-star me-1"></i>
                            Baru
                          </span>
                        )}

                        {cartItem && (
                          <span className="badge bg-info position-absolute bottom-0 start-0 m-2">
                            <i className="fas fa-shopping-cart me-1"></i>
                            {cartItem.quantity}
                          </span>
                        )}
                      </div>
                      
                      <div className="card-body d-flex flex-column">
                        <div className="mb-2">
                          <span className="badge bg-light text-dark">{product.category}</span>
                          <span className="badge bg-secondary ms-1">{product.brand}</span>
                        </div>
                        
                        <h6 className="card-title fw-bold mb-3">{product.name}</h6>
                        
                        <div className="pricing-info mb-3">
                          <div className="row">
                            <div className="col-6">
                              <small className="text-muted">Harga Retail:</small>
                              <div className="text-decoration-line-through text-muted">
                                Rp {product.retailPrice.toLocaleString('id-ID')}
                              </div>
                            </div>
                            <div className="col-6">
                              <small className="text-muted">Harga Grosir:</small>
                              <div className="fw-bold text-success fs-6">
                                Rp {product.wholesalePrice.toLocaleString('id-ID')}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="commission-info mb-3">
                          <div className="d-flex justify-content-between">
                            <span className="text-muted">Komisi ({product.commission}%):</span>
                            <span className="fw-bold text-primary">
                              Rp {product.commissionAmount.toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>
                        
                        <div className="stock-info mb-3">
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <small className="text-muted">Stok: </small>
                              <span className={`fw-bold ${
                                product.stock === 0 ? 'text-danger' :
                                product.stock < 50 ? 'text-warning' : 'text-success'
                              }`}>
                                {product.stock} unit
                              </span>
                            </div>
                            {product.sold > 0 && (
                              <small className="text-muted">
                                <i className="fas fa-chart-line me-1"></i>
                                {product.sold} terjual
                              </small>
                            )}
                          </div>
                        </div>
                        
                        <div className="mt-auto">
                          <div className="d-flex gap-2 mb-2">
                            {cartItem ? (
                              <>
                                <div className="input-group flex-grow-1">
                                  <button 
                                    className="btn btn-outline-secondary btn-sm"
                                    onClick={() => updateCartQuantity(product.id, cartItem.quantity - 1)}
                                  >
                                    <i className="fas fa-minus"></i>
                                  </button>
                                  <input 
                                    type="number" 
                                    className="form-control form-control-sm text-center" 
                                    value={cartItem.quantity}
                                    min="1"
                                    max={product.stock}
                                    onChange={(e) => {
                                      const newQty = parseInt(e.target.value) || 1
                                      updateCartQuantity(product.id, newQty)
                                    }}
                                  />
                                  <button 
                                    className="btn btn-outline-secondary btn-sm"
                                    onClick={() => updateCartQuantity(product.id, cartItem.quantity + 1)}
                                    disabled={cartItem.quantity >= product.stock}
                                  >
                                    <i className="fas fa-plus"></i>
                                  </button>
                                </div>
                                <button 
                                  className="btn btn-danger btn-sm"
                                  onClick={() => removeFromCart(product.id)}
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </>
                            ) : (
                              <button 
                                className="btn btn-primary btn-sm flex-grow-1"
                                disabled={product.stock === 0}
                                onClick={() => addToCart(product)}
                              >
                                <i className="fas fa-cart-plus me-1"></i>
                                {product.stock === 0 ? 'Habis' : 'Keranjang'}
                              </button>
                            )}
                          </div>
                          <button 
                            className="btn btn-outline-info btn-sm w-100"
                            onClick={() => showProductDetails(product)}
                          >
                            <i className="fas fa-eye me-1"></i>
                            Detail
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

        </main>
      </div>

      {/* Shopping Cart Modal */}
      {showCart && (
        <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="fas fa-shopping-cart me-2"></i>
                  Keranjang Belanja ({getCartItemsCount()} item)
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white"
                  onClick={() => setShowCart(false)}
                ></button>
              </div>
              <div className="modal-body">
                {cart.length === 0 ? (
                  <div className="text-center py-4">
                    <i className="fas fa-shopping-cart fa-3x text-muted mb-3"></i>
                    <h5 className="text-muted">Keranjang kosong</h5>
                    <p className="text-muted">Tambahkan produk ke keranjang untuk melanjutkan</p>
                  </div>
                ) : (
                  <>
                    <div className="table-responsive">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Produk</th>
                            <th>Harga</th>
                            <th>Qty</th>
                            <th>Subtotal</th>
                            <th>Komisi</th>
                            <th>Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cart.map(item => (
                            <tr key={item.id}>
                              <td>
                                <div className="d-flex align-items-center">
                                  <img 
                                    src={item.image} 
                                    alt={item.name}
                                    className="me-2"
                                    style={{width: '50px', height: '50px', objectFit: 'cover'}}
                                  />
                                  <div>
                                    <div className="fw-bold">{item.name}</div>
                                    <small className="text-muted">{item.brand}</small>
                                  </div>
                                </div>
                              </td>
                              <td>Rp {item.price.toLocaleString('id-ID')}</td>
                              <td>
                                <div className="input-group" style={{width: '120px'}}>
                                  <button 
                                    className="btn btn-outline-secondary btn-sm"
                                    onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                                  >
                                    <i className="fas fa-minus"></i>
                                  </button>
                                  <input 
                                    type="number" 
                                    className="form-control form-control-sm text-center" 
                                    value={item.quantity}
                                    min="1"
                                    max={item.maxStock}
                                    onChange={(e) => {
                                      const newQty = parseInt(e.target.value) || 1
                                      updateCartQuantity(item.id, newQty)
                                    }}
                                  />
                                  <button 
                                    className="btn btn-outline-secondary btn-sm"
                                    onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                                    disabled={item.quantity >= item.maxStock}
                                  >
                                    <i className="fas fa-plus"></i>
                                  </button>
                                </div>
                              </td>
                              <td className="fw-bold">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</td>
                              <td className="text-success">Rp {(item.commission * item.quantity).toLocaleString('id-ID')}</td>
                              <td>
                                <button 
                                  className="btn btn-danger btn-sm"
                                  onClick={() => removeFromCart(item.id)}
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="border-top pt-3">
                      <div className="row">
                        <div className="col-md-6">
                          <div className="card bg-light">
                            <div className="card-body">
                              <h6>Ringkasan Pesanan</h6>
                              <div className="d-flex justify-content-between">
                                <span>Total Item:</span>
                                <span>{getCartItemsCount()} pcs</span>
                              </div>
                              <div className="d-flex justify-content-between">
                                <span>Total Harga:</span>
                                <span className="fw-bold">Rp {getCartTotal().toLocaleString('id-ID')}</span>
                              </div>
                              <div className="d-flex justify-content-between text-success">
                                <span>Total Komisi:</span>
                                <span className="fw-bold">Rp {getTotalCommission().toLocaleString('id-ID')}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="d-grid gap-2">
                            <button 
                              className="btn btn-success btn-lg"
                              onClick={() => {
                                setShowCart(false)
                                setShowCheckout(true)
                              }}
                            >
                              <i className="fas fa-credit-card me-2"></i>
                              Checkout
                            </button>
                            <button 
                              className="btn btn-outline-danger"
                              onClick={() => {if (confirm('Hapus semua item dari keranjang?')) {
                                clearCart()
                              }
                            }}
                          >
                            <i className="fas fa-trash me-1"></i>
                            Kosongkan Keranjang
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Checkout Modal */}
    {showCheckout && (
      <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header bg-success text-white">
              <h5 className="modal-title">
                <i className="fas fa-credit-card me-2"></i>
                Checkout Pesanan
              </h5>
              <button 
                type="button" 
                className="btn-close btn-close-white"
                onClick={() => setShowCheckout(false)}
              ></button>
            </div>
            <form onSubmit={handleCheckout}>
              <div className="modal-body">
                {/* Order Summary */}
                <div className="card mb-4">
                  <div className="card-header">
                    <h6 className="mb-0">Ringkasan Pesanan</h6>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-4">
                        <div className="text-center">
                          <h6 className="text-muted">Total Item</h6>
                          <h4 className="text-primary">{getCartItemsCount()}</h4>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="text-center">
                          <h6 className="text-muted">Total Pembelian</h6>
                          <h4 className="text-success">Rp {getCartTotal().toLocaleString('id-ID')}</h4>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="text-center">
                          <h6 className="text-muted">Total Komisi</h6>
                          <h4 className="text-warning">Rp {getTotalCommission().toLocaleString('id-ID')}</h4>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shipping Information */}
                <div className="card">
                  <div className="card-header">
                    <h6 className="mb-0">Data Pengiriman</h6>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Nama Penerima *</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          name="recipientName"
                          defaultValue={userProfile?.fullName || ''}
                          required 
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">No. Telepon *</label>
                        <input 
                          type="tel" 
                          className="form-control" 
                          name="phone"
                          defaultValue={userProfile?.phoneNumber || ''}
                          required 
                        />
                      </div>
                      <div className="col-12 mb-3">
                        <label className="form-label">Alamat Lengkap *</label>
                        <textarea 
                          className="form-control" 
                          rows="3"
                          name="address"
                          defaultValue={userProfile?.address || ''}
                          required
                        ></textarea>
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Kota *</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          name="city"
                          defaultValue={userProfile?.city || ''}
                          required 
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Kode Pos</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          name="postalCode"
                          defaultValue={userProfile?.postalCode || ''}
                        />
                      </div>
                      <div className="col-12 mb-3">
                        <label className="form-label">Catatan Tambahan</label>
                        <textarea 
                          className="form-control" 
                          rows="2"
                          name="notes"
                          placeholder="Catatan khusus untuk pesanan ini..."
                        ></textarea>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCheckout(false)}>
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="btn btn-success"
                  disabled={isSubmittingOrder}
                >
                  {isSubmittingOrder ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Memproses...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane me-2"></i>
                      Buat Pesanan
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )}

    {/* Product Detail Modal */}
    {showProductDetail && selectedProduct && (
      <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Detail Produk</h5>
              <button 
                type="button" 
                className="btn-close"
                onClick={() => setShowProductDetail(false)}
              ></button>
            </div>
            <div className="modal-body">
              <div className="row">
                <div className="col-md-5">
                  <img 
                    src={selectedProduct.image} 
                    className="img-fluid rounded"
                    alt={selectedProduct.name}
                    onError={(e) => {
                      e.target.src = '/images/default-product.jpg'
                    }}
                  />
                </div>
                <div className="col-md-7">
                  <div className="mb-3">
                    <span className="badge bg-light text-dark me-2">{selectedProduct.category}</span>
                    <span className="badge bg-secondary">{selectedProduct.brand}</span>
                  </div>
                  
                  <h4 className="mb-3">{selectedProduct.name}</h4>
                  
                  {selectedProduct.description && (
                    <div className="mb-3">
                      <h6>Deskripsi:</h6>
                      <p className="text-muted">{selectedProduct.description}</p>
                    </div>
                  )}
                  
                  <div className="row mb-3">
                    <div className="col-6">
                      <h6>Harga Retail:</h6>
                      <div className="text-decoration-line-through text-muted">
                        Rp {selectedProduct.retailPrice.toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div className="col-6">
                      <h6>Harga Grosir:</h6>
                      <div className="fw-bold text-success fs-5">
                        Rp {selectedProduct.wholesalePrice.toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <h6>Komisi ({selectedProduct.commission}%):</h6>
                    <div className="fw-bold text-primary fs-5">
                      Rp {selectedProduct.commissionAmount.toLocaleString('id-ID')}
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <h6>Stok:</h6>
                    <span className={`fw-bold fs-5 ${
                      selectedProduct.stock === 0 ? 'text-danger' :
                      selectedProduct.stock < 50 ? 'text-warning' : 'text-success'
                    }`}>
                      {selectedProduct.stock} unit
                    </span>
                  </div>
                  
                  {selectedProduct.expiryDate && (
                    <div className="mb-3">
                      <h6>Tanggal Kadaluarsa:</h6>
                      <span className="text-muted">
                        {new Date(selectedProduct.expiryDate.seconds * 1000).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                  )}
                  
                  {selectedProduct.sold > 0 && (
                    <div className="mb-3">
                      <h6>Penjualan:</h6>
                      <span className="text-muted">
                        <i className="fas fa-chart-line me-1"></i>
                        {selectedProduct.sold} terjual
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowProductDetail(false)}
              >
                Tutup
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                disabled={selectedProduct.stock === 0}
                onClick={() => {
                  addToCart(selectedProduct)
                  setShowProductDetail(false)
                }}
              >
                <i className="fas fa-cart-plus me-1"></i>
                {selectedProduct.stock === 0 ? 'Stok Habis' : 'Tambah ke Keranjang'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    <style jsx>{`
      .product-card {
        transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
      }
      
      .product-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0,0,0,0.1) !important;
      }
      
      .product-image {
        height: 200px;
        object-fit: cover;
        width: 100%;
      }
      
      .pricing-info {
        background-color: #f8f9fa;
        padding: 10px;
        border-radius: 8px;
      }
      
      .commission-info {
        background-color: #e3f2fd;
        padding: 8px;
        border-radius: 6px;
      }
      
      .toast {
        border-radius: 8px;
      }
      
      .badge {
        font-size: 0.75rem;
      }
      
      @media (max-width: 768px) {
        .col-lg-4 {
          margin-bottom: 1rem;
        }
        
        .product-image {
          height: 180px;
        }
      }
    `}</style>
  </div>
)
}