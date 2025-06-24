'use client'

import { useAuth } from '../../components/AuthProvider'
import Sidebar from '../../components/sidebar-reseller'
import { useState, useEffect } from 'react'
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  where,
  updateDoc,
  doc 
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { 
  createOrder, 
  updatePaymentProof, 
  getOrdersByReseller 
} from '../../lib/orders'
import { useRouter } from 'next/navigation'

export default function ResellerOrdersPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showConfirmDeliveryModal, setShowConfirmDeliveryModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Helper function to format shipping address
  const formatShippingAddress = (shippingAddress) => {
    if (!shippingAddress) return 'Alamat tidak tersedia'
    
    // If it's a string, return as is
    if (typeof shippingAddress === 'string') return shippingAddress
    
    // If it's an object, format it properly
    if (typeof shippingAddress === 'object') {
      const parts = []
      
      if (shippingAddress.address) parts.push(shippingAddress.address)
      if (shippingAddress.city) parts.push(shippingAddress.city)
      if (shippingAddress.postalCode) parts.push(shippingAddress.postalCode)
      
      return parts.length > 0 ? parts.join(', ') : 'Alamat tidak lengkap'
    }
    
    return 'Format alamat tidak valid'
  }

  // Helper function to get customer info
  const getCustomerInfo = (order) => {
    const customerName = order.customerName || 
                        (order.shippingAddress?.recipientName) || 
                        'Nama tidak tersedia'
    
    const customerPhone = order.customerPhone || 
                         (order.shippingAddress?.phone) || 
                         'No. telepon tidak tersedia'
    
    return { customerName, customerPhone }
  }

  // Set up real-time listener for user's orders - SIMPLIFIED QUERY
  useEffect(() => {
    if (!user || !user.uid) return;

    const ordersRef = collection(db, 'orders')
    // Simplified query - only filter by resellerId first
    const q = query(
      ordersRef, 
      where('resellerId', '==', user.uid)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = []
      snapshot.forEach((doc) => {
        ordersData.push({
          id: doc.id,
          ...doc.data()
        })
      })
      
      // Sort in memory instead of using orderBy in query
      ordersData.sort((a, b) => {
        const aDate = a.createdAt?.toDate?.() || new Date()
        const bDate = b.createdAt?.toDate?.() || new Date()
        return bDate - aDate // desc order
      })
      
      setOrders(ordersData)
    }, (error) => {
      console.error('Error listening to orders:', error)
      // Fallback: try to get orders without real-time updates
      getOrdersByReseller(user.uid).then(result => {
        if (result.success) {
          setOrders(result.orders)
        }
      })
    })

    return () => unsubscribe()
  }, [user])

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { class: 'bg-warning text-dark', text: 'Menunggu Konfirmasi' },
      approved: { class: 'bg-info', text: 'Dikonfirmasi' },
      ready_to_ship: { class: 'bg-primary', text: 'Siap Dikirim' },
      shipped: { class: 'bg-warning text-dark', text: 'Dikirim' },
      delivered: { class: 'bg-success', text: 'Diterima' },
      cancelled: { class: 'bg-danger', text: 'Dibatalkan' }
    }
    return statusConfig[status] || { class: 'bg-secondary', text: status }
  }

  const getPaymentBadge = (status) => {
    const statusConfig = {
      waiting_payment: { class: 'bg-danger', text: 'Belum Bayar' },
      waiting_verification: { class: 'bg-warning text-dark', text: 'Menunggu Verifikasi' },
      verified: { class: 'bg-success', text: 'Terverifikasi' },
      rejected: { class: 'bg-danger', text: 'Ditolak' },
      cod: { class: 'bg-success', text: 'COD' }
    }
    return statusConfig[status] || { class: 'bg-secondary', text: status }
  }

  const filteredOrders = orders.filter(order => 
    statusFilter === 'all' || order.status === statusFilter
  )

  const handleGoToCatalog = () => {
    router.push('/reseller/catalog')
  }

  const handlePayment = (order) => {
    setSelectedOrder(order)
    setShowPaymentModal(true)
  }

  const handleViewDetail = (order) => {
    setSelectedOrder(order)
    setShowDetailModal(true)
  }

  const handleConfirmDelivery = (order) => {
    setSelectedOrder(order)
    setShowConfirmDeliveryModal(true)
  }

  const handleSubmitDeliveryConfirmation = async (e) => {
    e.preventDefault()
    if (isSubmitting) return

    const notes = e.target.deliveryNotes?.value || ''

    setIsSubmitting(true)

    try {
      const orderRef = doc(db, 'orders', selectedOrder.id)
      await updateDoc(orderRef, {
        status: 'delivered',
        deliveredAt: new Date(),
        deliveryConfirmationNotes: notes,
        deliveryConfirmedBy: user.uid,
        updatedAt: new Date()
      })

      setShowConfirmDeliveryModal(false)
      setSelectedOrder(null)
      alert('Konfirmasi penerimaan pesanan berhasil! Admin telah mendapat notifikasi.')
    } catch (error) {
      console.error('Error confirming delivery:', error)
      alert('Gagal mengkonfirmasi penerimaan pesanan. Silakan coba lagi.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitPayment = async (e) => {
    e.preventDefault()
    if (isSubmitting) return

    const paymentMethod = e.target.paymentMethod.value
    
    if (!paymentMethod) {
      alert('Pilih metode pembayaran!')
      return
    }

    setIsSubmitting(true)

    try {
      // Handle COD payment differently
      if (paymentMethod === 'COD') {
        // Update order to COD status
        const orderRef = doc(db, 'orders', selectedOrder.id)
        await updateDoc(orderRef, {
          paymentMethod: 'COD',
          paymentStatus: 'cod',
          updatedAt: new Date()
        })

        setShowPaymentModal(false)
        setSelectedOrder(null)
        alert('Pembayaran COD berhasil dipilih! Pesanan akan diproses.')
      } else {
        // Handle transfer/e-wallet payment
        const paymentProof = e.target.paymentProof.files[0]
        
        if (!paymentProof) {
          alert('Upload bukti pembayaran!')
          return
        }

        // Update payment proof in Firebase
        const result = await updatePaymentProof(
          selectedOrder.id,
          paymentMethod,
          paymentProof.name,
          '' // paymentProofURL - you can implement file upload to Firebase Storage later
        )

        if (result.success) {
          setShowPaymentModal(false)
          setSelectedOrder(null)
          alert('Bukti pembayaran berhasil dikirim! Admin akan memverifikasi pembayaran Anda dalam 1x24 jam.')
        } else {
          throw new Error(result.error)
        }
      }
    } catch (error) {
      console.error('Error updating payment:', error)
      alert('Gagal memproses pembayaran. Silakan coba lagi.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const unpaidOrders = orders.filter(o => o.paymentStatus === 'waiting_payment').length
  const waitingVerification = orders.filter(o => o.paymentStatus === 'waiting_verification').length
  const shippedOrders = orders.filter(o => o.status === 'shipped').length

  return (
    <div className="container-fluid">
      <div className="row">
        <Sidebar />
        
        <main className="col-md-9 ms-sm-auto col-lg-10 px-md-4">
          <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
            <h1 className="h2">
              <i className="fas fa-shopping-cart me-2 text-primary"></i>
              Pesanan Saya
            </h1>
            <div className="btn-toolbar mb-2 mb-md-0">
              <button 
                className="btn btn-primary"
                onClick={handleGoToCatalog}
                disabled={isSubmitting}
              >
                <i className="fas fa-plus me-1"></i>
                Buat Pesanan Baru
              </button>
            </div>
          </div>

          {/* Notification for unpaid orders */}
          {unpaidOrders > 0 && (
            <div className="alert alert-warning" role="alert">
              <i className="fas fa-exclamation-triangle me-2"></i>
              Anda memiliki <strong>{unpaidOrders}</strong> pesanan yang belum dibayar. Silakan lakukan pembayaran untuk melanjutkan proses.
            </div>
          )}

          {/* Notification for shipped orders */}
          {shippedOrders > 0 && (
            <div className="alert alert-info" role="alert">
              <i className="fas fa-truck me-2"></i>
              Anda memiliki <strong>{shippedOrders}</strong> pesanan yang sudah dikirim. Jangan lupa konfirmasi penerimaan setelah barang sampai.
            </div>
          )}

          {/* Stats Cards */}
          <div className="row mb-4">
            <div className="col-md-6 col-lg-3 mb-3">
              <div className="card text-center bg-warning text-white">
                <div className="card-body">
                  <i className="fas fa-clock fa-2x mb-2"></i>
                  <h4>{orders.filter(o => o.status === 'pending').length}</h4>
                  <small>Menunggu Konfirmasi</small>
                </div>
              </div>
            </div>
            <div className="col-md-6 col-lg-3 mb-3">
              <div className="card text-center bg-danger text-white">
                <div className="card-body">
                  <i className="fas fa-credit-card fa-2x mb-2"></i>
                  <h4>{unpaidOrders}</h4>
                  <small>Belum Bayar</small>
                </div>
              </div>
            </div>
            <div className="col-md-6 col-lg-3 mb-3">
              <div className="card text-center bg-info text-white">
                <div className="card-body">
                  <i className="fas fa-eye fa-2x mb-2"></i>
                  <h4>{waitingVerification}</h4>
                  <small>Menunggu Verifikasi</small>
                </div>
              </div>
            </div>
            <div className="col-md-6 col-lg-3 mb-3">
              <div className="card text-center bg-primary text-white">
                <div className="card-body">
                  <i className="fas fa-truck fa-2x mb-2"></i>
                  <h4>{orders.filter(o => o.status === 'ready_to_ship').length}</h4>
                  <small>Siap Dikirim</small>
                </div>
              </div>
            </div>
          </div>

          {/* Filter */}
          <div className="row mb-3">
            <div className="col-md-4">
              <select 
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Semua Status</option>
                <option value="pending">Menunggu Konfirmasi</option>
                <option value="approved">Dikonfirmasi</option>
                <option value="ready_to_ship">Siap Dikirim</option>
                <option value="shipped">Dikirim</option>
                <option value="delivered">Diterima</option>
              </select>
            </div>
          </div>

          {/* Orders Table */}
          <div className="card shadow">
            <div className="card-body">
              {orders.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-shopping-cart fa-3x text-muted mb-3"></i>
                  <h5 className="text-muted">Belum ada pesanan</h5>
                  <p className="text-muted">Buat pesanan pertama Anda dengan mengunjungi katalog produk</p>
                  <button 
                    className="btn btn-primary mt-3"
                    onClick={handleGoToCatalog}
                  >
                    <i className="fas fa-shopping-bag me-2"></i>
                    Lihat Katalog Produk
                  </button>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-bordered">
                    <thead className="table-light">
                      <tr>
                        <th>ID Pesanan</th>
                        <th>Tanggal</th>
                        <th>Produk</th>
                        <th>Total</th>
                        <th>Status Pesanan</th>
                        <th>Status Bayar</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order) => {
                        const statusBadge = getStatusBadge(order.status);
                        const paymentBadge = getPaymentBadge(order.paymentStatus);
                        
                        return (
                          <tr key={order.id}>
                            <td><strong>#{order.orderNumber || order.id.slice(-6).toUpperCase()}</strong></td>
                            <td>
                              {order.createdAt?.toDate 
                                ? order.createdAt.toDate().toLocaleDateString('id-ID')
                                : new Date().toLocaleDateString('id-ID')
                              }
                            </td>
                            <td>
                              {(order.products || []).map((product, idx) => (
                                <div key={idx} className="mb-1">
                                  <small>
                                    <strong>{product.name}</strong><br/>
                                    Qty: {product.qty} × Rp {(product.price || 0).toLocaleString('id-ID')}
                                  </small>
                                </div>
                              ))}
                            </td>
                            <td><strong className="text-success">Rp {(order.totalAmount || 0).toLocaleString('id-ID')}</strong></td>
                            <td>
                              <span className={`badge ${statusBadge.class}`}>
                                {statusBadge.text}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${paymentBadge.class}`}>
                                {paymentBadge.text}
                              </span>
                              {order.paymentMethod && (
                                <small className="d-block text-muted mt-1">
                                  via {order.paymentMethod}
                                </small>
                              )}
                            </td>
                            <td>
                              <div className="btn-group-vertical btn-group-sm">
                                {/* Payment button for unpaid orders */}
                                {order.paymentStatus === 'waiting_payment' && (
                                  <button 
                                    className="btn btn-success btn-sm mb-1"
                                    onClick={() => handlePayment(order)}
                                    disabled={isSubmitting}
                                  >
                                    <i className="fas fa-credit-card me-1"></i>Bayar
                                  </button>
                                )}

                                {/* Confirm delivery button for shipped orders */}
                                {order.status === 'shipped' && (
                                  <button 
                                    className="btn btn-warning btn-sm mb-1"
                                    onClick={() => handleConfirmDelivery(order)}
                                    disabled={isSubmitting}
                                  >
                                    <i className="fas fa-check-circle me-1"></i>Konfirmasi Diterima
                                  </button>
                                )}
                                
                                {/* Show admin message if exists */}
                                {order.adminMessage && (
                                  <button 
                                    className="btn btn-info btn-sm mb-1"
                                    onClick={() => alert(order.adminMessage)}
                                  >
                                    <i className="fas fa-comment me-1"></i>Pesan Admin
                                  </button>
                                )}
                                
                                <button 
                                  className="btn btn-outline-primary btn-sm"
                                  onClick={() => handleViewDetail(order)}
                                >
                                  <i className="fas fa-eye me-1"></i>Detail
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Delivery Confirmation Modal */}
          {showConfirmDeliveryModal && selectedOrder && (
            <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header bg-success text-white">
                    <h5 className="modal-title">
                      <i className="fas fa-check-circle me-2"></i>
                      Konfirmasi Penerimaan Pesanan
                    </h5>
                    <button 
                      type="button" 
                      className="btn-close btn-close-white"
                      onClick={() => setShowConfirmDeliveryModal(false)}
                      disabled={isSubmitting}
                    ></button>
                  </div>
                  <form onSubmit={handleSubmitDeliveryConfirmation}>
                    <div className="modal-body">
                      <div className="alert alert-info">
                        <i className="fas fa-info-circle me-2"></i>
                        <strong>Konfirmasi bahwa Anda telah menerima pesanan berikut:</strong>
                      </div>
                      
                      <div className="card mb-3">
                        <div className="card-body">
                          <h6>Pesanan #{selectedOrder.orderNumber || selectedOrder.id.slice(-6).toUpperCase()}</h6>
                          <p className="mb-1"><strong>Total:</strong> Rp {(selectedOrder.totalAmount || 0).toLocaleString('id-ID')}</p>
                          <p className="mb-1"><strong>Tanggal Dikirim:</strong> {
                            selectedOrder.shippedAt?.toDate 
                              ? selectedOrder.shippedAt.toDate().toLocaleDateString('id-ID')
                              : 'Tanggal tidak tersedia'
                          }</p>
                          {selectedOrder.trackingNumber && (
                            <p className="mb-0"><strong>No. Resi:</strong> {selectedOrder.trackingNumber}</p>
                          )}
                        </div>
                      </div>

                      <div className="mb-3">
                        <label className="form-label">Catatan (Opsional)</label>
                        <textarea 
                          className="form-control" 
                          name="deliveryNotes"
                          rows="3"
                          placeholder="Berikan catatan jika ada keterangan tambahan tentang kondisi barang yang diterima..."
                          disabled={isSubmitting}
                        ></textarea>
                      </div>

                      <div className="alert alert-warning">
                        <i className="fas fa-exclamation-triangle me-2"></i>
                        <small>
                          Dengan mengkonfirmasi penerimaan ini, Anda menyatakan bahwa pesanan telah diterima dengan baik. 
                          Admin akan mendapat notifikasi dan pesanan akan ditandai sebagai selesai.
                        </small>
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={() => setShowConfirmDeliveryModal(false)}
                        disabled={isSubmitting}
                      >
                        Batal
                      </button>
                      <button 
                        type="submit" 
                        className="btn btn-success"
                        disabled={isSubmitting}
                      >
                        <i className="fas fa-check me-1"></i>
                        {isSubmitting ? 'Memproses...' : 'Konfirmasi Diterima'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Payment Modal */}
          {showPaymentModal && selectedOrder && (
            <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
              <div className="modal-dialog modal-lg">
                <div className="modal-content">
                  <div className="modal-header bg-success text-white">
                    <h5 className="modal-title">
                      <i className="fas fa-credit-card me-2"></i>
                      Pembayaran Pesanan - #{selectedOrder.orderNumber || selectedOrder.id.slice(-6).toUpperCase()}
                    </h5>
                    <button 
                      type="button" 
                      className="btn-close btn-close-white"
                      onClick={() => setShowPaymentModal(false)}
                      disabled={isSubmitting}
                    ></button>
                  </div>
                  <form onSubmit={handleSubmitPayment}>
                    <div className="modal-body">
                      {/* Order Summary */}
                      <div className="card mb-4">
                        <div className="card-header bg-light">
                          <h6 className="mb-0">Ringkasan Pesanan</h6>
                        </div>
                        <div className="card-body">
                          <div className="row">
                            <div className="col-md-6">
                              <table className="table table-sm">
                                <tbody>
                                  <tr><td>ID Pesanan:</td><td><strong>#{selectedOrder.orderNumber || selectedOrder.id.slice(-6).toUpperCase()}</strong></td></tr>
                                  <tr><td>Tanggal:</td><td>
                                    {selectedOrder.createdAt?.toDate 
                                      ? selectedOrder.createdAt.toDate().toLocaleDateString('id-ID')
                                      : new Date().toLocaleDateString('id-ID')
                                    }
                                  </td></tr>
                                  <tr><td>Total Bayar:</td><td><strong className="text-success">Rp {(selectedOrder.totalAmount || 0).toLocaleString('id-ID')}</strong></td></tr>
                                </tbody>
                              </table>
                            </div>
                            <div className="col-md-6">
                              <h6>Produk:</h6>
                              <ul className="list-unstyled">
                                {(selectedOrder.products || []).map((product, idx) => (
                                  <li key={idx} className="mb-1">
                                    <small>
                                      <strong>{product.name}</strong><br/>
                                      {product.qty} × Rp {(product.price || 0).toLocaleString('id-ID')} = 
                                      <span className="text-success"> Rp {((product.qty || 0) * (product.price || 0)).toLocaleString('id-ID')}</span>
                                    </small>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Payment Method Selection */}
                      <div className="mb-3">
                        <label className="form-label">Pilih Metode Pembayaran *</label>
                        <select 
                          className="form-select" 
                          name="paymentMethod" 
                          required
                          disabled={isSubmitting}
                          onChange={(e) => {
                            const codSection = document.getElementById('cod-info')
                            const transferSection = document.getElementById('transfer-info')
                            const proofSection = document.getElementById('proof-section')
                            
                            if (e.target.value === 'COD') {
                              codSection.style.display = 'block'
                              transferSection.style.display = 'none'
                              proofSection.style.display = 'none'
                            } else if (e.target.value) {
                              codSection.style.display = 'none'
                              transferSection.style.display = 'block'
                              proofSection.style.display = 'block'
                            } else {
                              codSection.style.display = 'none'
                              transferSection.style.display = 'none'
                              proofSection.style.display = 'none'
                            }
                          }}
                        >
                          <option value="">Pilih Metode Pembayaran</option>
                          <option value="COD">COD (Bayar di Tempat)</option>
                          <option value="Transfer Bank">Transfer Bank</option>
                          <option value="E-Wallet">E-Wallet</option>
                        </select>
                      </div>

                      {/* COD Information */}
                      <div id="cod-info" className="card mb-4" style={{display: 'none'}}>
                        <div className="card-header bg-success text-white">
                          <h6 className="mb-0">
                            <i className="fas fa-truck me-2"></i>
                            Informasi COD (Cash on Delivery)
                          </h6>
                        </div>
                        <div className="card-body">
                          <div className="alert alert-success">
                            <i className="fas fa-info-circle me-2"></i>
                            <strong>Pembayaran COD:</strong>
                            <ul className="mb-0 mt-2">
                              <li>Anda akan membayar saat barang sampai di tempat</li>
                              <li>Pastikan Anda siap dengan uang tunai sejumlah <strong>Rp {(selectedOrder.totalAmount || 0).toLocaleString('id-ID')}</strong></li>
                              <li>Kurir akan menghubungi Anda sebelum pengiriman</li>
                              <li>Tidak ada biaya tambahan untuk COD</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Transfer Information */}
                      <div id="transfer-info" className="card mb-4" style={{display: 'none'}}>
                        <div className="card-header bg-info text-white">
                          <h6 className="mb-0">Informasi Pembayaran Transfer</h6>
                        </div>
                        <div className="card-body">
                          <div className="alert alert-info">
                            <h6><i className="fas fa-university me-2"></i>Transfer Bank</h6>
                            <p className="mb-1"><strong>Bank BCA</strong></p>
                            <p className="mb-1">No. Rekening: <strong>1234567890</strong></p>
                            <p className="mb-1">Atas Nama: <strong>CV. Beauty Care Indonesia</strong></p>
                            <p className="mb-0">Jumlah: <strong className="text-danger">Rp {(selectedOrder.totalAmount || 0).toLocaleString('id-ID')}</strong></p>
                          </div>
                          
                          <div className="alert alert-warning">
                            <h6><i className="fas fa-wallet me-2"></i>E-Wallet</h6>
                            <p className="mb-1"><strong>OVO / DANA / GoPay</strong></p>
                            <p className="mb-1">No. HP: <strong>081234567890</strong></p>
                            <p className="mb-0">Atas Nama: <strong>Beauty Care Indonesia</strong></p>
                          </div>
                        </div>
                      </div>

                      {/* Payment Proof Upload */}
                      <div id="proof-section" className="mb-3" style={{display: 'none'}}>
                        <label className="form-label">Upload Bukti Pembayaran *</label>
                        <input 
                          type="file" 
                          className="form-control" 
                          name="paymentProof"
                          accept="image/*"
                          disabled={isSubmitting}
                        />
                        <div className="form-text">
                          Upload foto bukti transfer/pembayaran (format: JPG, PNG, max 5MB)
                        </div>
                      </div>

                      <div className="alert alert-info">
                        <i className="fas fa-info-circle me-2"></i>
                        <small>
                          Setelah upload bukti pembayaran, admin akan memverifikasi dalam waktu 1x24 jam. 
                          Anda akan mendapat notifikasi melalui dashboard ini.
                        </small>
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={() => setShowPaymentModal(false)}
                        disabled={isSubmitting}
                      >
                        Batal
                      </button>
                      <button 
                        type="submit" 
                        className="btn btn-success"
                        disabled={isSubmitting}
                      >
                        <i className="fas fa-check me-1"></i>
                        {isSubmitting ? 'Memproses...' : 'Konfirmasi Pembayaran'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Detail Modal */}
          {showDetailModal && selectedOrder && (
            <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
              <div className="modal-dialog modal-xl">
                <div className="modal-content">
                  <div className="modal-header bg-primary text-white">
                    <h5 className="modal-title">
                      <i className="fas fa-file-alt me-2"></i>
                      Detail Pesanan - #{selectedOrder.orderNumber || selectedOrder.id.slice(-6).toUpperCase()}
                    </h5>
                    <button 
                      type="button" 
                      className="btn-close btn-close-white"
                      onClick={() => setShowDetailModal(false)}
                    ></button>
                  </div>
                  <div className="modal-body">
                    <div className="row">
                      {/* Order Information */}
                      <div className="col-md-6 mb-4">
                        <div className="card h-100">
                          <div className="card-header bg-light">
                            <h6 className="mb-0">
                              <i className="fas fa-info-circle me-2"></i>
                              Informasi Pesanan
                            </h6>
                          </div>
                          <div className="card-body">
                            <table className="table table-sm">
                              <tbody>
                                <tr>
                                  <td>ID Pesanan:</td>
                                  <td><strong>#{selectedOrder.orderNumber || selectedOrder.id.slice(-6).toUpperCase()}</strong></td>
                                </tr>
                                <tr>
                                  <td>Tanggal Pesan:</td>
                                  <td>
                                    {selectedOrder.createdAt?.toDate 
                                      ? selectedOrder.createdAt.toDate().toLocaleDateString('id-ID', {
                                          year: 'numeric',
                                          month: 'long',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })
                                      : 'Tanggal tidak tersedia'
                                    }
                                  </td>
                                </tr>
                                <tr>
                                  <td>Status Pesanan:</td>
                                  <td>
                                    <span className={`badge ${getStatusBadge(selectedOrder.status).class}`}>
                                      {getStatusBadge(selectedOrder.status).text}
                                    </span>
                                  </td>
                                </tr>
                                <tr>
                                  <td>Status Pembayaran:</td>
                                  <td>
                                    <span className={`badge ${getPaymentBadge(selectedOrder.paymentStatus).class}`}>
                                      {getPaymentBadge(selectedOrder.paymentStatus).text}
                                    </span>
                                    {selectedOrder.paymentMethod && (
                                      <small className="d-block text-muted mt-1">
                                        via {selectedOrder.paymentMethod}
                                      </small>
                                    )}
                                  </td>
                                </tr>
                                <tr>
                                  <td>Total Pembayaran:</td>
                                  <td><strong className="text-success">Rp {(selectedOrder.totalAmount || 0).toLocaleString('id-ID')}</strong></td>
                                </tr>
                                {selectedOrder.trackingNumber && (
                                  <tr>
                                    <td>No. Resi:</td>
                                    <td><strong>{selectedOrder.trackingNumber}</strong></td>
                                  </tr>
                                )}
                                {selectedOrder.shippedAt && (
                                  <tr>
                                    <td>Tanggal Kirim:</td>
                                    <td>
                                      {selectedOrder.shippedAt.toDate().toLocaleDateString('id-ID', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                      })}
                                    </td>
                                  </tr>
                                )}
                                {selectedOrder.deliveredAt && (
                                  <tr>
                                    <td>Tanggal Diterima:</td>
                                    <td>
                                      {selectedOrder.deliveredAt.toDate().toLocaleDateString('id-ID', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                      })}
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* Customer Information */}
                      <div className="col-md-6 mb-4">
                        <div className="card h-100">
                          <div className="card-header bg-light">
                            <h6 className="mb-0">
                              <i className="fas fa-user me-2"></i>
                              Informasi Pengiriman
                            </h6>
                          </div>
                          <div className="card-body">
                            {(() => {
                              const { customerName, customerPhone } = getCustomerInfo(selectedOrder);
                              return (
                                <table className="table table-sm">
                                  <tbody>
                                    <tr>
                                      <td>Nama Penerima:</td>
                                      <td><strong>{customerName}</strong></td>
                                    </tr>
                                    <tr>
                                      <td>No. Telepon:</td>
                                      <td>{customerPhone}</td>
                                    </tr>
                                    <tr>
                                      <td>Alamat Pengiriman:</td>
                                      <td>{formatShippingAddress(selectedOrder.shippingAddress)}</td>
                                    </tr>
                                    {selectedOrder.shippingNotes && (
                                      <tr>
                                        <td>Catatan Pengiriman:</td>
                                        <td><em>{selectedOrder.shippingNotes}</em></td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Products Details */}
                    <div className="card mb-4">
                      <div className="card-header bg-light">
                        <h6 className="mb-0">
                          <i className="fas fa-box me-2"></i>
                          Detail Produk
                        </h6>
                      </div>
                      <div className="card-body">
                        <div className="table-responsive">
                          <table className="table table-bordered">
                            <thead className="table-light">
                              <tr>
                                <th>Produk</th>
                                <th>Harga Satuan</th>
                                <th>Jumlah</th>
                                <th>Subtotal</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(selectedOrder.products || []).map((product, idx) => (
                                <tr key={idx}>
                                  <td>
                                    <strong>{product.name}</strong>
                                    {product.variant && (
                                      <>
                                        <br />
                                        <small className="text-muted">Varian: {product.variant}</small>
                                      </>
                                    )}
                                  </td>
                                  <td>Rp {(product.price || 0).toLocaleString('id-ID')}</td>
                                  <td>{product.qty}</td>
                                  <td>
                                    <strong>
                                      Rp {((product.qty || 0) * (product.price || 0)).toLocaleString('id-ID')}
                                    </strong>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="table-light">
                              <tr>
                                <th colSpan="3" className="text-end">Total Pesanan:</th>
                                <th className="text-success">Rp {(selectedOrder.totalAmount || 0).toLocaleString('id-ID')}</th>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Admin Messages */}
                    {selectedOrder.adminMessage && (
                      <div className="card mb-4">
                        <div className="card-header bg-info text-white">
                          <h6 className="mb-0">
                            <i className="fas fa-comment me-2"></i>
                            Pesan dari Admin
                          </h6>
                        </div>
                        <div className="card-body">
                          <p className="mb-0">{selectedOrder.adminMessage}</p>
                        </div>
                      </div>
                    )}

                    {/* Delivery Notes */}
                    {selectedOrder.deliveryConfirmationNotes && (
                      <div className="card mb-4">
                        <div className="card-header bg-success text-white">
                          <h6 className="mb-0">
                            <i className="fas fa-sticky-note me-2"></i>
                            Catatan Penerimaan
                          </h6>
                        </div>
                        <div className="card-body">
                          <p className="mb-0">{selectedOrder.deliveryConfirmationNotes}</p>
                        </div>
                      </div>
                    )}

                    {/* Order Timeline */}
                    <div className="card">
                      <div className="card-header bg-light">
                        <h6 className="mb-0">
                          <i className="fas fa-history me-2"></i>
                          Timeline Pesanan
                        </h6>
                      </div>
                      <div className="card-body">
                        <div className="timeline">
                          <div className="timeline-item active">
                            <div className="timeline-marker bg-success"></div>
                            <div className="timeline-content">
                              <h6 className="timeline-title">Pesanan Dibuat</h6>
                              <p className="timeline-description">
                                {selectedOrder.createdAt?.toDate 
                                  ? selectedOrder.createdAt.toDate().toLocaleString('id-ID')
                                  : 'Tanggal tidak tersedia'
                                }
                              </p>
                            </div>
                          </div>

                          {selectedOrder.status !== 'pending' && (
                            <div className="timeline-item active">
                              <div className="timeline-marker bg-info"></div>
                              <div className="timeline-content">
                                <h6 className="timeline-title">Pesanan Dikonfirmasi</h6>
                                <p className="timeline-description">
                                  {selectedOrder.approvedAt?.toDate 
                                    ? selectedOrder.approvedAt.toDate().toLocaleString('id-ID')
                                    : 'Admin telah mengkonfirmasi pesanan'
                                  }
                                </p>
                              </div>
                            </div>
                          )}

                          {selectedOrder.paymentStatus === 'verified' && (
                            <div className="timeline-item active">
                              <div className="timeline-marker bg-primary"></div>
                              <div className="timeline-content">
                                <h6 className="timeline-title">Pembayaran Terverifikasi</h6>
                                <p className="timeline-description">
                                  {selectedOrder.paymentVerifiedAt?.toDate 
                                    ? selectedOrder.paymentVerifiedAt.toDate().toLocaleString('id-ID')
                                    : 'Pembayaran telah diverifikasi admin'
                                  }
                                </p>
                              </div>
                            </div>
                          )}

                          {selectedOrder.status === 'ready_to_ship' && (
                            <div className="timeline-item active">
                              <div className="timeline-marker bg-warning"></div>
                              <div className="timeline-content">
                                <h6 className="timeline-title">Siap Dikirim</h6>
                                <p className="timeline-description">Pesanan sedang dipersiapkan untuk pengiriman</p>
                              </div>
                            </div>
                          )}

                          {selectedOrder.shippedAt && (
                            <div className="timeline-item active">
                              <div className="timeline-marker bg-info"></div>
                              <div className="timeline-content">
                                <h6 className="timeline-title">Pesanan Dikirim</h6>
                                <p className="timeline-description">
                                  {selectedOrder.shippedAt.toDate().toLocaleString('id-ID')}
                                  {selectedOrder.trackingNumber && (
                                    <><br/>No. Resi: <strong>{selectedOrder.trackingNumber}</strong></>
                                  )}
                                </p>
                              </div>
                            </div>
                          )}

                          {selectedOrder.deliveredAt && (
                            <div className="timeline-item active">
                              <div className="timeline-marker bg-success"></div>
                              <div className="timeline-content">
                                <h6 className="timeline-title">Pesanan Diterima</h6>
                                <p className="timeline-description">
                                  {selectedOrder.deliveredAt.toDate().toLocaleString('id-ID')}
                                  <br/><em>Pesanan telah selesai</em>
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={() => setShowDetailModal(false)}
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      
      <style jsx>{`
        .timeline {
          position: relative;
          padding-left: 30px;
        }
        
        .timeline:before {
          content: '';
          position: absolute;
          left: 15px;
          top: 0;
          bottom: 0;
          width: 2px;
          background: #e9ecef;
        }
        
        .timeline-item {
          position: relative;
          margin-bottom: 25px;
        }
        
        .timeline-marker {
          position: absolute;
          left: -23px;
          top: 5px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 3px solid #fff;
          box-shadow: 0 0 0 2px #e9ecef;
        }
        
        .timeline-item.active .timeline-marker {
          box-shadow: 0 0 0 2px #007bff;
        }
        
        .timeline-title {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 5px;
        }
        
        .timeline-description {
          font-size: 13px;
          color: #6c757d;
          margin-bottom: 0;
        }
        
        .btn-group-vertical .btn {
          border-radius: 0.25rem !important;
          margin-bottom: 2px;
        }
        
        .btn-group-vertical .btn:last-child {
          margin-bottom: 0;
        }
        
        .table th {
          font-weight: 600;
          font-size: 13px;
        }
        
        .table td {
          font-size: 13px;
        }
        
        .card-header h6 {
          font-weight: 600;
        }
        
        .badge {
          font-size: 11px;
        }
        
        .alert {
          font-size: 13px;
        }
        
        .text-success {
          color: #198754 !important;
        }
        
        .bg-primary {
          background-color: #0d6efd !important;
        }
        
        .bg-success {
          background-color: #198754 !important;
        }
        
        .bg-warning {
          background-color: #ffc107 !important;
        }
        
        .bg-danger {
          background-color: #dc3545 !important;
        }
        
        .bg-info {
          background-color: #0dcaf0 !important;
        }
      `}</style>
    </div>
  )
}