'use client';
import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../lib/firebase';
import { getUserProfile } from '../../lib/auth';
import { 
  getAllPayments, 
  getPaymentStats, 
  updatePaymentStatus, 
  retryPayment,
  formatCurrency 
} from '../../lib/payments';
import Sidebar from '../../components/Sidebar';

export default function PaymentPage() {
  const [user, loading, error] = useAuthState(auth);
  const [userProfile, setUserProfile] = useState(null);
  const [payments, setPayments] = useState([]);
  const [paymentStats, setPaymentStats] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [paymentsPerPage] = useState(10);

  // Check user authentication and role
  useEffect(() => {
    const checkUserRole = async () => {
      if (user) {
        try {
          const profile = await getUserProfile(user.uid);
          if (profile.success) {
            setUserProfile(profile.user);
            // Only admins can access payment gateway
            if (profile.user.role !== 'admin') {
              window.location.href = '/';
              return;
            }
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
    };

    if (user) {
      checkUserRole();
    } else if (!loading) {
      window.location.href = '/';
    }
  }, [user, loading]);

  // Load payment data
  useEffect(() => {
    const loadPaymentData = async () => {
      if (userProfile?.role === 'admin') {
        setIsLoading(true);
        try {
          // Load payments with filter
          const paymentsResult = await getAllPayments(statusFilter === 'all' ? null : statusFilter);
          if (paymentsResult.success) {
            setPayments(paymentsResult.payments);
          }

          // Load payment statistics
          const statsResult = await getPaymentStats();
          if (statsResult.success) {
            setPaymentStats(statsResult.stats);
          }
        } catch (error) {
          console.error('Error loading payment data:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadPaymentData();
  }, [userProfile, statusFilter]);

  const getStatusBadge = (status) => {
    switch(status) {
      case 'success':
        return <span className="status-badge status-success">Berhasil</span>
      case 'processing':
        return <span className="status-badge status-processing">Diproses</span>
      case 'failed':
        return <span className="status-badge status-failed">Gagal</span>
      default:
        return <span className="status-badge">{status}</span>
    }
  }

  const handleRetryPayment = async (paymentId) => {
    try {
      const result = await retryPayment(paymentId);
      if (result.success) {
        // Refresh payment data
        const paymentsResult = await getAllPayments(statusFilter === 'all' ? null : statusFilter);
        if (paymentsResult.success) {
          setPayments(paymentsResult.payments);
        }
        alert('Payment retry initiated successfully');
      } else {
        alert('Failed to retry payment: ' + result.error);
      }
    } catch (error) {
      console.error('Error retrying payment:', error);
      alert('Error retrying payment');
    }
  }

  const handleUpdatePaymentStatus = async (paymentId, newStatus) => {
    try {
      const result = await updatePaymentStatus(paymentId, newStatus, `Status updated to ${newStatus} by admin`);
      if (result.success) {
        // Refresh payment data
        const paymentsResult = await getAllPayments(statusFilter === 'all' ? null : statusFilter);
        if (paymentsResult.success) {
          setPayments(paymentsResult.payments);
        }
        alert('Payment status updated successfully');
      } else {
        alert('Failed to update payment status: ' + result.error);
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
      alert('Error updating payment status');
    }
  }

  const handleViewDetails = (paymentId) => {
    // Navigate to payment details page or show modal
    console.log(`Viewing details for payment ${paymentId}`)
    // You can implement a modal or navigate to detail page
  }

  const handleRefreshPayments = async () => {
    setIsLoading(true);
    try {
      const paymentsResult = await getAllPayments(statusFilter === 'all' ? null : statusFilter);
      if (paymentsResult.success) {
        setPayments(paymentsResult.payments);
      }
      
      const statsResult = await getPaymentStats();
      if (statsResult.success) {
        setPaymentStats(statsResult.stats);
      }
    } catch (error) {
      console.error('Error refreshing payments:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1); // Reset to first page when filtering
  }

  // Pagination logic
  const indexOfLastPayment = currentPage * paymentsPerPage;
  const indexOfFirstPayment = indexOfLastPayment - paymentsPerPage;
  const currentPayments = payments.slice(indexOfFirstPayment, indexOfLastPayment);
  const totalPages = Math.ceil(payments.length / paymentsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (loading || isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading payment data...</p>
      </div>
    );
  }

  if (!user || userProfile?.role !== 'admin') {
    return (
      <div className="access-denied">
        <h2>Access Denied</h2>
        <p>You don't have permission to access this page.</p>
      </div>
    );
  }

  return (
    <>
      <Sidebar />
      <div className="main-content">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="fw-bold">Payment Gateway</h2>
          <div>
            <button 
              className="btn btn-outline-secondary me-2"
              onClick={handleRefreshPayments}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
            <select 
              className="form-select" 
              style={{width: 'auto', display: 'inline-block'}}
              value={statusFilter}
              onChange={handleStatusFilterChange}
            >
              <option value="all">Semua Status</option>
              <option value="success">Berhasil</option>
              <option value="processing">Diproses</option>
              <option value="failed">Gagal</option>
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="summary-card">
              <div className="summary-icon bg-primary">💰</div>
              <div className="summary-info">
                <h4>{paymentStats ? formatCurrency(paymentStats.totalRevenue) : 'Loading...'}</h4>
                <p>Pendapatan Total</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="summary-card">
              <div className="summary-icon bg-success">📊</div>
              <div className="summary-info">
                <h4>{paymentStats ? paymentStats.totalTransactions : '0'}</h4>
                <p>Total Transaksi</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="summary-card">
              <div className="summary-icon bg-warning">📈</div>
              <div className="summary-info">
                <h4>{paymentStats ? formatCurrency(paymentStats.averageTransaction) : 'Rp 0'}</h4>
                <p>Rata-rata Transaksi</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="summary-card">
              <div className="summary-icon bg-info">✅</div>
              <div className="summary-info">
                <h4>{paymentStats ? paymentStats.successRate : '0'}%</h4>
                <p>Tingkat Sukses</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="table-container">
          {currentPayments.length === 0 ? (
            <div className="no-data">
              <p>Tidak ada data transaksi pembayaran.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-light">
                  <tr>
                    <th>ID Transaksi</th>
                    <th>Customer</th>
                    <th>Email</th>
                    <th>Tanggal & Waktu</th>
                    <th>Metode Pembayaran</th>
                    <th>Jumlah</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td>
                        <div className="fw-bold text-primary">{payment.transactionId}</div>
                        <small className="text-muted">Ref: {payment.reference || 'N/A'}</small>
                      </td>
                      <td>{payment.customer || 'N/A'}</td>
                      <td className="text-muted">{payment.customerEmail || 'N/A'}</td>
                      <td>
                        <div>{payment.date}</div>
                        <small className="text-muted">{payment.time}</small>
                      </td>
                      <td>{payment.method || 'N/A'}</td>
                      <td className="fw-bold">{formatCurrency(payment.amount)}</td>
                      <td>{getStatusBadge(payment.status)}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <button 
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleViewDetails(payment.id)}
                          >
                            Detail
                          </button>
                          {payment.status === 'failed' && (
                            <button 
                              className="btn btn-sm btn-warning"
                              onClick={() => handleRetryPayment(payment.id)}
                            >
                              Retry
                            </button>
                          )}
                          {payment.status === 'processing' && (
                            <div className="btn-group">
                              <button 
                                className="btn btn-sm btn-success"
                                onClick={() => handleUpdatePaymentStatus(payment.id, 'success')}
                              >
                                Approve
                              </button>
                              <button 
                                className="btn btn-sm btn-danger"
                                onClick={() => handleUpdatePaymentStatus(payment.id, 'failed')}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="d-flex justify-content-between align-items-center mt-4">
            <span className="text-muted">
              Menampilkan {indexOfFirstPayment + 1}-{Math.min(indexOfLastPayment, payments.length)} dari {payments.length} transaksi
            </span>
            <nav>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button 
                    className="page-link"
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                </li>
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const pageNumber = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                  if (pageNumber <= totalPages) {
                    return (
                      <li key={pageNumber} className={`page-item ${currentPage === pageNumber ? 'active' : ''}`}>
                        <button 
                          className="page-link"
                          onClick={() => paginate(pageNumber)}
                        >
                          {pageNumber}
                        </button>
                      </li>
                    );
                  }
                  return null;
                })}
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button 
                    className="page-link"
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>

      <style jsx>{`
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background-color: #f8f9fa;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #007bff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .access-denied {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background-color: #f8f9fa;
          text-align: center;
        }

        .no-data {
          padding: 3rem;
          text-align: center;
          color: #6c757d;
        }

        .table-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          overflow: hidden;
        }

        .summary-card {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .summary-icon {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          color: white;
        }

        .summary-info h4 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: bold;
          color: #495057;
        }

        .summary-info p {
          margin: 0.25rem 0 0 0;
          color: #6c757d;
          font-size: 0.9rem;
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .status-success {
          background-color: #d1ecf1;
          color: #0c5460;
        }

        .status-processing {
          background-color: #fff3cd;
          color: #856404;
        }

        .status-failed {
          background-color: #f8d7da;
          color: #721c24;
        }

        .table th {
          border-top: none;
          font-weight: 600;
          color: #495057;
        }

        .table td {
          vertical-align: middle;
        }

        .main-content {
          margin-left: 250px;
          padding: 2rem;
          background-color: #f8f9fa;
          min-height: 100vh;
        }

        .row {
          display: flex;
          flex-wrap: wrap;
          margin: -0.5rem;
        }

        .col-md-3 {
          flex: 0 0 25%;
          max-width: 25%;
          padding: 0.5rem;
        }

        .d-flex {
          display: flex;
        }

        .justify-content-between {
          justify-content: space-between;
        }

        .align-items-center {
          align-items: center;
        }

        .gap-2 {
          gap: 0.5rem;
        }

        .mb-4 {
          margin-bottom: 1.5rem;
        }

        .mt-4 {
          margin-top: 1.5rem;
        }

        .me-2 {
          margin-right: 0.5rem;
        }

        .fw-bold {
          font-weight: bold;
        }

        .text-primary {
          color: #007bff;
        }

        .text-muted {
          color: #6c757d;
        }

        .btn {
          padding: 0.375rem 0.75rem;
          border-radius: 4px;
          border: 1px solid;
          cursor: pointer;
          font-size: 0.875rem;
          text-decoration: none;
          display: inline-block;
          background: none;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-sm {
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
        }

        .btn-outline-primary {
          color: #007bff;
          border-color: #007bff;
          background: white;
        }

        .btn-outline-primary:hover:not(:disabled) {
          background: #007bff;
          color: white;
        }

        .btn-outline-secondary {
          color: #6c757d;
          border-color: #6c757d;
          background: white;
        }

        .btn-outline-secondary:hover:not(:disabled) {
          background: #6c757d;
          color: white;
        }

        .btn-warning {
          background: #ffc107;
          border-color: #ffc107;
          color: #212529;
        }

        .btn-warning:hover:not(:disabled) {
          background: #e0a800;
          border-color: #d39e00;
        }

        .btn-success {
          background: #28a745;
          border-color: #28a745;
          color: white;
        }

        .btn-success:hover:not(:disabled) {
          background: #218838;
          border-color: #1e7e34;
        }

        .btn-danger {
          background: #dc3545;
          border-color: #dc3545;
          color: white;
        }

        .btn-danger:hover:not(:disabled) {
          background: #c82333;
          border-color: #bd2130;
        }

        .btn-group {
          display: flex;
          gap: 0.25rem;
        }

        .form-select {
          padding: 0.375rem 0.75rem;
          border: 1px solid #ced4da;
          border-radius: 4px;
          background: white;
        }

        .table {
          width: 100%;
          border-collapse: collapse;
        }

        .table-hover tbody tr:hover {
          background-color: rgba(0,0,0,0.05);
        }

        .table-light {
          background-color: #f8f9fa;
        }

        .table th, .table td {
          padding: 0.75rem;
          border-bottom: 1px solid #dee2e6;
        }

        .table-responsive {
          overflow-x: auto;
        }

        .pagination {
          display: flex;
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .pagination-sm .page-link {
          padding: 0.25rem 0.5rem;
          font-size: 0.875rem;
        }

        .page-item .page-link {
          padding: 0.375rem 0.75rem;
          margin-left: -1px;
          color: #007bff;
          background-color: #fff;
          border: 1px solid #dee2e6;
          text-decoration: none;
          cursor: pointer;
        }

        .page-item.active .page-link {
          background-color: #007bff;
          border-color: #007bff;
          color: white;
        }

        .page-item.disabled .page-link {
          color: #6c757d;
          background-color: #fff;
          border-color: #dee2e6;
          cursor: not-allowed;
        }

        .page-item .page-link:hover:not(.disabled) {
          background-color: #e9ecef;
          border-color: #dee2e6;
        }

        .mb-0 {
          margin-bottom: 0;
        }

        @media (max-width: 768px) {
          .main-content {
            margin-left: 0;
            padding: 1rem;
          }

          .col-md-3 {
            flex: 0 0 100%;
            max-width: 100%;
          }

          .d-flex {
            flex-direction: column;
            gap: 1rem;
          }

          .table-responsive {
            font-size: 0.875rem;
          }

          .btn-group {
            flex-direction: column;
          }
        }
      `}</style>
    </>
  )
}