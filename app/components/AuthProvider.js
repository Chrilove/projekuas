'use client';

import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { getAuthData } from '../utils/auth'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get user role from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          let userData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            token: await firebaseUser.getIdToken(),
            userRole: 'reseller' // default role
          }

          if (userDoc.exists()) {
            userData.userRole = userDoc.data().role
          }

          setUser(userData)
          
          // Update cookies to match Firebase auth state
          document.cookie = `auth-token=${userData.token}; path=/; max-age=${60 * 60 * 24 * 7}`
          document.cookie = `user-role=${userData.userRole}; path=/; max-age=${60 * 60 * 24 * 7}`
          document.cookie = `username=${userData.email}; path=/; max-age=${60 * 60 * 24 * 7}`
        } catch (error) {
          console.error('Error getting user data:', error)
          setUser(null)
        }
      } else {
        // User is signed out
        setUser(null)
        // Clear cookies
        document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
        document.cookie = 'user-role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
        document.cookie = 'username=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
      }
      setLoading(false)
    })

    // Also check cookie-based auth for backward compatibility
    const checkCookieAuth = () => {
      const authData = getAuthData()
      if (authData && !auth.currentUser) {
        // If we have cookie data but no Firebase user, rely on cookie
        setUser(authData)
      }
    }

    checkCookieAuth()

    // Cleanup subscription on unmount
    return () => unsubscribe()
  }, [])

  const value = {
    user,
    loading,
    isAuthenticated: !!user?.token,
    isAdmin: user?.userRole === 'admin',
    isReseller: user?.userRole === 'reseller'
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}