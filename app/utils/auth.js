// app/utils/auth.js
'use client';

import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'

export const getAuthData = () => {
  if (typeof document === 'undefined') return null
  
  const getCookie = (name) => {
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop().split(';').shift()
    return null
  }

  const token = getCookie('auth-token')
  const userRole = getCookie('user-role')
  const username = getCookie('username')

  return token ? { token, userRole, username } : null
}

export const logout = async () => {
  try {
    // Sign out from Firebase
    await signOut(auth)
  } catch (error) {
    console.error('Error signing out:', error)
  }
  
  // Clear all auth cookies
  document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
  document.cookie = 'user-role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
  document.cookie = 'username=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
  
  // Redirect to login
  window.location.href = '/login'
}

export const isAuthenticated = () => {
  const authData = getAuthData()
  return !!authData?.token || !!auth.currentUser
}

export const isAdmin = () => {
  const authData = getAuthData()
  return authData?.userRole === 'admin'
}

export const isReseller = () => {
  const authData = getAuthData()
  return authData?.userRole === 'reseller'
}