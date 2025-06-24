// CreateShipmentModal.js - Fixed version
'use client';
import { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  serverTimestamp,
  query,
  where,
  getDocs,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function CreateShipmentModal({ show, onClose, order, onShipmentCreated }) {
  const [formData, setFormData] = useState({
    courier: '',
    service: '',
    cost: '',
    estimatedDelivery: '',
    trackingNumber: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Generate shipment number
  const generateShipmentNumber = async () => {
    try {
      const today = new Date();
      const datePrefix = today.getFullYear().toString().slice(-2) + 
                        String(today.getMonth() + 1).padStart(2, '0') + 
                        String(today.getDate()).padStart(2, '0');
      
      // Get the last shipment number for today
      const shipmentsRef = collection(db, 'shipments');
      const q = query(
        shipmentsRef,
        where('shipmentNumber', '>=', `SHP${datePrefix}0001`),
        where('shipmentNumber', '<=', `SHP${datePrefix}9999`),
        orderBy('shipmentNumber', 'desc'),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      let nextNumber = 1;
      
      if (!snapshot.empty) {
        const lastShipment = snapshot.docs[0].data();
        const lastNumber = parseInt(lastShipment.shipmentNumber.slice(-4));
        nextNumber = lastNumber + 1;
      }
      
      return `SHP${datePrefix}${String(nextNumber).padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generating shipment number:', error);
      // Fallback to timestamp-based number
      return `SHP${Date.now().toString().slice(-8)}`;
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Validate required fields
      if (!formData.courier || !formData.service || !formData.cost) {
        throw new Error('Mohon lengkapi data kurir, layanan, dan biaya pengiriman');
      }

      // Generate shipment number
      const shipmentNumber = await generateShipmentNumber();

      // Create shipment data
      const shipmentData = {
        shipmentNumber,
        orderId: order.id,
        orderNumber: order.orderNumber || order.id.slice(-6).toUpperCase(),
        
        // Reseller info
        resellerId: order.resellerId,
        resellerName: order.resellerName,
        resellerEmail: order.resellerEmail,
        
        // Shipping details
        courier: formData.courier,
        service: formData.service,
        cost: parseFloat(formData.cost) || 0,
        estimatedDelivery: formData.estimatedDelivery,
        trackingNumber: formData.trackingNumber || '',
        notes: formData.notes || '',
        
        // Shipping address
        shippingAddress: order.shippingAddress,
        
        // Order summary
        products: order.products || [],
        totalAmount: order.totalAmount || 0,
        totalCommission: order.totalCommission || 0,
        
        // Status and timestamps
        status: 'shipped',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        
        // Admin info (you might want to get this from auth context)
        createdBy: 'admin' // Replace with actual admin user info
      };

      // Save shipment to Firestore
      const shipmentRef = await addDoc(collection(db, 'shipments'), shipmentData);
      
      console.log('Shipment created successfully:', shipmentRef.id);
      
      // Call the success callback with the created shipment data
      if (onShipmentCreated && typeof onShipmentCreated === 'function') {
        await onShipmentCreated({
          id: shipmentRef.id,
          ...shipmentData
        });
      }
      
      // Show success message
      alert(`Pengiriman berhasil dibuat!\nNomor Pengiriman: ${shipmentNumber}`);
      
      // Close modal
      onClose();
      
    } catch (error) {
      console.error('Error creating shipment:', error);
      setError(error.message || 'Terjadi kesalahan saat membuat pengiriman');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form when modal opens
  useEffect(() => {
    if (show) {
      setFormData({
        courier: '',
        service: '',
        cost: '',
        estimatedDelivery: '',
        trackingNumber: '',
        notes: ''
      });
      setError('');
    }
  }, [show]);

  if (!show || !order) return null;

  return (
    <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">
              <i className="fas fa-shipping-fast me-2"></i>
              Buat Pengiriman - #{order.orderNumber || order.id.slice(-6).toUpperCase()}
            </h5>
            <button 
              type="button" 
              className="btn-close btn-close-white"
              onClick={onClose}
              disabled={isSubmitting}
            ></button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {error && (
                <div className="alert alert-danger">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  {error}
                </div>
              )}

              {/* Order Summary */}
              <div className="card mb-3">
                <div className="card-header">
                  <h6 className="mb-0"><i className="fas fa-info-circle me-2"></i>Ringkasan Pesanan</h6>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6">
                      <table className="table table-sm table-borderless">
                        <tbody>
                          <tr><td><strong>ID Pesanan:</strong></td><td>#{order.orderNumber || order.id.slice(-6).toUpperCase()}</td></tr>
                          <tr><td><strong>Reseller:</strong></td><td>{order.resellerName}</td></tr>
                          <tr><td><strong>Total:</strong></td><td><strong className="text-success">Rp {(order.totalAmount || 0).toLocaleString('id-ID')}</strong></td></tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="col-md-6">
                      {order.shippingAddress && (
                        <div>
                          <strong>Alamat Pengiriman:</strong>
                          <div className="border p-2 mt-1 bg-light small">
                            <div>{order.shippingAddress.name}</div>
                            <div>{order.shippingAddress.phone}</div>
                            <div>{order.shippingAddress.address}</div>
                            <div>{order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.postalCode}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipping Form */}
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Kurir <span className="text-danger">*</span></label>
                    <select 
                      className="form-select"
                      name="courier"
                      value={formData.courier}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Pilih Kurir</option>
                      <option value="JNE">JNE</option>
                      <option value="TIKI">TIKI</option>
                      <option value="POS">POS Indonesia</option>
                      <option value="J&T">J&T Express</option>
                      <option value="SiCepat">SiCepat</option>
                      <option value="AnterAja">AnterAja</option>
                      <option value="Ninja">Ninja Express</option>
                      <option value="Lion Parcel">Lion Parcel</option>
                    </select>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Layanan <span className="text-danger">*</span></label>
                    <select 
                      className="form-select"
                      name="service"
                      value={formData.service}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Pilih Layanan</option>
                      <option value="REG">REG (Regular)</option>
                      <option value="YES">YES (Yakin Esok Sampai)</option>
                      <option value="OKE">OKE (Ongkir Ekonomis)</option>
                      <option value="Express">Express</option>
                      <option value="Super Speed">Super Speed</option>
                      <option value="Cargo">Cargo</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Biaya Kirim <span className="text-danger">*</span></label>
                    <div className="input-group">
                      <span className="input-group-text">Rp</span>
                      <input 
                        type="number"
                        className="form-control"
                        name="cost"
                        value={formData.cost}
                        onChange={handleInputChange}
                        placeholder="0"
                        min="0"
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Estimasi Pengiriman</label>
                    <input 
                      type="text"
                      className="form-control"
                      name="estimatedDelivery"
                      value={formData.estimatedDelivery}
                      onChange={handleInputChange}
                      placeholder="contoh: 2-3 hari"
                    />
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Nomor Resi (opsional)</label>
                <input 
                  type="text"
                  className="form-control"
                  name="trackingNumber"
                  value={formData.trackingNumber}
                  onChange={handleInputChange}
                  placeholder="Masukkan nomor resi jika sudah ada"
                />
                <small className="text-muted">Nomor resi dapat diisi nanti jika belum tersedia</small>
              </div>

              <div className="mb-3">
                <label className="form-label">Catatan</label>
                <textarea 
                  className="form-control"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Catatan tambahan untuk pengiriman..."
                ></textarea>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Batal
              </button>
              <button 
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Membuat Pengiriman...
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane me-2"></i>
                    Membuat Pengiriman
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}