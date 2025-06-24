// lib/auth.js - Enhanced Authentication with JWT (FIXED)
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile 
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { SignJWT, jwtVerify } from 'jose';
import { auth, db } from './firebase';

// JWT Secret (pastikan ini di environment variable)
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'
);

// Generate JWT token
export const generateJWT = async (payload) => {
  try {
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d') // Token expires in 7 days
      .sign(JWT_SECRET);
    
    return { success: true, token };
  } catch (error) {
    console.error('Error generating JWT:', error);
    return { success: false, error: error.message };
  }
};

// Verify JWT token
export const verifyJWT = async (token) => {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return { success: true, payload };
  } catch (error) {
    console.error('Error verifying JWT:', error);
    return { success: false, error: error.message };
  }
};

// Set secure cookies (FIXED - Remove HttpOnly for client access)
export const setAuthCookies = (token, userRole, email) => {
  const maxAge = 60 * 60 * 24 * 7; // 7 days
  
  // Remove httponly untuk memungkinkan akses dari client-side
  // Tetapi tetap secure untuk production
  const isProduction = process.env.NODE_ENV === 'production';
  
  const cookieOptions = `path=/; max-age=${maxAge}; samesite=strict${isProduction ? '; secure' : ''}`;
  
  // Set cookies tanpa httponly agar bisa diakses client-side
  document.cookie = `auth-token=${token}; ${cookieOptions}`;
  document.cookie = `user-role=${userRole}; ${cookieOptions}`;
  document.cookie = `email=${email}; ${cookieOptions}`;
  
  console.log('Auth cookies set:', { userRole, email });
};

// Clear auth cookies (FIXED)
export const clearAuthCookies = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = `path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=strict${isProduction ? '; secure' : ''}`;
  
  document.cookie = `auth-token=; ${cookieOptions}`;
  document.cookie = `user-role=; ${cookieOptions}`;
  document.cookie = `email=; ${cookieOptions}`;
  
  console.log('Auth cookies cleared');
};

// Get cookie value (HELPER FUNCTION)
export const getCookie = (name) => {
  if (typeof document === 'undefined') return null;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

// Check if user is authenticated (CLIENT-SIDE)
export const isAuthenticated = () => {
  const token = getCookie('auth-token');
  const role = getCookie('user-role');
  return !!(token && role);
};

// Get current user role (CLIENT-SIDE)
export const getCurrentUserRole = () => {
  return getCookie('user-role');
};

// Get current user email (CLIENT-SIDE)
export const getCurrentUserEmail = () => {
  return getCookie('email');
};

// Validate input data
const validateUserData = (email, password, userData = {}) => {
  const errors = [];
  
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    errors.push('Format email tidak valid');
  }
  
  // Password validation
  if (!password || password.length < 6) {
    errors.push('Password minimal 6 karakter');
  }
  
  // Name validation for registration
  if (userData.name !== undefined && (!userData.name || userData.name.trim().length < 2)) {
    errors.push('Nama minimal 2 karakter');
  }
  
  // Phone validation for registration
  if (userData.phone !== undefined && userData.phone && !/^[0-9+\-\s()]+$/.test(userData.phone)) {
    errors.push('Format nomor telepon tidak valid');
  }
  
  return errors;
};

// Check if user exists
export const checkUserExists = async (email) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email.toLowerCase()));
    const querySnapshot = await getDocs(q);
    
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking user existence:', error);
    return false;
  }
};

// Register new user
export const registerUser = async (email, password, userData) => {
  try {
    // Validate input
    const validationErrors = validateUserData(email, password, userData);
    if (validationErrors.length > 0) {
      return { success: false, error: validationErrors.join(', ') };
    }
    
    // Check if user already exists
    const userExists = await checkUserExists(email);
    if (userExists) {
      return { success: false, error: 'Email sudah terdaftar' };
    }

    // Create user account
    const userCredential = await createUserWithEmailAndPassword(auth, email.toLowerCase(), password);
    const user = userCredential.user;

    // Update display name
    if (userData.name) {
      await updateProfile(user, {
        displayName: userData.name
      });
    }

    // Create user document in Firestore
    const userDoc = {
      uid: user.uid,
      email: user.email,
      name: userData.name || '',
      phone: userData.phone || '',
      role: userData.role || 'reseller',
      status: 'active',
      address: userData.address || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      loginCount: 1
    };

    await setDoc(doc(db, 'users', user.uid), userDoc);

    // Generate JWT token
    const jwtPayload = {
      uid: user.uid,
      email: user.email,
      role: userDoc.role,
      status: userDoc.status
    };
    
    const jwtResult = await generateJWT(jwtPayload);
    if (!jwtResult.success) {
      return { success: false, error: 'Gagal membuat token autentikasi' };
    }

    return { 
      success: true, 
      user: userDoc, 
      token: jwtResult.token 
    };
  } catch (error) {
    console.error('Error registering user:', error);
    
    // Handle specific Firebase errors
    if (error.code === 'auth/email-already-in-use') {
      return { success: false, error: 'Email sudah terdaftar' };
    } else if (error.code === 'auth/weak-password') {
      return { success: false, error: 'Password terlalu lemah' };
    } else if (error.code === 'auth/invalid-email') {
      return { success: false, error: 'Format email tidak valid' };
    }
    
    return { success: false, error: 'Gagal mendaftarkan akun' };
  }
};

// Login user
export const loginUser = async (email, password) => {
  try {
    // Validate input
    const validationErrors = validateUserData(email, password);
    if (validationErrors.length > 0) {
      return { success: false, error: validationErrors.join(', ') };
    }

    const userCredential = await signInWithEmailAndPassword(auth, email.toLowerCase(), password);
    const user = userCredential.user;

    // Get user profile from Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      return { success: false, error: 'Profil pengguna tidak ditemukan' };
    }

    const userData = userDoc.data();
    
    // Check if user is active
    if (userData.status !== 'active') {
      return { success: false, error: 'Akun Anda tidak aktif. Hubungi administrator.' };
    }

    // Update last login
    await updateDoc(doc(db, 'users', user.uid), {
      lastLogin: serverTimestamp(),
      loginCount: (userData.loginCount || 0) + 1,
      updatedAt: serverTimestamp()
    });

    // Generate JWT token
    const jwtPayload = {
      uid: user.uid,
      email: user.email,
      role: userData.role,
      status: userData.status
    };
    
    const jwtResult = await generateJWT(jwtPayload);
    if (!jwtResult.success) {
      return { success: false, error: 'Gagal membuat token autentikasi' };
    }

    console.log('Login successful:', { role: userData.role, email: userData.email });

    return { 
      success: true, 
      user: userData, 
      token: jwtResult.token 
    };
  } catch (error) {
    console.error('Error logging in:', error);
    
    // Handle specific Firebase errors
    if (error.code === 'auth/user-not-found') {
      return { success: false, error: 'Akun tidak ditemukan' };
    } else if (error.code === 'auth/wrong-password') {
      return { success: false, error: 'Password salah' };
    } else if (error.code === 'auth/invalid-credential') {
      return { success: false, error: 'Email atau password salah' };
    } else if (error.code === 'auth/too-many-requests') {
      return { success: false, error: 'Terlalu banyak percobaan. Coba lagi nanti.' };
    }
    
    return { success: false, error: 'Gagal masuk ke akun' };
  }
};

// Logout user
export const logoutUser = async () => {
  try {
    await signOut(auth);
    clearAuthCookies();
    console.log('Logout successful');
    return { success: true };
  } catch (error) {
    console.error('Error logging out:', error);
    return { success: false, error: 'Gagal keluar dari akun' };
  }
};

// Get user profile
export const getUserProfile = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return { success: true, user: userDoc.data() };
    } else {
      return { success: false, error: 'Pengguna tidak ditemukan' };
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    return { success: false, error: 'Gagal mengambil profil pengguna' };
  }
};

// Update user profile
export const updateUserProfile = async (uid, updateData) => {
  try {
    // Validate update data
    if (updateData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateData.email)) {
        return { success: false, error: 'Format email tidak valid' };
      }
    }
    
    if (updateData.name && updateData.name.trim().length < 2) {
      return { success: false, error: 'Nama minimal 2 karakter' };
    }
    
    if (updateData.phone && !/^[0-9+\-\s()]+$/.test(updateData.phone)) {
      return { success: false, error: 'Format nomor telepon tidak valid' };
    }

    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { success: false, error: 'Gagal memperbarui profil' };
  }
};

// Get all users (for admin)
export const getAllUsers = async () => {
  try {
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    const users = [];
    
    querySnapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, users };
  } catch (error) {
    console.error('Error getting all users:', error);
    return { success: false, error: 'Gagal mengambil data pengguna' };
  }
};

// Update user status (for admin)
export const updateUserStatus = async (uid, status, adminNotes = '') => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      status,
      adminNotes,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating user status:', error);
    return { success: false, error: 'Gagal memperbarui status pengguna' };
  }
};

// Validate session token
export const validateSession = async (token) => {
  try {
    const verification = await verifyJWT(token);
    if (!verification.success) {
      return { success: false, error: 'Token tidak valid' };
    }
    
    // Check if user still exists and is active
    const userResult = await getUserProfile(verification.payload.uid);
    if (!userResult.success || userResult.user.status !== 'active') {
      return { success: false, error: 'Pengguna tidak aktif' };
    }
    
    return { success: true, user: userResult.user };
  } catch (error) {
    console.error('Error validating session:', error);
    return { success: false, error: 'Gagal memvalidasi sesi' };
  }
};