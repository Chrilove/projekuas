// components/ShipmentDetailModal.js
'use client';
import { useState } from 'react';
import { updateShipment, updateTrackingNumber } from '../lib/shipments';

export default function ShipmentDetailModal({ shipment, show, onHide, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    courier: shipment?.courier || '',
    service: shipment?.service || '',
    trackingNumber: shipment?.trackingNumber || '',
    weight: shipment?.weight || '',
    cost: shipment?.cost || '',
    estimatedDelivery: shipment?.estimatedDelivery || '',
    notes: shipment?.notes || ''
  });

  if (!show || !shipment) return null;

  const handleSave = async () => {
    try {
      const result = await updateShipment(shipment.id, editData);
      
      if (result.success) {
        alert('Data pengiriman berhasil diperbarui!');
        setIsEditing(false);
        onUpdate();
      } else {
        alert('Gagal memperbarui data: ' + result.error);
      }
    } catch (error) {
      alert('Terjadi kesalahan: ' + error.message);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      preparing: { class: 'bg-warning text-dark', text: 'Sedang Disiapkan' },
      in_transit: { class: 'bg-info text-white', text: 'Dalam Perjalanan' },
      delivered: { class: 'bg-success text-white', text: 'Terkirim' },
      returned: { class: 'bg-danger text-white', text: 'Dikembalikan' },
      cancelled: { class: 'bg-secondary text-white', text: 'Dibatalkan' }
    };
    
    const config = statusConfig[status] || { class: 'bg-light text-dark', text: status };
    return <span className={`badge ${config.class}`}>{config.text}</span>;
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              Detail Pengiriman - {shipment.shipmentNumber}
            </h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={onHide}
            ></button>
          </div>
          <div className="modal-body">
            <div className="row">
              {/* Left Column - Shipment Info */}
              <div className="col-md-6">
                <div className="card mb-3">
                  <div className="card-header">
                    <h6 className="mb-0">Informasi Pengiriman</h6>
                  </div>
                  <div className="card-body">
                    <div className="mb-3">
                      <label className="form-label fw-bold">Nomor Pengiriman</label>
                      <p className="mb-1">{shipment.shipmentNumber}</p>
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label fw-bold">Nomor Pesanan</label>
                      <p className="mb-1">
                        <span className="badge bg-light text-dark">{shipment.orderNumber}</span>
                      </p>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-bold">Status</label>
                      <p className="mb-1">{getStatusBadge(shipment.status)}</p>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-bold">Kurir</label>
                      {isEditing ? (
                        <select 
                          className="form-select"
                          value={editData.courier}
                          onChange={(e) => setEditData({...editData, courier: e.target.value})}
                        >
                          <option value="JNE">JNE</option>
                          <option value="TIKI">TIKI</option>
                          <option value="POS Indonesia">POS Indonesia</option>
                          <option value="J&T Express">J&T Express</option>
                          <option value="SiCepat">SiCepat</option>
                          <option value="AnterAja">AnterAja</option>
                        </select>
                      ) : (
                        <p className="mb-1">{shipment.courier}</p>
                      )}
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-bold">Layanan</label>
                      {isEditing ? (
                        <input 
                          type="text" 
                          className="form-control"
                          value={editData.service}
                          onChange={(e) => setEditData({...editData, service: e.target.value})}
                        />
                      ) : (
                        <p className="mb-1">{shipment.service}</p>
                      )}
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-bold">Nomor Resi</label>
                      {isEditing ? (
                        <input 
                          type="text" 
                          className="form-control"
                          value={editData.trackingNumber}
                          onChange={(e) => setEditData({...editData, trackingNumber: e.target.value})}
                        />
                      ) : (
                        <div>
                          {shipment.trackingNumber ? (
                            <div className="d-flex align-items-center">
                              <code className="me-2">{shipment.trackingNumber}</code>
                              <button 
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => window.open(`https://cekresi.com/?noresi=${shipment.trackingNumber}`, '_blank')}
                              >
                                <i className="fas fa-external-link-alt me-1"></i>
                                Lacak
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted">Belum ada nomor resi</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Reseller & Shipping Info */}
              <div className="col-md-6">
                <div className="card mb-3">
                  <div className="card-header">
                    <h6 className="mb-0">Informasi Reseller</h6>
                  </div>
                  <div className="card-body">
                    <div className="mb-3">
                      <label className="form-label fw-bold">Nama Reseller</label>
                      <p className="mb-1">{shipment.resellerName}</p>
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label fw-bold">Nomor Telepon</label>
                      <p className="mb-1">
                        <a href={`tel:${shipment.resellerPhone}`} className="text-decoration-none">
                          {shipment.resellerPhone}
                        </a>
                      </p>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-bold">Alamat Pengiriman</label>
                      <div className="border rounded p-2 bg-light">
                        <p className="mb-1">{shipment.shippingAddress?.recipientName}</p>
                        <p className="mb-1">{shipment.shippingAddress?.phone}</p>
                        <p className="mb-0 small">{shipment.shippingAddress?.fullAddress}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <h6 className="mb-0">Detail Pengiriman</h6>
                  </div>
                  <div className="card-body">
                    <div className="mb-3">
                      <label className="form-label fw-bold">Berat</label>
                      {isEditing ? (
                        <input 
                          type="text" 
                          className="form-control"
                          value={editData.weight}
                          onChange={(e) => setEditData({...editData, weight: e.target.value})}
                        />
                      ) : (
                        <p className="mb-1">{shipment.weight}</p>
                      )}
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-bold">Biaya Pengiriman</label>
                      {isEditing ? (
                        <input 
                          type="text" 
                          className="form-control"
                          value={editData.cost}
                          onChange={(e) => setEditData({...editData, cost: e.target.value})}
                        />
                      ) : (
                        <p className="mb-1 text-success fw-bold">{shipment.cost}</p>
                      )}
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-bold">Estimasi Pengiriman</label>
                      {isEditing ? (
                        <input 
                          type="date" 
                          className="form-control"
                          value={editData.estimatedDelivery}
                          onChange={(e) => setEditData({...editData, estimatedDelivery: e.target.value})}
                        />
                      ) : (
                        <p className="mb-1">{shipment.estimatedDelivery || '-'}</p>
                      )}
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-bold">Catatan</label>
                      {isEditing ? (
                        <textarea 
                          className="form-control"
                          rows="3"
                          value={editData.notes}
                          onChange={(e) => setEditData({...editData, notes: e.target.value})}
                          placeholder="Tambahkan catatan..."
                        />
                      ) : (
                        <p className="mb-1">{shipment.notes || '-'}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="row mt-4">
              <div className="col-12">
                <div className="card">
                  <div className="card-header">
                    <h6 className="mb-0">Timeline</h6>
                  </div>
                  <div className="card-body">
                    <div className="timeline">
                      <div className="timeline-item">
                        <div className="timeline-marker bg-success"></div>
                        <div className="timeline-content">
                          <h6 className="mb-1">Pengiriman Dibuat</h6>
                          <p className="mb-0 text-muted small">
                            {formatDate(shipment.createdAt)}
                          </p>
                        </div>
                      </div>
                      
                      {shipment.trackingNumber && (
                        <div className="timeline-item">
                          <div className="timeline-marker bg-info"></div>
                          <div className="timeline-content">
                            <h6 className="mb-1">Nomor Resi Ditambahkan</h6>
                            <p className="mb-0 text-muted small">
                              Resi: <code>{shipment.trackingNumber}</code>
                            </p>
                          </div>
                        </div>
                      )}
                      
                      <div className="timeline-item">
                        <div className="timeline-marker bg-warning"></div>
                        <div className="timeline-content">
                          <h6 className="mb-1">Terakhir Diperbarui</h6>
                          <p className="mb-0 text-muted small">
                            {formatDate(shipment.updatedAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            {isEditing ? (
              <>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setIsEditing(false)}
                >
                  Batal
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleSave}
                >
                  Simpan Perubahan
                </button>
              </>
            ) : (
              <>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={onHide}
                >
                  Tutup
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={() => setIsEditing(true)}
                >
                  <i className="fas fa-edit me-2"></i>
                  Edit
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .timeline {
          position: relative;
          padding-left: 30px;
        }

        .timeline::before {
          content: '';
          position: absolute;
          left: 15px;
          top: 0;
          bottom: 0;
          width: 2px;
          background: #dee2e6;
        }

        .timeline-item {
          position: relative;
          margin-bottom: 20px;
        }

        .timeline-marker {
          position: absolute;
          left: -22px;
          top: 5px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid #fff;
          box-shadow: 0 0 0 2px #dee2e6;
        }

        .timeline-content {
          background: #f8f9fa;
          padding: 10px 15px;
          border-radius: 8px;
          border-left: 3px solid #007bff;
        }

        .modal {
          z-index: 1050;
        }

        code {
          background-color: #f8f9fa;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}