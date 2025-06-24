'use client'

import { useAuth } from '../components/AuthProvider'
import Sidebar from '../components/sidebar-reseller'
import { useState, useEffect } from 'react'
import { getOrdersByReseller } from '../lib/orders'
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  limit 
} from 'firebase/firestore'
import { db } from '../lib/firebase'

export default function ResellerDashboard() {
  const { user, loading } = useAuth()
  const [dashboardData, setDashboardData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Real-time data fetching
  useEffect(() => {
    if (!user?.uid) return

    const fetchRealtimeData = () => {
      // Real-time orders listener
      // Temporary fix: Remove orderBy from query and sort in JavaScript
const ordersQuery = query(
  collection(db, 'orders'),
  where('resellerId', '==', user.uid)
  // Remove orderBy temporarily
)

const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
  const orders = []
  snapshot.forEach((doc) => {
    orders.push({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date()
    })
  })

  // Sort in JavaScript instead of Firestore
  orders.sort((a, b) => b.createdAt - a.createdAt)

  // Calculate stats from real data
  const stats = calculateStats(orders)
  const recentOrders = orders.slice(0, 5) // Get 5 most recent orders
  const notifications = generateNotifications(orders)

  setDashboardData({
    stats,
    recentOrders,
    notifications
  })
  setIsLoading(false)
}, (error) => {
  console.error('Error fetching real-time data:', error)
  setIsLoading(false)
})
      return unsubscribeOrders
    }

    const unsubscribe = fetchRealtimeData()
    
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [user?.uid])

  // Calculate statistics from real order data
  const calculateStats = (orders) => {
    const totalOrders = orders.length
    const pendingOrders = orders.filter(order => order.status === 'pending').length
    const completedOrders = orders.filter(order => order.status === 'delivered').length
    
    const totalSpending = orders
      .filter(order => order.status !== 'cancelled')
      .reduce((sum, order) => sum + (order.totalAmount || 0), 0)
    
    // Calculate this month's spending
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    const thisMonthSpending = orders
      .filter(order => {
        const orderDate = order.createdAt
        return orderDate.getMonth() === currentMonth && 
               orderDate.getFullYear() === currentYear &&
               order.status !== 'cancelled'
      })
      .reduce((sum, order) => sum + (order.totalAmount || 0), 0)
    
    // Calculate estimated savings (assuming 15% wholesale discount)
    const savedMoney = Math.floor(totalSpending * 0.15)

    return {
      totalOrders,
      pendingOrders,
      completedOrders,
      totalSpending,
      thisMonthSpending,
      savedMoney
    }
  }

  // Generate notifications based on real order data
  const generateNotifications = (orders) => {
    const notifications = []
    const now = new Date()

    // Check for pending orders
    const pendingOrders = orders.filter(order => order.status === 'pending')
    if (pendingOrders.length > 0) {
      notifications.push({
        type: 'info',
        message: `Anda memiliki ${pendingOrders.length} pesanan yang menunggu konfirmasi admin`,
        time: 'Baru saja'
      })
    }

    // Check for orders waiting payment
    const waitingPayment = orders.filter(order => order.paymentStatus === 'waiting_payment')
    if (waitingPayment.length > 0) {
      notifications.push({
        type: 'warning',
        message: `${waitingPayment.length} pesanan menunggu pembayaran`,
        time: '5 menit lalu'
      })
    }

    // Check for recently shipped orders
    const shippedOrders = orders.filter(order => 
      order.status === 'shipped' && 
      order.updatedAt && 
      (now - order.updatedAt.toDate()) < 24 * 60 * 60 * 1000 // Last 24 hours
    )
    if (shippedOrders.length > 0) {
      notifications.push({
        type: 'success',
        message: `${shippedOrders.length} pesanan telah dikirim hari ini`,
        time: '2 jam lalu'
      })
    }

    // Limit to 3 notifications
    return notifications.slice(0, 3)
  }

  if (loading || isLoading) {
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
      pending: { class: 'bg-warning', text: 'Menunggu' },
      confirmed: { class: 'bg-info', text: 'Dikonfirmasi' },
      shipped: { class: 'bg-primary', text: 'Dikirim' },
      delivered: { class: 'bg-success', text: 'Selesai' },
      cancelled: { class: 'bg-danger', text: 'Dibatalkan' }
    }
    return statusConfig[status] || { class: 'bg-secondary', text: status }
  }

  const getPaymentStatusBadge = (paymentStatus) => {
    const statusConfig = {
      waiting_payment: { class: 'bg-warning', text: 'Menunggu Bayar' },
      waiting_verification: { class: 'bg-info', text: 'Verifikasi' },
      paid: { class: 'bg-success', text: 'Lunas' },
      failed: { class: 'bg-danger', text: 'Gagal' }
    }
    return statusConfig[paymentStatus] || { class: 'bg-secondary', text: paymentStatus }
  }

  const getNotificationIcon = (type) => {
    const icons = {
      info: 'fas fa-info-circle text-info',
      success: 'fas fa-check-circle text-success',
      warning: 'fas fa-exclamation-triangle text-warning',
      danger: 'fas fa-times-circle text-danger'
    }
    return icons[type] || 'fas fa-bell text-secondary'
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (date) => {
    if (!date) return '-'
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date)
  }

  if (!dashboardData) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Memuat data...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container-fluid">
      <div className="row">
        <Sidebar />
        
        <main className="col-md-9 ms-sm-auto col-lg-10 px-md-4">
          <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
            <h1 className="h2">
              <i className="fas fa-store me-2 text-primary"></i>
              Dashboard Reseller
            </h1>
            <div className="btn-toolbar mb-2 mb-md-0">
              <div className="badge bg-success fs-6 me-2">
                <i className="fas fa-user-tie me-1"></i>
                {user?.username || user?.email || 'Reseller'}
              </div>
              <div className="badge bg-info fs-6">
                <i className="fas fa-sync-alt me-1"></i>
                Real-time
              </div>
            </div>
          </div>

          {/* Welcome Card */}
          <div className="card mb-4 bg-gradient-primary text-white">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col">
                  <h4 className="text-white mb-2">
                    Selamat Datang, {user?.username || user?.email || 'Reseller'}! 👋
                  </h4>
                  <p className="text-white-50 mb-0">
                    Dashboard ini menampilkan data real-time dari aktivitas bisnis reseller Anda.
                  </p>
                </div>
                <div className="col-auto">
                  <i className="fas fa-chart-line fa-3x opacity-50"></i>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="row mb-4">
            <div className="col-md-6 col-xl-3 mb-3">
              <div className="card shadow h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                        Total Pesanan
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        {dashboardData.stats.totalOrders}
                      </div>
                    </div>
                    <div className="col-auto">
                      <i className="fas fa-shopping-cart fa-2x text-gray-300"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6 col-xl-3 mb-3">
              <div className="card shadow h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                        Menunggu Konfirmasi
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        {dashboardData.stats.pendingOrders}
                      </div>
                    </div>
                    <div className="col-auto">
                      <i className="fas fa-clock fa-2x text-gray-300"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6 col-xl-3 mb-3">
              <div className="card shadow h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                        Total Belanja
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        {formatCurrency(dashboardData.stats.totalSpending)}
                      </div>
                    </div>
                    <div className="col-auto">
                      <i className="fas fa-dollar-sign fa-2x text-gray-300"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6 col-xl-3 mb-3">
              <div className="card shadow h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                        Hemat Bulan Ini
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        {formatCurrency(dashboardData.stats.savedMoney)}
                      </div>
                    </div>
                    <div className="col-auto">
                      <i className="fas fa-tags fa-2x text-gray-300"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            {/* Recent Orders */}
            <div className="col-lg-8 mb-4">
              <div className="card shadow">
                <div className="card-header py-3 d-flex justify-content-between align-items-center">
                  <h6 className="m-0 font-weight-bold text-primary">
                    <i className="fas fa-list me-2"></i>
                    Pesanan Terbaru
                  </h6>
                  <small className="text-muted">
                    <i className="fas fa-sync-alt me-1"></i>
                    Update otomatis
                  </small>
                </div>
                <div className="card-body">
                  {dashboardData.recentOrders.length === 0 ? (
                    <div className="text-center py-4">
                      <i className="fas fa-shopping-cart fa-3x text-gray-300 mb-3"></i>
                      <p className="text-muted">Belum ada pesanan</p>
                      <a href="/reseller/orders" className="btn btn-primary btn-sm">
                        <i className="fas fa-plus me-1"></i>
                        Buat Pesanan Pertama
                      </a>
                    </div>
                  ) : (
                    <>
                      <div className="table-responsive">
                        <table className="table table-bordered">
                          <thead>
                            <tr>
                              <th>Order ID</th>
                              <th>Tanggal</th>
                              <th>Total</th>
                              <th>Status</th>
                              <th>Pembayaran</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dashboardData.recentOrders.map(order => {
                              const statusBadge = getStatusBadge(order.status)
                              const paymentBadge = getPaymentStatusBadge(order.paymentStatus)
                              return (
                                <tr key={order.id}>
                                  <td className="fw-bold">{order.orderNumber}</td>
                                  <td>{formatDate(order.createdAt)}</td>
                                  <td className="fw-bold text-success">
                                    {formatCurrency(order.totalAmount || 0)}
                                  </td>
                                  <td>
                                    <span className={`badge ${statusBadge.class}`}>
                                      {statusBadge.text}
                                    </span>
                                  </td>
                                  <td>
                                    <span className={`badge ${paymentBadge.class}`}>
                                      {paymentBadge.text}
                                    </span>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="text-center">
                        <a href="/reseller/orders" className="btn btn-primary btn-sm">
                          <i className="fas fa-eye me-1"></i>
                          Lihat Semua Pesanan
                        </a>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="col-lg-4 mb-4">
              <div className="card shadow">
                <div className="card-header py-3">
                  <h6 className="m-0 font-weight-bold text-primary">
                    <i className="fas fa-bell me-2"></i>
                    Notifikasi
                  </h6>
                </div>
                <div className="card-body">
                  {dashboardData.notifications.length === 0 ? (
                    <div className="text-center py-3">
                      <i className="fas fa-bell-slash fa-2x text-gray-300 mb-2"></i>
                      <p className="text-muted mb-0">Tidak ada notifikasi</p>
                    </div>
                  ) : (
                    <>
                      {dashboardData.notifications.map((notif, idx) => (
                        <div key={idx} className="d-flex align-items-start mb-3">
                          <div className="flex-shrink-0 me-3">
                            <i className={getNotificationIcon(notif.type)}></i>
                          </div>
                          <div className="flex-grow-1">
                            <p className="small mb-1">{notif.message}</p>
                            <small className="text-muted">{notif.time}</small>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

        </main>
      </div>

      <style jsx>{`
        .bg-gradient-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .shadow {
          box-shadow: 0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15) !important;
        }
        
        .font-weight-bold {
          font-weight: 700 !important;
        }
        
        .text-xs {
          font-size: 0.7rem;
        }
        
        .text-gray-800 {
          color: #3a3b45 !important;
        }
        
        .text-gray-300 {
          color: #dddfeb !important;
        }
        
        .border-left-primary {
          border-left: 0.25rem solid #4e73df !important;
        }
        
        .card-body .row.no-gutters {
          margin-right: 0;
          margin-left: 0;
        }
        
        .card-body .row.no-gutters > [class*="col-"] {
          padding-right: 0;
          padding-left: 0;
        }
        
        .opacity-50 {
          opacity: 0.5;
        }

        .table th {
          font-size: 0.85rem;
          font-weight: 600;
          background-color: #f8f9fc;
        }

        .table td {
          font-size: 0.9rem;
          vertical-align: middle;
        }

        .badge {
          font-size: 0.75rem;
        }
      `}</style>
    </div>
  )
}