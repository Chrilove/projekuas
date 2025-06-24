// app/lib/shipments.js
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc, 
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';

// Generate shipment tracking number
export const generateTrackingNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `SHIP${new Date().getFullYear()}${timestamp}${random}`;
};

// Create shipment from order - FIXED VERSION
export const createShipmentFromOrder = async (orderData, shippingData = {}) => {
  try {
    // Debug: Log orderData untuk memastikan struktur data
    console.log('Order data received:', orderData);
    
    // Generate tracking number if not provided
    const trackingNumber = shippingData.trackingNumber || generateTrackingNumber();
    
    // Generate shipment number
    const shipmentNumber = `SHP${Date.now().toString().slice(-6)}`;
    
    const shipment = {
      shipmentNumber,
      trackingNumber,
      // FIX: Use orderData.id instead of orderData.orderId
      orderId: orderData.id || orderData._id || orderData.orderId, 
      orderNumber: orderData.orderNumber,
      customerId: orderData.customerId,
      customerName: orderData.customerName,
      customerEmail: orderData.customerEmail,
      customerPhone: orderData.customerPhone,
      shippingAddress: orderData.shippingAddress,
      resellerId: orderData.resellerId,
      resellerName: orderData.resellerName,
      resellerEmail: orderData.resellerEmail,
      items: orderData.items,
      totalWeight: orderData.totalWeight || 0,
      shippingMethod: orderData.shippingMethod,
      
      // Use shipping data from form
      courier: shippingData.courier || orderData.courier || 'JNE',
      service: shippingData.service || 'REG',
      cost: shippingData.cost || orderData.shippingCost || 0,
      estimatedDays: shippingData.estimatedDays || '2-3 hari',
      notes: shippingData.notes || orderData.notes || '',
      
      status: 'preparing', // preparing, in_transit, delivered, returned, cancelled
      estimatedDelivery: shippingData.estimatedDelivery || orderData.estimatedDelivery,
      actualDelivery: null,
      adminNotes: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // Validasi orderId sebelum menyimpan
    if (!shipment.orderId) {
      throw new Error('Order ID is required but not found in orderData');
    }

    console.log('Shipment data to be saved:', shipment);
    
    const docRef = await addDoc(collection(db, 'shipments'), shipment);
    console.log('Shipment created with ID:', docRef.id);
    return { success: true, shipmentId: docRef.id, trackingNumber, shipmentNumber };
  } catch (error) {
    console.error('Error creating shipment:', error);
    return { success: false, error: error.message };
  }
};

// Update shipment status
export const updateShipmentStatus = async (shipmentId, status, notes = '') => {
  try {
    const shipmentRef = doc(db, 'shipments', shipmentId);
    const updateData = {
      status,
      adminNotes: notes,
      updatedAt: serverTimestamp()
    };

    // If status is delivered, set actual delivery date
    if (status === 'delivered') {
      updateData.actualDelivery = serverTimestamp();
    }

    await updateDoc(shipmentRef, updateData);
    return { success: true };
  } catch (error) {
    console.error('Error updating shipment status:', error);
    return { success: false, error: error.message };
  }
};

// Get all shipments (for admin)
export const getAllShipments = async (statusFilter = null) => {
  try {
    const shipmentsRef = collection(db, 'shipments');
    let q;
    
    if (statusFilter && statusFilter !== 'all') {
      q = query(
        shipmentsRef, 
        where('status', '==', statusFilter),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(shipmentsRef, orderBy('createdAt', 'desc'));
    }
    
    const querySnapshot = await getDocs(q);
    const shipments = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      shipments.push({
        id: doc.id,
        ...data,
        createdDate: data.createdAt ? data.createdAt.toDate().toLocaleDateString('id-ID') : 'N/A'
      });
    });
    
    return { success: true, shipments };
  } catch (error) {
    console.error('Error getting all shipments:', error);
    return { success: false, error: error.message };
  }
};

// Get shipment by tracking number
export const getShipmentByTracking = async (trackingNumber) => {
  try {
    const shipmentsRef = collection(db, 'shipments');
    const q = query(shipmentsRef, where('trackingNumber', '==', trackingNumber));
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return { success: false, error: 'Shipment not found' };
    }
    
    const shipmentDoc = querySnapshot.docs[0];
    return { 
      success: true, 
      shipment: { 
        id: shipmentDoc.id, 
        ...shipmentDoc.data() 
      } 
    };
  } catch (error) {
    console.error('Error getting shipment:', error);
    return { success: false, error: error.message };
  }
};

// Get shipments by reseller
export const getShipmentsByReseller = async (resellerId) => {
  try {
    const shipmentsRef = collection(db, 'shipments');
    const q = query(
      shipmentsRef, 
      where('resellerId', '==', resellerId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const shipments = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      shipments.push({
        id: doc.id,
        ...data,
        createdDate: data.createdAt ? data.createdAt.toDate().toLocaleDateString('id-ID') : 'N/A'
      });
    });
    
    return { success: true, shipments };
  } catch (error) {
    console.error('Error getting shipments by reseller:', error);
    return { success: false, error: error.message };
  }
};

// Get shipment statistics - UPDATED VERSION
export const getShipmentStats = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'shipments'));
    const shipments = querySnapshot.docs.map(doc => doc.data());

    const stats = {
      total: shipments.length,
      totalShipments: shipments.length,
      preparing: shipments.filter(s => s.status === 'preparing').length,
      inTransit: shipments.filter(s => s.status === 'in_transit').length,
      delivered: shipments.filter(s => s.status === 'delivered').length,
      returned: shipments.filter(s => s.status === 'returned').length,
      cancelled: shipments.filter(s => s.status === 'cancelled').length,
      
      // Legacy support for old status names
      pending: shipments.filter(s => s.status === 'pending').length,
      processed: shipments.filter(s => s.status === 'processed').length,
      shipped: shipments.filter(s => s.status === 'shipped').length,
      
      // Calculate total shipping cost
      totalCost: shipments.reduce((sum, s) => sum + (parseFloat(s.cost) || 0), 0)
    };

    return { success: true, stats };
  } catch (error) {
    console.error('Error getting shipment stats:', error);
    return { success: false, error: error.message };
  }
};

// Delete shipment (admin only)
export const deleteShipment = async (shipmentId) => {
  try {
    const shipmentRef = doc(db, 'shipments', shipmentId);
    await deleteDoc(shipmentRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting shipment:', error);
    return { success: false, error: error.message };
  }
};