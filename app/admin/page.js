'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/app/lib/firebase'; // Add your firebase config import
import Sidebar from '@/app/components/Sidebar';
import { getAllOrders, getOrderStatistics } from '@/app/lib/orders';
import { getAllUsers, getUserProfile } from '@/app/lib/auth';
import { getPaymentStats } from '@/app/lib/payments';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingConfirmation: 0,
    totalRevenue: 0,
    thisMonthRevenue: 0,
    totalUsers: 0,
    totalResellers: 0
  });
  const [user, loading, error] = useAuthState(auth);
  const [userProfile, setUserProfile] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const router = useRouter();
  
  // Check authentication and admin role
  useEffect(() => {
    const checkAuth = async () => {
      if (loading) return;
      
      if (!user) {
        router.push('/');
        return;
      }

      try {
        const profileResult = await getUserProfile(user.uid);
        if (profileResult.success) {
          setUserProfile(profileResult.user);
          if (profileResult.user.role !== 'admin') {
            router.push('/');
            return;
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        router.push('/');
      }
    };

    checkAuth();
  }, [user, loading, router]);

  useEffect(() => {
    if (user && userProfile?.role === 'admin') {
      fetchDashboardData();
    }
  }, [user, userProfile]);

  const fetchDashboardData = async () => {
    try {
      setDashboardLoading(true);
      
      // Fetch order statistics
      const orderStatsResult = await getOrderStatistics();
      const ordersResult = await getAllOrders();
      const paymentStatsResult = await getPaymentStats();
      const usersResult = await getAllUsers();

      if (orderStatsResult.success) {
        setStats(prev => ({
          ...prev,
          totalOrders: orderStatsResult.stats.totalOrders,
          pendingConfirmation: orderStatsResult.stats.pendingOrders,
          totalRevenue: orderStatsResult.stats.totalRevenue
        }));
      }

      if (ordersResult.success) {
        // Get recent orders (last 5)
        const recent = ordersResult.orders
          .sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return dateB - dateA;
          })
          .slice(0, 5);
        setRecentOrders(recent);

        // Create notifications for orders needing attention
        const needsAttention = ordersResult.orders.filter(
          order => order.paymentStatus === 'waiting_verification' || 
                  order.status === 'pending'
        );
        setNotifications(needsAttention.slice(0, 3));
      }

      if (paymentStatsResult.success) {
        setStats(prev => ({
          ...prev,
          thisMonthRevenue: paymentStatsResult.stats.thisMonthRevenue || paymentStatsResult.stats.totalRevenue
        }));
      }

      if (usersResult.success) {
        const resellers = usersResult.users.filter(user => user.role === 'reseller');
        setStats(prev => ({
          ...prev,
          totalUsers: usersResult.users.length,
          totalResellers: resellers.length
        }));
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setDashboardLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (typeof amount === 'string') {
      amount = parseFloat(amount.replace(/[^\d]/g, '')) || 0;
    }
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else {
      date = new Date(timestamp);
    }
    
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'pending': { class: 'warning', text: 'Pending' },
      'confirmed': { class: 'primary', text: 'Dikonfirmasi' },
      'processing': { class: 'info', text: 'Diproses' },
      'shipped': { class: 'success', text: 'Dikirim' },
      'completed': { class: 'success', text: 'Selesai' },
      'cancelled': { class: 'danger', text: 'Dibatalkan' }
    };
    
    const statusInfo = statusMap[status] || { class: 'secondary', text: status };
    return `<span class="badge bg-${statusInfo.class}">${statusInfo.text}</span>`;
  };

  const getPaymentStatusBadge = (paymentStatus) => {
    const statusMap = {
      'waiting_payment': { class: 'warning', text: 'Menunggu Bayar' },
      'waiting_verification': { class: 'info', text: 'Verifikasi' },
      'paid': { class: 'success', text: 'Verified' },
      'failed': { class: 'danger', text: 'Gagal' }
    };
    
    const statusInfo = statusMap[paymentStatus] || { class: 'secondary', text: paymentStatus };
    return `<span class="badge bg-${statusInfo.class}">${statusInfo.text}</span>`;
  };

  if (loading || dashboardLoading) {
    return (
      <div className="d-flex">
        <Sidebar />
        <div className="flex-grow-1 p-4" style={{ marginLeft: '250px' }}>
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show nothing if user is not authenticated or not admin
  if (!user || !userProfile || userProfile.role !== 'admin') {
    return null;
  }

  return (
    <div className="d-flex">
      <Sidebar />
      
      {/* Main Content - Fixed margin to prevent overlap */}
      <div className="flex-grow-1 p-4" style={{ 
        backgroundColor: '#f8f9fa', 
        minHeight: '100vh',
        marginLeft: '250px' // Fixed margin to prevent sidebar overlap
      }}>
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="mb-0">👑 Dashboard Admin</h2>
            <p className="text-muted mb-0">
              Administrator Panel - BeautyOrder
              <span className="badge bg-success ms-2">Real-time</span>
            </p>
          </div>
        </div>

        {/* Welcome Banner */}
        <div className="card bg-primary text-white mb-4" style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
        }}>
          <div className="card-body">
            <div className="row align-items-center">
              <div className="col-md-8">
                <h4 className="mb-2">Selamat Datang, Administrator! 👨‍💼</h4>
                <p className="mb-0">Dashboard ini menampilkan ringkasan data bisnis dan aktivitas reseller secara real-time.</p>
              </div>
              <div className="col-md-4 text-end">
                <i className="fas fa-tachometer-alt fa-4x opacity-50"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="row mb-4">
          <div className="col-lg-3 col-md-6 mb-3">
            <div className="card h-100 border-0 shadow-sm">
              <div className="card-body text-center">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <small className="text-muted fw-bold">TOTAL PESANAN</small>
                  <i className="fas fa-shopping-cart text-primary fs-4"></i>
                </div>
                <h3 className="mb-0 text-primary fw-bold">{stats.totalOrders}</h3>
                <small className="text-muted">Semua pesanan</small>
              </div>
            </div>
          </div>
          
          <div className="col-lg-3 col-md-6 mb-3">
            <div className="card h-100 border-0 shadow-sm">
              <div className="card-body text-center">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <small className="text-muted fw-bold">PERLU KONFIRMASI</small>
                  <i className="fas fa-clock text-warning fs-4"></i>
                </div>
                <h3 className="mb-0 text-warning fw-bold">{stats.pendingConfirmation}</h3>
                <small className="text-muted">Menunggu verifikasi</small>
              </div>
            </div>
          </div>
          
          <div className="col-lg-3 col-md-6 mb-3">
            <div className="card h-100 border-0 shadow-sm">
              <div className="card-body text-center">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <small className="text-muted fw-bold">TOTAL REVENUE</small>
                  <i className="fas fa-money-bill-wave text-success fs-4"></i>
                </div>
                <h3 className="mb-0 text-success fw-bold" style={{ fontSize: '1.5rem' }}>
                  {formatCurrency(stats.totalRevenue)}
                </h3>
                <small className="text-muted">Semua transaksi</small>
              </div>
            </div>
          </div>
          
          <div className="col-lg-3 col-md-6 mb-3">
            <div className="card h-100 border-0 shadow-sm">
              <div className="card-body text-center">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <small className="text-muted fw-bold">TOTAL RESELLER</small>
                  <i className="fas fa-users text-info fs-4"></i>
                </div>
                <h3 className="mb-0 text-info fw-bold">{stats.totalResellers}</h3>
                <small className="text-muted">Reseller aktif</small>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications and Recent Orders Row */}
        <div className="row mb-4">
          {/* Notifications */}
          <div className="col-lg-6 mb-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white border-0 pb-0">
                <h5 className="mb-0">
                  <i className="fas fa-bell text-warning me-2"></i>
                  Notifikasi Penting
                </h5>
              </div>
              <div className="card-body">
                {notifications.length === 0 ? (
                  <div className="text-center py-3">
                    <i className="fas fa-check-circle text-success fs-1 mb-2"></i>
                    <p className="text-muted mb-0">Tidak ada notifikasi penting</p>
                  </div>
                ) : (
                  <div className="list-group list-group-flush">
                    {notifications.map((order, index) => (
                      <div key={index} className="list-group-item px-0 border-0">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <h6 className="mb-1">{order.orderNumber}</h6>
                            <p className="mb-1 small">{order.resellerName}</p>
                            <small className="text-muted">
                              {order.paymentStatus === 'waiting_verification' 
                                ? 'Menunggu verifikasi pembayaran' 
                                : 'Pesanan baru masuk'}
                            </small>
                          </div>
                          <span className="badge bg-warning">!</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="col-lg-6 mb-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white border-0 pb-0">
                <h5 className="mb-0">
                  <i className="fas fa-history text-primary me-2"></i>
                  Pesanan Terbaru
                </h5>
              </div>
              <div className="card-body">
                {recentOrders.length === 0 ? (
                  <div className="text-center py-3">
                    <i className="fas fa-inbox text-muted fs-1 mb-2"></i>
                    <p className="text-muted mb-0">Belum ada pesanan</p>
                  </div>
                ) : (
                  <div className="list-group list-group-flush">
                    {recentOrders.map((order, index) => (
                      <div key={index} className="list-group-item px-0 border-0">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <h6 className="mb-1">{order.orderNumber}</h6>
                            <p className="mb-1 small text-muted">{order.resellerName}</p>
                            <div className="d-flex gap-2 mb-1">
                              <span dangerouslySetInnerHTML={{ __html: getStatusBadge(order.status) }}></span>
                              <span dangerouslySetInnerHTML={{ __html: getPaymentStatusBadge(order.paymentStatus) }}></span>
                            </div>
                          </div>
                          <div className="text-end">
                            <small className="text-muted d-block">{formatDate(order.createdAt)}</small>
                            <small className="fw-bold text-success">{formatCurrency(order.totalAmount)}</small>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-4 py-3">
          <small className="text-muted">
            © 2024 BeautyOrder Admin Dashboard - 
            <span className="text-success ms-1">Online</span>
          </small>
        </div>
      </div>
    </div>
  );
}