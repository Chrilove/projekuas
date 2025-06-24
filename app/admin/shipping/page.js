'use client';

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useRouter } from 'next/navigation';
import { auth } from '@/app/lib/firebase';
import { getUserProfile } from '@/app/lib/auth';
import { 
  getAllShipments, 
  getShipmentStats, 
  updateShipmentStatus, 
  deleteShipment,
  getShipmentByTracking 
} from '@/app/lib/shipments';
import Sidebar from '@/app/components/Sidebar';

export default function ShippingPage() {
  const [user, loading, error] = useAuthState(auth);
  const [userProfile, setUserProfile] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [stats, setStats] = useState({});
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedShipments, setSelectedShipments] = useState([]);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const itemsPerPage = 10;
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

  // Load shipments and stats
  useEffect(() => {
    if (userProfile?.role === 'admin') {
      loadData();
    }
  }, [userProfile, selectedStatus]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load shipments
      const shipmentsResult = await getAllShipments(selectedStatus);
      if (shipmentsResult.success) {
        setShipments(shipmentsResult.shipments);
      }

      // Load stats
      const statsResult = await getShipmentStats();
      if (statsResult.success) {
        setStats(statsResult.stats);
      }
    } catch (error) {
      console.error('Error loading shipping data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter shipments based on search
  const filteredShipments = shipments.filter(shipment => {
    const matchesSearch = searchTerm === '' || 
      shipment.shipmentNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.trackingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.resellerName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredShipments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedShipments = filteredShipments.slice(startIndex, startIndex + itemsPerPage);

  // Handle checkbox selection
  const handleSelectShipment = (shipmentId) => {
    setSelectedShipments(prev => 
      prev.includes(shipmentId) 
        ? prev.filter(id => id !== shipmentId)
        : [...prev, shipmentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedShipments.length === paginatedShipments.length) {
      setSelectedShipments([]);
    } else {
      setSelectedShipments(paginatedShipments.map(s => s.id));
    }
  };

  // Handle status update
  const handleUpdateStatus = async () => {
    if (!selectedShipment || !newStatus) return;

    try {
      const result = await updateShipmentStatus(selectedShipment.id, newStatus, statusNotes);
      if (result.success) {
        setShowUpdateModal(false);
        setSelectedShipment(null);
        setNewStatus('');
        setStatusNotes('');
        loadData();
        alert('Status pengiriman berhasil diperbarui!');
      } else {
        alert('Gagal memperbarui status: ' + result.error);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Terjadi kesalahan saat memperbarui status');
    }
  };

  // Handle delete shipment
  const handleDeleteShipment = async (shipmentId) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pengiriman ini?')) return;

    try {
      const result = await deleteShipment(shipmentId);
      if (result.success) {
        loadData();
        alert('Pengiriman berhasil dihapus!');
      } else {
        alert('Gagal menghapus pengiriman: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting shipment:', error);
      alert('Terjadi kesalahan saat menghapus pengiriman');
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  // Get status badge class
  const getStatusBadge = (status) => {
    const badges = {
      'preparing': 'bg-warning text-dark',
      'in_transit': 'bg-info text-white',
      'delivered': 'bg-success text-white',
      'returned': 'bg-secondary text-white',
      'cancelled': 'bg-danger text-white'
    };
    return badges[status] || 'bg-secondary text-white';
  };

  // Get status text
  const getStatusText = (status) => {
    const statusTexts = {
      'preparing': 'Mempersiapkan',
      'in_transit': 'Dalam Perjalanan',
      'delivered': 'Terkirim',
      'returned': 'Dikembalikan',
      'cancelled': 'Dibatalkan'
    };
    return statusTexts[status] || status;
  };

  if (loading || !userProfile) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (userProfile.role !== 'admin') {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="alert alert-danger">
          <h4>Akses Ditolak</h4>
          <p>Anda tidak memiliki izin untuk mengakses halaman ini.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex">
      <Sidebar />
      <div className="flex-grow-1 p-4" style={{ marginLeft: '280px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="d-flex align-items-center">
            <i className="fas fa-shipping-fast text-primary me-2"></i>
            <h2 className="mb-0">Manajemen Pengiriman</h2>
          </div>
          <button 
            className="btn btn-primary"
            onClick={loadData}
            disabled={isLoading}
          >
            <i className="fas fa-sync-alt me-2"></i>
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="row mb-4">
          <div className="col-md-3 mb-3">
            <div className="card bg-primary text-white h-100">
              <div className="card-body d-flex align-items-center">
                <div className="flex-grow-1">
                  <h3 className="mb-0">{stats.total || 0}</h3>
                  <p className="mb-0">Total Pengiriman</p>
                </div>
                <i className="fas fa-box fa-2x opacity-75"></i>
              </div>
            </div>
          </div>
          <div className="col-md-3 mb-3">
            <div className="card bg-warning text-dark h-100">
              <div className="card-body d-flex align-items-center">
                <div className="flex-grow-1">
                  <h3 className="mb-0">{stats.preparing || 0}</h3>
                  <p className="mb-0">Dalam Persiapan</p>
                </div>
                <i className="fas fa-clock fa-2x opacity-75"></i>
              </div>
            </div>
          </div>
          <div className="col-md-3 mb-3">
            <div className="card bg-success text-white h-100">
              <div className="card-body d-flex align-items-center">
                <div className="flex-grow-1">
                  <h3 className="mb-0">{stats.delivered || 0}</h3>
                  <p className="mb-0">Terkirim</p>
                </div>
                <i className="fas fa-check-circle fa-2x opacity-75"></i>
              </div>
            </div>
          </div>
          <div className="col-md-3 mb-3">
            <div className="card bg-info text-white h-100">
              <div className="card-body d-flex align-items-center">
                <div className="flex-grow-1">
                  <h3 className="mb-0">{formatCurrency(stats.totalCost)}</h3>
                  <p className="mb-0">Total Biaya</p>
                </div>
                <i className="fas fa-money-bill-wave fa-2x opacity-75"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card mb-4">
          <div className="card-body">
            <div className="row">
              <div className="col-md-4">
                <label className="form-label">Status</label>
                <select 
                  className="form-select"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="all">Semua Status</option>
                  <option value="preparing">Mempersiapkan</option>
                  <option value="in_transit">Dalam Perjalanan</option>
                  <option value="delivered">Terkirim</option>
                  <option value="returned">Dikembalikan</option>
                  <option value="cancelled">Dibatalkan</option>
                </select>
              </div>
              <div className="col-md-8">
                <label className="form-label">Cari</label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="fas fa-search"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Cari berdasarkan nomor pengiriman, tracking, atau reseller..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Shipments Table */}
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Daftar Pengiriman</h5>
            {selectedShipments.length > 0 && (
              <div className="badge bg-primary">
                {selectedShipments.length} item terpilih
              </div>
            )}
          </div>
          <div className="card-body p-0">
            {isLoading ? (
              <div className="text-center p-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selectedShipments.length === paginatedShipments.length && paginatedShipments.length > 0}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th>No. Pengiriman</th>
                      <th>No. Pesanan</th>
                      <th>Reseller</th>
                      <th>Kurir</th>
                      <th>Alamat Tujuan</th>
                      <th>Biaya</th>
                      <th>Status</th>
                      <th>Tanggal</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedShipments.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="text-center py-4">
                          <div className="text-muted">
                            <i className="fas fa-inbox fa-3x mb-3"></i>
                            <p>Tidak ada data pengiriman</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedShipments.map((shipment) => (
                        <tr key={shipment.id}>
                          <td>
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={selectedShipments.includes(shipment.id)}
                              onChange={() => handleSelectShipment(shipment.id)}
                            />
                          </td>
                          <td>
                            <div>
                              <strong>{shipment.shipmentNumber}</strong>
                              <br />
                              <small className="text-muted">
                                Resi: {shipment.trackingNumber}
                              </small>
                            </div>
                          </td>
                          <td>
                            <strong>#{shipment.orderNumber}</strong>
                          </td>
                          <td>
                            <div>
                              <strong>{shipment.resellerName || 'Unknown'}</strong>
                              <br />
                              <small className="text-muted">
                                {shipment.resellerEmail}
                              </small>
                            </div>
                          </td>
                          <td>
                            <div>
                              <strong>{shipment.courier} - {shipment.service}</strong>
                              <br />
                              <small className="text-muted">
                                Est: {shipment.estimatedDays}
                              </small>
                            </div>
                          </td>
                          <td>
                            <div style={{ maxWidth: '200px' }}>
                              {shipment.shippingAddress?.street || 'N/A'}
                              <br />
                              <small className="text-muted">
                                {shipment.shippingAddress?.city}, {shipment.shippingAddress?.province}
                              </small>
                            </div>
                          </td>
                          <td>
                            <strong>{formatCurrency(shipment.cost)}</strong>
                          </td>
                          <td>
                            <span className={`badge ${getStatusBadge(shipment.status)}`}>
                              {getStatusText(shipment.status)}
                            </span>
                          </td>
                          <td>
                            <small>
                              {shipment.createdDate || 'N/A'}
                            </small>
                          </td>
                          <td>
                            <div className="btn-group" role="group">
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => {
                                  setSelectedShipment(shipment);
                                  setNewStatus(shipment.status);
                                  setShowUpdateModal(true);
                                }}
                                title="Update Status"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDeleteShipment(shipment.id)}
                                title="Hapus"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
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
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="card-footer">
              <nav aria-label="Page navigation">
                <ul className="pagination justify-content-center mb-0">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                  </li>
                  {[...Array(totalPages)].map((_, index) => (
                    <li key={index + 1} className={`page-item ${currentPage === index + 1 ? 'active' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => setCurrentPage(index + 1)}
                      >
                        {index + 1}
                      </button>
                    </li>
                  ))}
                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => setCurrentPage(currentPage + 1)}
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

        {/* Update Status Modal */}
        {showUpdateModal && (
          <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Update Status Pengiriman</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowUpdateModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Pengiriman</label>
                    <div className="form-control-plaintext">
                      <strong>{selectedShipment?.shipmentNumber}</strong> - {selectedShipment?.orderNumber}
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Status Baru</label>
                    <select
                      className="form-select"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                    >
                      <option value="preparing">Mempersiapkan</option>
                      <option value="in_transit">Dalam Perjalanan</option>
                      <option value="delivered">Terkirim</option>
                      <option value="returned">Dikembalikan</option>
                      <option value="cancelled">Dibatalkan</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Catatan</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={statusNotes}
                      onChange={(e) => setStatusNotes(e.target.value)}
                      placeholder="Catatan untuk update status (opsional)"
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowUpdateModal(false)}
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleUpdateStatus}
                  >
                    Update Status
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}