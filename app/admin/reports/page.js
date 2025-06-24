'use client';

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/app/lib/firebase';
import { getUserProfile } from '@/app/lib/auth';
import { getAllOrders } from '@/app/lib/orders';
import { getOrderStatistics as getOrderStats } from '@/app/lib/orders';
import { getShipmentStats } from '@/app/lib/shipments';
import Sidebar from '@/app/components/Sidebar';
import { useRouter } from 'next/navigation';

export default function AdminReportPage() {
  const [user, loading, error] = useAuthState(auth);
  const [userProfile, setUserProfile] = useState(null);
  const [orderStats, setOrderStats] = useState(null);
  const [shipmentStats, setShipmentStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30'); // Default 30 days
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
      return;
    }

    if (user) {
      loadUserProfile();
    }
  }, [user, loading]);

  const loadUserProfile = async () => {
    try {
      const result = await getUserProfile(user.uid);
      if (result.success) {
        setUserProfile(result.user);
        if (result.user.role !== 'admin') {
          router.push('/');
          return;
        }
        await loadReportData();
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadReportData = async () => {
    setIsLoading(true);
    try {
      // Load order statistics
      const orderStatsResult = await getOrderStats();
      if (orderStatsResult.success) {
        setOrderStats(orderStatsResult.stats);
      }

      // Load shipment statistics
      const shipmentStatsResult = await getShipmentStats();
      if (shipmentStatsResult.success) {
        setShipmentStats(shipmentStatsResult.stats);
      }

      // Load recent orders for table
      const ordersResult = await getAllOrders();
      if (ordersResult.success) {
        // Filter orders based on date range and get only recent 10
        const filteredOrders = ordersResult.orders.slice(0, 10);
        setRecentOrders(filteredOrders);
      }
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'Rp 0';
    const numAmount = typeof amount === 'string' ? 
      parseFloat(amount.replace(/[^\d]/g, '')) : amount;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numAmount);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else {
      date = new Date(timestamp);
    }
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'pending': { class: 'bg-warning', text: 'Menunggu' },
      'confirmed': { class: 'bg-info', text: 'Dikonfirmasi' },
      'completed': { class: 'bg-success', text: 'Selesai' },
      'cancelled': { class: 'bg-danger', text: 'Dibatalkan' }
    };
    const statusInfo = statusMap[status] || { class: 'bg-secondary', text: status };
    return (
      <span className={`badge ${statusInfo.class} text-white`}>
        {statusInfo.text}
      </span>
    );
  };

  const getPaymentStatusBadge = (status) => {
    const statusMap = {
      'waiting_payment': { class: 'bg-warning', text: 'Menunggu Pembayaran' },
      'waiting_verification': { class: 'bg-info', text: 'Menunggu Verifikasi' },
      'paid': { class: 'bg-success', text: 'Lunas' },
      'failed': { class: 'bg-danger', text: 'Gagal' }
    };
    const statusInfo = statusMap[status] || { class: 'bg-secondary', text: status };
    return (
      <span className={`badge ${statusInfo.class} text-white`}>
        {statusInfo.text}
      </span>
    );
  };

  if (loading || isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user || !userProfile || userProfile.role !== 'admin') {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="alert alert-danger">Akses ditolak. Anda bukan admin.</div>
      </div>
    );
  }

  return (
    <div className="d-flex" style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-grow-1" style={{ marginLeft: '250px' }}>
        {/* Header */}
        <div className="bg-white shadow-sm border-bottom">
          <div className="container-fluid">
            <div className="row">
              <div className="col-12">
                <div className="d-flex justify-content-between align-items-center py-3">
                  <div>
                    <h4 className="mb-0 text-dark fw-bold">📊 Laporan Admin</h4>
                    <p className="text-muted mb-0 small">Dashboard laporan dan statistik</p>
                  </div>
                  <div className="d-flex gap-2">
                    <select 
                      className="form-select form-select-sm"
                      value={dateRange}
                      onChange={(e) => {
                        setDateRange(e.target.value);
                        loadReportData();
                      }}
                      style={{ width: 'auto' }}
                    >
                      <option value="7">7 Hari Terakhir</option>
                      <option value="30">30 Hari Terakhir</option>
                      <option value="90">90 Hari Terakhir</option>
                      <option value="365">1 Tahun Terakhir</option>
                    </select>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={loadReportData}
                    >
                      🔄 Refresh
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container-fluid py-4">
          {/* Statistics Cards */}
          <div className="row mb-4">
            {/* Orders Statistics */}
            <div className="col-xl-3 col-md-6 mb-4">
              <div className="card border-0 shadow-sm h-100" style={{ borderLeft: '4px solid #4e73df' }}>
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="me-3">
                      <div className="text-primary" style={{ fontSize: '2rem' }}>📦</div>
                    </div>
                    <div>
                      <div className="text-xs fw-bold text-primary text-uppercase mb-1">
                        Total Pesanan
                      </div>
                      <div className="h5 mb-0 fw-bold text-gray-800">
                        {orderStats?.total || 0}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue Statistics */}
            <div className="col-xl-3 col-md-6 mb-4">
              <div className="card border-0 shadow-sm h-100" style={{ borderLeft: '4px solid #1cc88a' }}>
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="me-3">
                      <div className="text-success" style={{ fontSize: '2rem' }}>💰</div>
                    </div>
                    <div>
                      <div className="text-xs fw-bold text-success text-uppercase mb-1">
                        Total Pendapatan
                      </div>
                      <div className="h5 mb-0 fw-bold text-gray-800">
                        {formatCurrency(orderStats?.totalRevenue || 0)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Commission Statistics */}
            <div className="col-xl-3 col-md-6 mb-4">
              <div className="card border-0 shadow-sm h-100" style={{ borderLeft: '4px solid #36b9cc' }}>
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="me-3">
                      <div className="text-info" style={{ fontSize: '2rem' }}>🤝</div>
                    </div>
                    <div>
                      <div className="text-xs fw-bold text-info text-uppercase mb-1">
                        Total Komisi
                      </div>
                      <div className="h5 mb-0 fw-bold text-gray-800">
                        {formatCurrency(orderStats?.totalCommission || 0)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Shipments Statistics */}
            <div className="col-xl-3 col-md-6 mb-4">
              <div className="card border-0 shadow-sm h-100" style={{ borderLeft: '4px solid #f6c23e' }}>
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="me-3">
                      <div className="text-warning" style={{ fontSize: '2rem' }}>🚚</div>
                    </div>
                    <div>
                      <div className="text-xs fw-bold text-warning text-uppercase mb-1">
                        Total Pengiriman
                      </div>
                      <div className="h5 mb-0 fw-bold text-gray-800">
                        {shipmentStats?.totalShipments || 0}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Status Overview */}
          <div className="row mb-4">
            <div className="col-xl-8 col-lg-7">
              <div className="card shadow-sm border-0 mb-4">
                <div className="card-header py-3 d-flex justify-content-between align-items-center bg-primary text-white">
                  <h6 className="m-0 fw-bold">📊 Status Pesanan</h6>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-6 col-md-3 text-center mb-3">
                      <div className="text-warning" style={{ fontSize: '2.5rem' }}>⏳</div>
                      <div className="fw-bold">{orderStats?.pending || 0}</div>
                      <div className="text-muted small">Menunggu</div>
                    </div>
                    <div className="col-6 col-md-3 text-center mb-3">
                      <div className="text-info" style={{ fontSize: '2.5rem' }}>✅</div>
                      <div className="fw-bold">{orderStats?.confirmed || 0}</div>
                      <div className="text-muted small">Dikonfirmasi</div>
                    </div>
                    <div className="col-6 col-md-3 text-center mb-3">
                      <div className="text-success" style={{ fontSize: '2.5rem' }}>🎉</div>
                      <div className="fw-bold">{orderStats?.completed || 0}</div>
                      <div className="text-muted small">Selesai</div>
                    </div>
                    <div className="col-6 col-md-3 text-center mb-3">
                      <div className="text-danger" style={{ fontSize: '2.5rem' }}>❌</div>
                      <div className="fw-bold">{orderStats?.cancelled || 0}</div>
                      <div className="text-muted small">Dibatalkan</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-4 col-lg-5">
              <div className="card shadow-sm border-0 mb-4">
                <div className="card-header py-3 bg-success text-white">
                  <h6 className="m-0 fw-bold">🚚 Info Pengiriman</h6>
                </div>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="text-muted">Dalam Perjalanan</span>
                    <span className="fw-bold text-primary">{shipmentStats?.shipped || 0}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="text-muted">Terkirim</span>
                    <span className="fw-bold text-success">{shipmentStats?.delivered || 0}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted">Biaya Kirim</span>
                    <span className="fw-bold text-info">{formatCurrency(shipmentStats?.totalCost || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Orders Table */}
          <div className="card shadow-sm border-0">
            <div className="card-header py-3 bg-white border-bottom">
              <h6 className="m-0 fw-bold text-primary">📋 Pesanan Terbaru</h6>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th className="border-0 text-muted small fw-bold">No. Pesanan</th>
                      <th className="border-0 text-muted small fw-bold">Reseller</th>
                      <th className="border-0 text-muted small fw-bold">Total</th>
                      <th className="border-0 text-muted small fw-bold">Status</th>
                      <th className="border-0 text-muted small fw-bold">Pembayaran</th>
                      <th className="border-0 text-muted small fw-bold">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.length > 0 ? (
                      recentOrders.map((order) => (
                        <tr key={order.id}>
                          <td className="fw-bold text-primary">{order.orderNumber}</td>
                          <td>
                            <div className="fw-bold">{order.resellerName}</div>
                            <div className="text-muted small">{order.resellerEmail}</div>
                          </td>
                          <td className="fw-bold">{formatCurrency(order.totalAmount)}</td>
                          <td>{getStatusBadge(order.status)}</td>
                          <td>{getPaymentStatusBadge(order.paymentStatus)}</td>
                          <td className="text-muted small">{formatDate(order.createdAt)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center py-4 text-muted">
                          Tidak ada data pesanan
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}