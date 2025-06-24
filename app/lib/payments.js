// app/lib/payments.js
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
    serverTimestamp 
  } from 'firebase/firestore';
  import { db } from './firebase';
  
  // Generate transaction number
  export const generateTransactionNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 3).toUpperCase();
    return `TXN${new Date().getFullYear()}${timestamp}${random}`;
  };
  
  // Create new payment transaction
  export const createPaymentTransaction = async (paymentData) => {
    try {
      const transactionNumber = generateTransactionNumber();
      
      const payment = {
        transactionId: transactionNumber,
        orderId: paymentData.orderId,
        orderNumber: paymentData.orderNumber,
        customer: paymentData.customer,
        customerEmail: paymentData.customerEmail,
        resellerId: paymentData.resellerId,
        amount: paymentData.amount,
        method: paymentData.method,
        reference: paymentData.reference,
        status: paymentData.status || 'processing', // processing, success, failed
        type: paymentData.type || 'payment', // payment, refund, commission
        description: paymentData.description || '',
        adminNotes: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
  
      const docRef = await addDoc(collection(db, 'payments'), payment);
      console.log('Payment transaction created with ID:', docRef.id);
      return { success: true, paymentId: docRef.id, transactionNumber };
    } catch (error) {
      console.error('Error creating payment transaction:', error);
      return { success: false, error: error.message };
    }
  };
  
  // Update payment status
  export const updatePaymentStatus = async (paymentId, status, adminNotes = '') => {
    try {
      const paymentRef = doc(db, 'payments', paymentId);
      await updateDoc(paymentRef, {
        status,
        adminNotes,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating payment status:', error);
      return { success: false, error: error.message };
    }
  };
  
  // Get all payment transactions (for admin)
  export const getAllPayments = async (statusFilter = null) => {
    try {
      const paymentsRef = collection(db, 'payments');
      let q;
      
      if (statusFilter && statusFilter !== 'all') {
        q = query(
          paymentsRef, 
          where('status', '==', statusFilter),
          orderBy('createdAt', 'desc')
        );
      } else {
        q = query(paymentsRef, orderBy('createdAt', 'desc'));
      }
      
      const querySnapshot = await getDocs(q);
      const payments = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        payments.push({
          id: doc.id,
          ...data,
          // Format createdAt for display
          date: data.createdAt ? formatDate(data.createdAt.toDate()) : 'N/A',
          time: data.createdAt ? formatTime(data.createdAt.toDate()) : 'N/A'
        });
      });
      
      return { success: true, payments };
    } catch (error) {
      console.error('Error getting all payments:', error);
      return { success: false, error: error.message };
    }
  };
  
  // Get payments by reseller ID
  export const getPaymentsByReseller = async (resellerId) => {
    try {
      const paymentsRef = collection(db, 'payments');
      const q = query(
        paymentsRef, 
        where('resellerId', '==', resellerId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const payments = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        payments.push({
          id: doc.id,
          ...data,
          date: data.createdAt ? formatDate(data.createdAt.toDate()) : 'N/A',
          time: data.createdAt ? formatTime(data.createdAt.toDate()) : 'N/A'
        });
      });
      
      return { success: true, payments };
    } catch (error) {
      console.error('Error getting payments by reseller:', error);
      return { success: false, error: error.message };
    }
  };
  
  // Get payment by ID
  export const getPaymentById = async (paymentId) => {
    try {
      const paymentRef = doc(db, 'payments', paymentId);
      const paymentSnap = await getDoc(paymentRef);
      
      if (paymentSnap.exists()) {
        return { 
          success: true, 
          payment: { 
            id: paymentSnap.id, 
            ...paymentSnap.data() 
          } 
        };
      } else {
        return { success: false, error: 'Payment not found' };
      }
    } catch (error) {
      console.error('Error getting payment:', error);
      return { success: false, error: error.message };
    }
  };
  
  // Get payment statistics (for admin dashboard)
  export const getPaymentStats = async () => {
    try {
      const paymentsRef = collection(db, 'payments');
      const querySnapshot = await getDocs(paymentsRef);
      
      let totalRevenue = 0;
      let totalTransactions = 0;
      let successfulTransactions = 0;
      let failedTransactions = 0;
      let processingTransactions = 0;
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        totalTransactions += 1;
        
        // Only count successful payments for revenue
        if (data.status === 'success' && data.type === 'payment') {
          totalRevenue += parseFloat(data.amount.toString().replace(/[^\d]/g, '')) || 0;
          successfulTransactions += 1;
        } else if (data.status === 'failed') {
          failedTransactions += 1;
        } else if (data.status === 'processing') {
          processingTransactions += 1;
        }
      });
      
      const averageTransaction = totalTransactions > 0 ? totalRevenue / successfulTransactions : 0;
      const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0;
      
      return {
        success: true,
        stats: {
          totalRevenue,
          totalTransactions,
          averageTransaction,
          successRate: successRate.toFixed(1),
          successfulTransactions,
          failedTransactions,
          processingTransactions
        }
      };
    } catch (error) {
      console.error('Error getting payment stats:', error);
      return { success: false, error: error.message };
    }
  };
  
  // Retry failed payment
  export const retryPayment = async (paymentId) => {
    try {
      const paymentRef = doc(db, 'payments', paymentId);
      await updateDoc(paymentRef, {
        status: 'processing',
        adminNotes: 'Payment retry initiated',
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error retrying payment:', error);
      return { success: false, error: error.message };
    }
  };
  
  // Helper functions for date formatting
  const formatDate = (date) => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${day} ${month} ${year}`;
  };
  
  const formatTime = (date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };
  
  // Format currency to Indonesian Rupiah
  export const formatCurrency = (amount) => {
    if (typeof amount === 'string') {
      // If already formatted, return as is
      if (amount.includes('Rp')) return amount;
      amount = parseFloat(amount);
    }
    
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };