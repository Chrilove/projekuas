'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { getAllOrders, updateOrderStatus, updatePaymentStatus } from '../../lib/orders';
import { formatCurrency } from '../../lib/payments';
import Sidebar from '../../components/Sidebar';

export default function AdminOrdersPage() {
  const router = useRouter();
  const [user, loading, error] = useAuthState(auth);
  const [userRole, setUserRole] = useState(null);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

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

  useEffect(() => {
    if (userRole === 'admin') {
      loadOrders();
    }
  }, [userRole]);

  // Reset ke halaman pertama saat filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm]);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const result = await getAllOrders();
      if (result.success) {
        setOrders(result.orders);
      } else {
        console.error('Error loading orders:', result.error);
        alert('Error loading orders: ' + result.error);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      alert('Error loading orders');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter dan search orders
  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesSearch = searchTerm === '' || 
      order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.resellerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.resellerEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentOrders = filteredOrders.slice(startIndex, endIndex);

  // Generate pagination buttons
  const getPaginationButtons = () => {
    const buttons = [];
    const maxButtons = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    
    if (endPage - startPage + 1 < maxButtons) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(i);
    }
    
    return buttons;
  };

  const getStatusCounts = () => {
    const counts = {
      pending: 0,
      waiting_verification: 0,
      confirmed: 0,
      shipped: 0,
      delivered: 0,
      completed: 0
    };

    orders.forEach(order => {
      if (order.status === 'pending') counts.pending++;
      if (order.paymentStatus === 'waiting_verification') counts.waiting_verification++;
      if (order.status === 'confirmed') counts.confirmed++;
      if (order.status === 'shipped') counts.shipped++;
      if (order.status === 'delivered') counts.delivered++;
      if (order.status === 'completed') counts.completed++;
    });

    return counts;
  };

  const statusCounts = getStatusCounts();

  const handleStatusUpdate = async (orderId, newStatus, adminMessage = '') => {
    try {
      const result = await updateOrderStatus(orderId, newStatus, adminMessage);
      if (result.success) {
        await loadOrders();
        setShowModal(false);
        alert('Status berhasil diupdate!');
      } else {
        alert('Error updating status: ' + result.error);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status: ' + error.message);
    }
  };

  const handlePaymentUpdate = async (orderId, paymentStatus, orderStatus = null, adminMessage = '') => {
    try {
      const result = await updatePaymentStatus(orderId, paymentStatus, orderStatus, adminMessage);
      if (result.success) {
        await loadOrders();
        setShowModal(false);
        alert('Status pembayaran berhasil diupdate!');
      } else {
        alert('Error updating payment: ' + result.error);
      }
    } catch (error) {
      console.error('Error updating payment:', error);
      alert('Error updating payment: ' + error.message);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending': return 'badge bg-warning text-dark';
      case 'confirmed': return 'badge bg-info';
      case 'shipped': return 'badge bg-primary';
      case 'delivered': return 'badge bg-success';
      case 'completed': return 'badge bg-success';
      case 'cancelled': return 'badge bg-danger';
      default: return 'badge bg-secondary';
    }
  };

  const getPaymentBadgeClass = (status) => {
    switch (status) {
      case 'waiting_payment': return 'badge bg-warning text-dark';
      case 'waiting_verification': return 'badge bg-info';
      case 'paid': return 'badge bg-success';
      case 'failed': return 'badge bg-danger';
      default: return 'badge bg-secondary';
    }
  };

  const getPaymentStatusText = (status) => {
    switch (status) {
      case 'waiting_payment': return 'Menunggu Pembayaran';
      case 'waiting_verification': return 'Menunggu Verifikasi';
      case 'paid': return 'Terbayar';
      case 'failed': return 'Gagal';
      default: return status;
    }
  };

  const getOrderStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Menunggu Pembayaran';
      case 'confirmed': return 'Dikonfirmasi';
      case 'shipped': return 'Dikirim';
      case 'delivered': return 'Sampai';
      case 'completed': return 'Selesai';
      case 'cancelled': return 'Dibatalkan';
      default: return status;
    }
  };

  const showActionModal = (order, type) => {
    setSelectedOrder(order);
    setActionType(type);
    setShowModal(true);
  };

  const getAvailableActions = (order) => {
    const actions = [];

    actions.push({
      type: 'detail',
      text: '👁️ Lihat Detail',
      available: true
    });

    if (order.paymentStatus === 'waiting_verification') {
      actions.push({
        type: 'payment',
        text: '✅ Verifikasi Pembayaran',
        available: true,
        urgent: true
      });
    }

    if (!['completed', 'cancelled'].includes(order.status)) {
      actions.push({
        type: 'update',
        text: '📝 Update Status',
        available: true
      });
    }

    return actions;
  };

  // Show loading screen if still checking auth
  if (loading || !userRole) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{height: '100vh'}}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Memverifikasi akses...</p>
        </div>
      </div>
    );
  }

  // Show access denied if not admin
  if (userRole !== 'admin') {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{height: '100vh'}}>
        <div className="text-center">
          <h3>❌ Akses Ditolak</h3>
          <p>Anda tidak memiliki akses ke halaman ini.</p>
          <button className="btn btn-primary" onClick={() => router.push('/')}>
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex">
      <Sidebar />
      
      <div className="main-content">
        <div className="container-fluid py-4">
          <div className="row">
            <div className="col-12">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="h4 mb-0">🛒 Daftar Pemesanan</h2>
                {statusCounts.waiting_verification > 0 && (
                  <div className="badge bg-danger text-white fs-6">
                    🚨 {statusCounts.waiting_verification} pembayaran perlu verifikasi!
                  </div>
                )}
              </div>

              {/* Status Cards */}
              <div className="row mb-4">
                <div className="col-lg-2 col-md-4 col-sm-6 mb-3">
                  <div className="card bg-warning text-dark h-100">
                    <div className="card-body text-center">
                      <h3 className="card-title">⏳</h3>
                      <h4>{statusCounts.pending}</h4>
                      <p className="card-text">Menunggu Bayar</p>
                    </div>
                  </div>
                </div>
                <div className="col-lg-2 col-md-4 col-sm-6 mb-3">
                  <div className="card bg-danger text-white h-100">
                    <div className="card-body text-center">
                      <h3 className="card-title">🚨</h3>
                      <h4>{statusCounts.waiting_verification}</h4>
                      <p className="card-text">Perlu Verifikasi</p>
                    </div>
                  </div>
                </div>
                <div className="col-lg-2 col-md-4 col-sm-6 mb-3">
                  <div className="card bg-info text-white h-100">
                    <div className="card-body text-center">
                      <h3 className="card-title">✅</h3>
                      <h4>{statusCounts.confirmed}</h4>
                      <p className="card-text">Diproses</p>
                    </div>
                  </div>
                </div>
                <div className="col-lg-2 col-md-4 col-sm-6 mb-3">
                  <div className="card bg-primary text-white h-100">
                    <div className="card-body text-center">
                      <h3 className="card-title">🚚</h3>
                      <h4>{statusCounts.shipped}</h4>
                      <p className="card-text">Dikirim</p>
                    </div>
                  </div>
                </div>
                <div className="col-lg-2 col-md-4 col-sm-6 mb-3">
                  <div className="card bg-secondary text-white h-100">
                    <div className="card-body text-center">
                      <h3 className="card-title">📦</h3>
                      <h4>{statusCounts.delivered}</h4>
                      <p className="card-text">Sampai</p>
                    </div>
                  </div>
                </div>
                <div className="col-lg-2 col-md-4 col-sm-6 mb-3">
                  <div className="card bg-success text-white h-100">
                    <div className="card-body text-center">
                      <h3 className="card-title">🎉</h3>
                      <h4>{statusCounts.completed}</h4>
                      <p className="card-text">Selesai</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filter dan Search */}
              <div className="row mb-3">
                <div className="col-md-3">
                  <select 
                    className="form-select" 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">Semua Status</option>
                    <option value="pending">Menunggu Pembayaran</option>
                    <option value="confirmed">Dikonfirmasi</option>
                    <option value="shipped">Dikirim</option>
                    <option value="delivered">Sampai</option>
                    <option value="completed">Selesai</option>
                    <option value="cancelled">Dibatalkan</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="🔍 Cari order, nama, email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="col-md-2">
                  <select 
                    className="form-select" 
                    value={itemsPerPage} 
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option value={5}>5 per halaman</option>
                    <option value={10}>10 per halaman</option>
                    <option value={25}>25 per halaman</option>
                    <option value={50}>50 per halaman</option>
                  </select>
                </div>
                <div className="col-md-4 text-end">
                  <button className="btn btn-primary" onClick={loadOrders} disabled={isLoading}>
                    {isLoading ? '⏳ Loading...' : '🔄 Refresh'}
                  </button>
                </div>
              </div>

              {/* Info Pagination */}
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="text-muted">
                  Menampilkan {startIndex + 1} - {Math.min(endIndex, filteredOrders.length)} dari {filteredOrders.length} pesanan
                  {searchTerm && (
                    <span className="ms-2">
                      <span className="badge bg-info">Pencarian: "{searchTerm}"</span>
                    </span>
                  )}
                </div>
                {filteredOrders.length > itemsPerPage && (
                  <div className="text-muted">
                    Halaman {currentPage} dari {totalPages}
                  </div>
                )}
              </div>

              {/* Orders Table */}
              <div className="card">
                <div className="card-body">
                  {isLoading ? (
                    <div className="text-center py-4">
                      <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <p className="mt-2">Memuat data pesanan...</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead className="table-light">
                          <tr>
                            <th>ID Pesanan</th>
                            <th>Reseller</th>
                            <th>Email</th>
                            <th>Tanggal</th>
                            <th>Total</th>
                            <th>Status Pesanan</th>
                            <th>Status Bayar</th>
                            <th>Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentOrders.length === 0 ? (
                            <tr>
                              <td colSpan="8" className="text-center py-4">
                                {filteredOrders.length === 0 && searchTerm ? (
                                  <>
                                    Tidak ada pesanan yang cocok dengan pencarian "{searchTerm}"
                                    <br/>
                                    <button 
                                      className="btn btn-sm btn-outline-primary mt-2"
                                      onClick={() => setSearchTerm('')}
                                    >
                                      🔄 Reset Pencarian
                                    </button>
                                  </>
                                ) : (
                                  'Tidak ada data pesanan'
                                )}
                              </td>
                            </tr>
                          ) : (
                            currentOrders.map((order) => (
                              <tr key={order.id} className={order.paymentStatus === 'waiting_verification' ? 'table-warning' : ''}>
                                <td className="fw-bold">#{order.orderNumber || 'N/A'}</td>
                                <td>{order.resellerName || 'N/A'}</td>
                                <td>{order.resellerEmail || 'N/A'}</td>
                                <td>{formatDate(order.createdAt)}</td>
                                <td className="fw-bold text-success">
                                  {formatCurrency(order.totalAmount || 0)}
                                </td>
                                <td>
                                  <span className={getStatusBadgeClass(order.status)}>
                                    {getOrderStatusText(order.status)}
                                  </span>
                                </td>
                                <td>
                                  <span className={getPaymentBadgeClass(order.paymentStatus)}>
                                    {getPaymentStatusText(order.paymentStatus)}
                                  </span>
                                  {order.paymentMethod && (
                                    <small className="d-block text-muted">
                                      via {order.paymentMethod}
                                    </small>
                                  )}
                                  {order.paymentStatus === 'waiting_verification' && (
                                    <small className="d-block text-danger fw-bold">
                                      🚨 PERLU TINDAKAN!
                                    </small>
                                  )}
                                </td>
                                <td>
                                  <div className="dropdown">
                                    <button className={`btn btn-sm dropdown-toggle ${
                                      order.paymentStatus === 'waiting_verification' 
                                        ? 'btn-danger' 
                                        : 'btn-outline-primary'
                                      }`}
                                      type="button" 
                                      data-bs-toggle="dropdown">
                                      {order.paymentStatus === 'waiting_verification' ? '🚨 URGENT' : '🔍 Aksi'}
                                    </button>
                                    <ul className="dropdown-menu">
                                      {getAvailableActions(order).map((action, index) => (
                                        <li key={index}>
                                          <button 
                                            className={`dropdown-item ${action.urgent ? 'text-danger fw-bold' : ''}`}
                                            onClick={() => showActionModal(order, action.type)}
                                            disabled={!action.available}
                                          >
                                            {action.text}
                                            {action.urgent && ' ⚡'}
                                          </button>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Pagination */}
              {filteredOrders.length > itemsPerPage && (
                <div className="d-flex justify-content-between align-items-center mt-4">
                  <div className="d-flex align-items-center gap-2">
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      ⏮️ Pertama
                    </button>
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      ⬅️ Sebelum
                    </button>
                  </div>

                  <div className="d-flex gap-1">
                    {getPaginationButtons().map(page => (
                      <button
                        key={page}
                        className={`btn btn-sm ${
                          page === currentPage 
                            ? 'btn-primary' 
                            : 'btn-outline-primary'
                        }`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Selanjutnya ➡️
                    </button>
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      Terakhir ⏭️
                    </button>
                  </div>
                </div>
              )}

              {/* Pagination Info Mobile */}
              <div className="d-block d-md-none mt-3 text-center">
                <small className="text-muted">
                  Halaman {currentPage} dari {totalPages} • {filteredOrders.length} total pesanan
                </small>
              </div>
            </div>
          </div>

          {/* Action Modal */}
          {showModal && selectedOrder && (
            <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
              <div className="modal-dialog modal-lg">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">
                      {actionType === 'detail' && '📋 Detail Pesanan'}
                      {actionType === 'payment' && '💳 Verifikasi Pembayaran'}
                      {actionType === 'update' && '📝 Update Status Pesanan'}
                    </h5>
                    <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                  </div>
                  <div className="modal-body">
                    {actionType === 'detail' && (
                      <div>
                        <div className="row mb-3">
                          <div className="col-md-6">
                            <strong>Order Number:</strong> #{selectedOrder.orderNumber || 'N/A'}
                          </div>
                          <div className="col-md-6">
                            <strong>Tanggal:</strong> {formatDate(selectedOrder.createdAt)}
                          </div>
                        </div>
                        <div className="row mb-3">
                          <div className="col-md-6">
                            <strong>Reseller:</strong> {selectedOrder.resellerName || 'N/A'}
                          </div>
                          <div className="col-md-6">
                            <strong>Email:</strong> {selectedOrder.resellerEmail || 'N/A'}
                          </div>
                        </div>
                        <div className="row mb-3">
                          <div className="col-md-6">
                            <strong>Phone:</strong> {selectedOrder.resellerPhone || 'N/A'}
                          </div>
                          <div className="col-md-6">
                            <strong>Total:</strong> {formatCurrency(selectedOrder.totalAmount || 0)}
                          </div>
                        </div>
                        
                        <div className="row mb-3">
                          <div className="col-md-6">
                            <strong>Status Pesanan:</strong> 
                            <span className={`ms-2 ${getStatusBadgeClass(selectedOrder.status)}`}>
                              {getOrderStatusText(selectedOrder.status)}
                            </span>
                          </div>
                          <div className="col-md-6">
                            <strong>Status Pembayaran:</strong> 
                            <span className={`ms-2 ${getPaymentBadgeClass(selectedOrder.paymentStatus)}`}>
                              {getPaymentStatusText(selectedOrder.paymentStatus)}
                            </span>
                          </div>
                        </div>

                        {selectedOrder.paymentProofURL && (
                          <div className="mb-3">
                            <strong>Bukti Pembayaran:</strong>
                            <div className="mt-2">
                              <img 
                                src={selectedOrder.paymentProofURL} 
                                alt="Bukti Pembayaran" 
                                className="img-thumbnail"
                                style={{maxWidth: '300px'}}
                              />
                            </div>
                            {selectedOrder.paymentMethod && (
                              <small className="text-muted d-block mt-1">
                                Metode: {selectedOrder.paymentMethod}
                              </small>
                            )}
                          </div>
                        )}

                        {selectedOrder.shippingAddress && (
                          <div className="mb-3">
                            <strong>Alamat Pengiriman:</strong>
                            <p className="mt-1">
                              {selectedOrder.shippingAddress.name}<br/>
                              {selectedOrder.shippingAddress.phone}<br/>
                              {selectedOrder.shippingAddress.address}<br/>
                              {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.province} {selectedOrder.shippingAddress.postalCode}
                            </p>
                          </div>
                        )}

                        {selectedOrder.products && (
                          <div className="mb-3">
                            <strong>Produk:</strong>
                            <div className="table-responsive mt-2">
                              <table className="table table-sm">
                                <thead>
                                  <tr>
                                    <th>Produk</th>
                                    <th>Qty</th>
                                    <th>Harga</th>
                                    <th>Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {selectedOrder.products.map((product, index) => (
                                    <tr key={index}>
                                      <td>{product.name || 'N/A'}</td>
                                      <td>{product.qty || 0}</td>
                                      <td>{formatCurrency(product.price || 0)}</td>
                                      <td>{formatCurrency((product.price || 0) * (product.qty || 0))}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {actionType === 'payment' && (
                      <div>
                        <div className="alert alert-warning">
                          <h6>🚨 Verifikasi Pembayaran untuk #{selectedOrder.orderNumber}</h6>
                          <p className="mb-0">
                            Total: <strong>{formatCurrency(selectedOrder.totalAmount || 0)}</strong><br/>
                            Status saat ini: <strong>{getPaymentStatusText(selectedOrder.paymentStatus)}</strong>
                          </p>
                        </div>

                        {selectedOrder.paymentProofURL && (
                          <div className="mb-3 text-center">
                            <strong>Bukti Pembayaran:</strong>
                            <div className="mt-2">
                              <img 
                                src={selectedOrder.paymentProofURL} 
                                alt="Bukti Pembayaran" 
                                className="img-thumbnail"
                                style={{maxWidth: '400px', maxHeight: '300px'}}
                              />
                            </div>
                            {selectedOrder.paymentMethod && (
                              <small className="text-muted d-block mt-1">
                                Metode: {selectedOrder.paymentMethod}
                                </small>
                            )}
                          </div>
                        )}

                        {!selectedOrder.paymentProofURL && (
                          <div className="alert alert-info">
                            <p className="mb-0">⚠️ Tidak ada bukti pembayaran yang diupload</p>
                          </div>
                        )}

                        <div className="d-grid gap-2">
                          <button 
                            className="btn btn-success"
                            onClick={() => handlePaymentUpdate(selectedOrder.id, 'paid', 'confirmed', 'Pembayaran diverifikasi oleh admin')}
                          >
                            ✅ Terima Pembayaran & Konfirmasi Order
                          </button>
                          <button 
                            className="btn btn-danger"
                            onClick={() => handlePaymentUpdate(selectedOrder.id, 'failed', 'cancelled', 'Pembayaran ditolak oleh admin')}
                          >
                            ❌ Tolak Pembayaran & Batalkan Order
                          </button>
                        </div>
                      </div>
                    )}

                    {actionType === 'update' && (
                      <div>
                        <div className="alert alert-info">
                          <h6>📝 Update Status untuk #{selectedOrder.orderNumber}</h6>
                          <p className="mb-0">
                            Status saat ini: <strong>{getOrderStatusText(selectedOrder.status)}</strong><br/>
                            Pembayaran: <strong>{getPaymentStatusText(selectedOrder.paymentStatus)}</strong>
                          </p>
                        </div>

                        <div className="mb-3">
                          <label className="form-label">Pilih Status Baru:</label>
                          <div className="d-grid gap-2">
                            {selectedOrder.status === 'pending' && selectedOrder.paymentStatus === 'paid' && (
                              <button 
                                className="btn btn-info"
                                onClick={() => handleStatusUpdate(selectedOrder.id, 'confirmed', 'Order dikonfirmasi dan sedang diproses')}
                              >
                                ✅ Konfirmasi Order (Mulai Proses)
                              </button>
                            )}

                            {selectedOrder.status === 'confirmed' && (
                              <button 
                                className="btn btn-primary"
                                onClick={() => handleStatusUpdate(selectedOrder.id, 'shipped', 'Order telah dikirim')}
                              >
                                🚚 Tandai Sebagai Dikirim
                              </button>
                            )}

                            {selectedOrder.status === 'shipped' && (
                              <button 
                                className="btn btn-secondary"
                                onClick={() => handleStatusUpdate(selectedOrder.id, 'delivered', 'Order telah sampai di tujuan')}
                              >
                                📦 Tandai Sebagai Sampai
                              </button>
                            )}

                            {selectedOrder.status === 'delivered' && (
                              <button 
                                className="btn btn-success"
                                onClick={() => handleStatusUpdate(selectedOrder.id, 'completed', 'Order selesai')}
                              >
                                🎉 Selesaikan Order
                              </button>
                            )}

                            {!['completed', 'cancelled'].includes(selectedOrder.status) && (
                              <button 
                                className="btn btn-danger"
                                onClick={() => handleStatusUpdate(selectedOrder.id, 'cancelled', 'Order dibatalkan oleh admin')}
                              >
                                ❌ Batalkan Order
                              </button>
                            )}
                          </div>
                        </div>

                        {selectedOrder.status === 'shipped' && (
                          <div className="alert alert-warning">
                            <small>💡 <strong>Tips:</strong> Setelah diklik "Tandai Sebagai Sampai", order akan menunggu konfirmasi dari reseller atau otomatis selesai dalam beberapa hari.</small>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                      Tutup
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
      