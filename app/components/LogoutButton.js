'use client';

import { useState } from 'react'
import { logout } from '../utils/auth'

export default function LogoutButton({ className = '', variant = 'dropdown' }) {
  const [isLoading, setIsLoading] = useState(false)

  const handleLogout = async () => {
    setIsLoading(true)
    
    // Add a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500))
    
    logout()
  }

  if (variant === 'dropdown') {
    return (
      <li>
        <a 
          className="dropdown-item text-danger" 
          href="#" 
          onClick={(e) => {
            e.preventDefault()
            handleLogout()
          }}
        >
          {isLoading ? (
            <>
              <i className="fas fa-spinner fa-spin me-2"></i>
              Logging out...
            </>
          ) : (
            <>
              <i className="fas fa-sign-out-alt me-2"></i>
              Logout
            </>
          )}
        </a>
      </li>
    )
  }

  if (variant === 'sidebar') {
    return (
      <li className="nav-item">
        <a 
          className="nav-link text-danger" 
          href="#" 
          onClick={(e) => {
            e.preventDefault()
            handleLogout()
          }}
        >
          {isLoading ? (
            <>
              <i className="fas fa-spinner fa-spin me-2"></i>
              <span>Logging out...</span>
            </>
          ) : (
            <>
              <i className="fas fa-sign-out-alt me-2"></i>
              <span>Logout</span>
            </>
          )}
        </a>
      </li>
    )
  }

  return (
    <button 
      className={`btn btn-outline-danger ${className}`}
      onClick={handleLogout}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <i className="fas fa-spinner fa-spin me-2"></i>
          Logging out...
        </>
      ) : (
        <>
          <i className="fas fa-sign-out-alt me-2"></i>
          Logout
        </>
      )}
    </button>
  )
}