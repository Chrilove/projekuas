// app/lib/orders.js - Enhanced version with proper imports
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
  writeBatch,
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { createPaymentTransaction } from './payments';
import { createShipmentFromOrder } from './shipments';

// Generate order number
export const generateOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substr(2, 3).toUpperCase();
  return `ORD${timestamp}${random}`;
};

// Create new order (for resellers) - Fixed function signature
export const createOrder = async (userId, orderData) => {
  try {
    const orderNumber = generateOrderNumber();
    
    const order = {
      orderNumber,
      resellerId: userId,
      resellerEmail: orderData.resellerEmail,
      resellerName: orderData.resellerName,
      resellerPhone: orderData.resellerPhone,
      products: orderData.products,
      totalAmount: orderData.totalAmount,
      totalCommission: orderData.totalCommission,
      shippingAddress: orderData.shippingAddress,
      paymentStatus: orderData.paymentStatus || 'waiting_payment',
      status: orderData.status || 'pending',
      paymentMethod: '',
      paymentProof: '',
      paymentProofURL: '',
      adminMessage: '',
      trackingNumber: '',
      estimatedDelivery: null,
      actualDelivery: null,
      resellerConfirmation: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'orders'), order);
    console.log('Order created with ID:', docRef.id);
    return { success: true, orderId: docRef.id, orderNumber };
  } catch (error) {
    console.error('Error creating order:', error);
    return { success: false, error: error.message };
  }
};

// Update order status (for admin and resellers) - FIXED VERSION
export const updateOrderStatus = async (orderId, status, adminMessage = '', additionalData = {}) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    
    const updateData = {
      status,
      adminMessage,
      updatedAt: serverTimestamp(),
      ...additionalData
    };

    // If status is completed and it's from reseller, mark reseller confirmation
    if (status === 'completed' && additionalData.confirmedByReseller) {
      updateData.resellerConfirmation = true;
      updateData.actualDelivery = serverTimestamp();
      updateData.adminMessage = adminMessage || 'Pesanan telah dikonfirmasi diterima oleh reseller';
    }

    // If status is shipped, create shipment automatically - FIXED VERSION
    if (status === 'shipped' && additionalData.createShipment) {
      const orderDoc = await getDoc(orderRef);
      if (orderDoc.exists()) {
        const orderData = orderDoc.data();
        
        // FIX: Structure data sesuai dengan yang diharapkan createShipmentFromOrder
        const shipmentOrderData = {
          id: orderId, // ← KEY FIX: gunakan 'id' bukan 'orderId'
          orderNumber: orderData.orderNumber,
          customerId: orderData.resellerId,
          customerName: orderData.resellerName,
          customerEmail: orderData.resellerEmail,
          customerPhone: orderData.resellerPhone,
          shippingAddress: orderData.shippingAddress,
          resellerId: orderData.resellerId,
          resellerName: orderData.resellerName,
          resellerEmail: orderData.resellerEmail,
          items: orderData.products, // products -> items
          totalWeight: additionalData.totalWeight || 1,
          shippingMethod: additionalData.shippingMethod || 'Regular',
          shippingCost: additionalData.shippingCost || 0,
          courier: additionalData.courier || 'JNE',
          estimatedDelivery: additionalData.estimatedDelivery,
          notes: additionalData.notes || ''
        };

        // Shipping data terpisah
        const shippingData = {
          courier: additionalData.courier || 'JNE',
          service: additionalData.service || 'REG',
          cost: additionalData.shippingCost || 0,
          estimatedDays: additionalData.estimatedDays || '2-3 hari',
          notes: additionalData.notes || '',
          estimatedDelivery: additionalData.estimatedDelivery
        };

        console.log('Creating shipment with order data:', shipmentOrderData);
        console.log('Shipping data:', shippingData);

        const shipmentResult = await createShipmentFromOrder(shipmentOrderData, shippingData);
        if (shipmentResult.success) {
          updateData.trackingNumber = shipmentResult.trackingNumber;
          console.log('Shipment created successfully:', shipmentResult);
        } else {
          console.error('Failed to create shipment:', shipmentResult.error);
        }
      }
    }

    await updateDoc(orderRef, updateData);
    
    // Create status log for audit trail
    await createOrderStatusLog(orderId, status, adminMessage);
    
    return { success: true };
  } catch (error) {
    console.error('Error updating order status:', error);
    return { success: false, error: error.message };
  }
};

// Create order status log for audit trail
export const createOrderStatusLog = async (orderId, status, message, actionBy = 'system') => {
  try {
    const logData = {
      orderId,
      status,
      message,
      actionBy,
      timestamp: serverTimestamp()
    };

    await addDoc(collection(db, 'orderStatusLogs'), logData);
    return { success: true };
  } catch (error) {
    console.error('Error creating order status log:', error);
    return { success: false, error: error.message };
  }
};

// Update payment status (for admin) - Enhanced with payment transaction creation
export const updatePaymentStatus = async (orderId, paymentStatus, orderStatus = null, adminMessage = '', paymentDetails = null) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    
    // Get order details first
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) {
      return { success: false, error: 'Order not found' };
    }
    
    const orderData = orderSnap.data();
    
    const updateData = {
      paymentStatus,
      adminMessage,
      updatedAt: serverTimestamp()
    };
    
    if (orderStatus) {
      updateData.status = orderStatus;
    }
    
    await updateDoc(orderRef, updateData);
    
    // Create payment transaction record if payment is successful
    if (paymentStatus === 'paid' && paymentDetails) {
      const paymentData = {
        orderId: orderId,
        orderNumber: orderData.orderNumber,
        customer: orderData.resellerName,
        customerEmail: orderData.resellerEmail,
        resellerId: orderData.resellerId,
        amount: orderData.totalAmount,
        method: paymentDetails.method || 'Manual',
        reference: paymentDetails.reference || '',
        status: 'success',
        type: 'payment',
        description: `Payment for order ${orderData.orderNumber}`
      };
      
      await createPaymentTransaction(paymentData);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating payment status:', error);
    return { success: false, error: error.message };
  }
};

// Update payment proof (for resellers) - Enhanced with payment transaction creation
export const updatePaymentProof = async (orderId, paymentMethod, paymentProof, paymentProofURL = '') => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    
    // Get order details first
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) {
      return { success: false, error: 'Order not found' };
    }
    
    const orderData = orderSnap.data();
    
    await updateDoc(orderRef, {
      paymentMethod,
      paymentProof,
      paymentProofURL,
      paymentStatus: 'waiting_verification',
      adminMessage: 'Bukti pembayaran telah dikirim. Menunggu verifikasi dari admin.',
      updatedAt: serverTimestamp()
    });
    
    // Create payment transaction record for tracking
    const paymentData = {
      orderId: orderId,
      orderNumber: orderData.orderNumber,
      customer: orderData.resellerName,
      customerEmail: orderData.resellerEmail,
      resellerId: orderData.resellerId,
      amount: orderData.totalAmount,
      method: paymentMethod,
      reference: paymentProof,
      status: 'processing',
      type: 'payment',
      description: `Payment proof submitted for order ${orderData.orderNumber}`
    };
    
    await createPaymentTransaction(paymentData);
    
    return { success: true };
  } catch (error) {
    console.error('Error updating payment proof:', error);
    return { success: false, error: error.message };
  }
};

// Confirm order received by reseller
export const confirmOrderReceived = async (orderId, resellerId, confirmationMessage = '') => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    
    // Get order details first
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) {
      return { success: false, error: 'Order not found' };
    }
    
    const orderData = orderSnap.data();
    
    // Verify that the reseller owns this order
    if (orderData.resellerId !== resellerId) {
      return { success: false, error: 'Unauthorized access' };
    }
    
    // Update order status to completed
    await updateDoc(orderRef, {
      status: 'completed',
      resellerConfirmation: true,
      actualDelivery: serverTimestamp(),
      adminMessage: confirmationMessage || 'Pesanan telah dikonfirmasi diterima oleh reseller',
      updatedAt: serverTimestamp()
    });
    
    // Create status log
    await createOrderStatusLog(
      orderId, 
      'completed', 
      'Order confirmed as received by reseller',
      `reseller_${resellerId}`
    );
    
    return { success: true };
  } catch (error) {
    console.error('Error confirming order received:', error);
    return { success: false, error: error.message };
  }
};

// Update tracking information (for admin)
export const updateTrackingInfo = async (orderId, trackingNumber, estimatedDelivery = null) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    
    const updateData = {
      trackingNumber,
      status: 'shipped',
      updatedAt: serverTimestamp()
    };
    
    if (estimatedDelivery) {
      updateData.estimatedDelivery = estimatedDelivery;
    }
    
    await updateDoc(orderRef, updateData);
    
    // Create status log
    await createOrderStatusLog(
      orderId, 
      'shipped', 
      `Order shipped with tracking number: ${trackingNumber}`,
      'admin'
    );
    
    return { success: true };
  } catch (error) {
    console.error('Error updating tracking info:', error);
    return { success: false, error: error.message };
  }
};

// Get orders by reseller
export const getOrdersByReseller = async (resellerId) => {
  try {
    const q = query(
      collection(db, 'orders'),
      where('resellerId', '==', resellerId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const orders = [];
    
    querySnapshot.forEach((doc) => {
      orders.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, orders };
  } catch (error) {
    console.error('Error getting orders by reseller:', error);
    return { success: false, error: error.message };
  }
};

// Get all orders (for admin)
export const getAllOrders = async () => {
  try {
    const q = query(
      collection(db, 'orders'),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const orders = [];
    
    querySnapshot.forEach((doc) => {
      orders.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, orders };
  } catch (error) {
    console.error('Error getting all orders:', error);
    return { success: false, error: error.message };
  }
};

// Get single order by ID
export const getOrderById = async (orderId) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    
    if (!orderSnap.exists()) {
      return { success: false, error: 'Order not found' };
    }
    
    return {
      success: true,
      order: {
        id: orderSnap.id,
        ...orderSnap.data()
      }
    };
  } catch (error) {
    console.error('Error getting order by ID:', error);
    return { success: false, error: error.message };
  }
};

// Get order status logs
export const getOrderStatusLogs = async (orderId) => {
  try {
    const q = query(
      collection(db, 'orderStatusLogs'),
      where('orderId', '==', orderId),
      orderBy('timestamp', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const logs = [];
    
    querySnapshot.forEach((doc) => {
      logs.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, logs };
  } catch (error) {
    console.error('Error getting order status logs:', error);
    return { success: false, error: error.message };
  }
};

// Get orders by status (for admin dashboard)
export const getOrdersByStatus = async (status) => {
  try {
    const q = query(
      collection(db, 'orders'),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const orders = [];
    
    querySnapshot.forEach((doc) => {
      orders.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, orders };
  } catch (error) {
    console.error('Error getting orders by status:', error);
    return { success: false, error: error.message };
  }
};

// Get orders by payment status (for admin dashboard)
export const getOrdersByPaymentStatus = async (paymentStatus) => {
  try {
    const q = query(
      collection(db, 'orders'),
      where('paymentStatus', '==', paymentStatus),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const orders = [];
    
    querySnapshot.forEach((doc) => {
      orders.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, orders };
  } catch (error) {
    console.error('Error getting orders by payment status:', error);
    return { success: false, error: error.message };
  }
};

// Calculate order statistics - FIXED VERSION
export const getOrderStatistics = async (resellerId = null) => {
  try {
    let q;
    if (resellerId) {
      q = query(
        collection(db, 'orders'),
        where('resellerId', '==', resellerId)
      );
    } else {
      q = query(collection(db, 'orders'));
    }
    
    const querySnapshot = await getDocs(q);
    const orders = [];
    
    querySnapshot.forEach((doc) => {
      orders.push(doc.data());
    });
    
    const stats = {
      // Basic counts
      total: orders.length,
      totalOrders: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      pendingOrders: orders.filter(o => o.status === 'pending').length,
      confirmed: orders.filter(o => o.status === 'confirmed').length,
      confirmedOrders: orders.filter(o => o.status === 'confirmed').length,
      processing: orders.filter(o => o.status === 'processing').length,
      processingOrders: orders.filter(o => o.status === 'processing').length,
      shipped: orders.filter(o => o.status === 'shipped').length,
      shippedOrders: orders.filter(o => o.status === 'shipped').length,
      completed: orders.filter(o => o.status === 'completed').length,
      completedOrders: orders.filter(o => o.status === 'completed').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      cancelledOrders: orders.filter(o => o.status === 'cancelled').length,
      
      // Payment status counts
      waitingPayment: orders.filter(o => o.paymentStatus === 'waiting_payment').length,
      waitingVerification: orders.filter(o => o.paymentStatus === 'waiting_verification').length,
      paid: orders.filter(o => o.paymentStatus === 'paid').length,
      
      // Financial calculations
      totalRevenue: orders
        .filter(o => o.paymentStatus === 'paid')
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      totalCommission: orders
        .filter(o => o.paymentStatus === 'paid')
        .reduce((sum, o) => sum + (o.totalCommission || 0), 0)
    };
    
    return { success: true, stats };
  } catch (error) {
    console.error('Error calculating order statistics:', error);
    return { success: false, error: error.message };
  }
};

// Delete order (for admin only)
export const deleteOrder = async (orderId) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    
    // Get order data first to check if it can be deleted
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) {
      return { success: false, error: 'Order not found' };
    }
    
    const orderData = orderSnap.data();
    
    // Only allow deletion of cancelled or pending orders
    if (!['cancelled', 'pending'].includes(orderData.status)) {
      return { success: false, error: 'Only cancelled or pending orders can be deleted' };
    }
    
    await deleteDoc(orderRef);
    
    // Create status log for deletion
    await createOrderStatusLog(
      orderId,
      'deleted',
      'Order deleted by admin',
      'admin'
    );
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting order:', error);
    return { success: false, error: error.message };
  }
};

// Search orders by order number or reseller name
export const searchOrders = async (searchTerm, resellerId = null) => {
  try {
    let q;
    if (resellerId) {
      q = query(
        collection(db, 'orders'),
        where('resellerId', '==', resellerId),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'orders'),
        orderBy('createdAt', 'desc')
      );
    }
    
    const querySnapshot = await getDocs(q);
    const orders = [];
    
    querySnapshot.forEach((doc) => {
      const orderData = doc.data();
      // Client-side filtering since Firestore doesn't support full-text search
      if (
        orderData.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        orderData.resellerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        orderData.resellerEmail?.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        orders.push({
          id: doc.id,
          ...orderData
        });
      }
    });
    
    return { success: true, orders };
  } catch (error) {
    console.error('Error searching orders:', error);
    return { success: false, error: error.message };
  }
};

// Batch update orders (for admin operations)
export const batchUpdateOrders = async (orderIds, updateData) => {
  try {
    const batch = writeBatch(db);
    
    orderIds.forEach(orderId => {
      const orderRef = doc(db, 'orders', orderId);
      batch.update(orderRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
    });
    
    await batch.commit();
    
    // Create status logs for each order
    const logPromises = orderIds.map(orderId =>
      createOrderStatusLog(
        orderId,
        updateData.status || 'batch_updated',
        'Batch update by admin',
        'admin'
      )
    );
    
    await Promise.all(logPromises);
    
    return { success: true };
  } catch (error) {
    console.error('Error batch updating orders:', error);
    return { success: false, error: error.message };
  }
};