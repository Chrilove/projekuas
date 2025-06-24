'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAuth } from './AuthProvider'

export default function SmartSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [userRole, setUserRole] = useState('admin')

  useEffect(() => {
    // Get user role from cookies
    const role = document.cookie
      .split('; ')
      .find(row => row.startsWith('user-role='))
      ?.split('=')[1] || 'admin'
    
    setUserRole(role)

    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth >= 768) {
        setIsOpen(false)
      }
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  const toggleSidebar = () => {
    setIsOpen(!isOpen)
  }

  const closeSidebar = () => {
    if (isMobile) {
      setIsOpen(false)
    }
  }

  // Admin menu items
  const adminMenuItems = [
    { href: '/admin', icon: 'fas fa-tachometer-alt', label: 'Dashboard' },
    { href: '/admin/products', icon: 'fas fa-box', label: 'Kelola Produk' },
    { href: '/admin/orders', icon: 'fas fa-shopping-cart', label: 'Daftar Pemesanan' },
    { href: '/admin/shipping', icon: 'fas fa-truck', label: 'Status Pengiriman' },
    { href: '/admin/reports', icon: 'fas fa-chart-bar', label: 'Laporan Penjualan' },
  ]

  // Reseller menu items
  const resellerMenuItems = [
    { href: '/reseller', icon: 'fas fa-store', label: 'Dashboard Reseller' },
    { href: '/reseller/catalog', icon: 'fas fa-book-open', label: 'Katalog Harga Grosir' },
    { href: '/reseller/orders', icon: 'fas fa-shopping-cart', label: 'Pemesanan Produk' },
    { href: '/reseller/profile', icon: 'fas fa-user-tie', label: 'Profil Reseller' }
  ]

  const menuItems = userRole === 'admin' ? adminMenuItems : resellerMenuItems
  const panelTitle = userRole === 'admin' ? 'Admin Panel' : 'Reseller Panel'
  const gradientClass = userRole === 'admin' ? 'admin-gradient' : 'reseller-gradient'

  const handleLogout = () => {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
      // Clear cookies
      document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
      document.cookie = 'user-role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
      document.cookie = 'email=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
      
      // FIXED: Redirect to app/page.js (root page)
      router.push('/')
    }
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button 
        className={`mobile-menu-btn ${gradientClass} ${isOpen ? 'open' : ''}`}
        onClick={toggleSidebar}
        aria-label="Toggle Menu"
      >
        <div className="hamburger-line"></div>
        <div className="hamburger-line"></div>
        <div className="hamburger-line"></div>
      </button>

      {/* Overlay for mobile */}
      {isMobile && isOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar}></div>
      )}

      {/* Sidebar */}
      <nav className={`sidebar ${gradientClass} ${isOpen ? 'open' : ''}`}>
        <div className="brand-logo">
          <img 
            src="/images/logo2.jpg" 
            alt="BeautyOrder Logo"
          />
          <h5 className="text-white mb-0">BeautyOrder</h5>
          <small className="text-white-50">{panelTitle}</small>
        </div>

        <ul className="nav flex-column mt-3">
          {menuItems.map((item) => (
            <li key={item.href} className="nav-item">
              <Link 
                href={item.href} 
                className={`nav-link ${pathname === item.href ? 'active' : ''}`}
                onClick={closeSidebar}
              >
                <i className={item.icon}></i>
                {item.label}
              </Link>
            </li>
          ))}
          
          <li className="nav-item mt-3">
            <button 
              className="nav-link border-0 bg-transparent w-100 text-start"
              onClick={handleLogout}
            >
              <i className="fas fa-sign-out-alt"></i>
              Logout
            </button>
          </li>
        </ul>
      </nav>

      <style jsx>{`
        /* Mobile Menu Button */
        .mobile-menu-btn {
          display: none;
          position: fixed;
          top: 15px;
          left: 15px;
          z-index: 1001;
          border: none;
          border-radius: 8px;
          width: 45px;
          height: 45px;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          transition: all 0.3s ease;
        }

        .mobile-menu-btn.admin-gradient {
          background: linear-gradient(135deg, #d9b3ff 0%, #c39be6 100%);
        }

        .mobile-menu-btn.reseller-gradient {
          background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
        }

        .hamburger-line {
          width: 20px;
          height: 2px;
          background-color: white;
          transition: all 0.3s ease;
          transform-origin: center;
        }

        .mobile-menu-btn.open .hamburger-line:nth-child(1) {
          transform: rotate(45deg) translate(6px, 6px);
        }

        .mobile-menu-btn.open .hamburger-line:nth-child(2) {
          opacity: 0;
        }

        .mobile-menu-btn.open .hamburger-line:nth-child(3) {
          transform: rotate(-45deg) translate(6px, -6px);
        }

        /* Sidebar Overlay */
        .sidebar-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          z-index: 999;
          backdrop-filter: blur(2px);
        }

        /* Sidebar Styles */
        .sidebar {
          height: 100vh;
          position: fixed;
          top: 0;
          left: 0;
          width: 250px;
          overflow-y: auto;
          z-index: 1000;
          transition: transform 0.3s ease;
        }

        .sidebar.admin-gradient {
          background: linear-gradient(135deg, #d9b3ff 0%, #c39be6 100%);
        }

        .sidebar.reseller-gradient {
          background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
        }

        .sidebar .nav-link {
          color: white;
          font-weight: 500;
          padding: 12px 20px;
          border-radius: 8px;
          margin: 2px 10px;
          transition: all 0.3s ease;
          text-decoration: none;
        }

        .sidebar .nav-link:hover {
          background-color: rgba(255,255,255,0.1);
          transform: translateX(5px);
          color: white;
        }

        .sidebar .nav-link.active {
          background-color: rgba(255,255,255,0.2);
          border-left: 4px solid white;
        }

        .sidebar .nav-link i {
          margin-right: 10px;
          width: 20px;
        }

        .brand-logo {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .brand-logo img {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          margin-bottom: 8px;
        }

        .nav-link.border-0 {
          border: none !important;
        }

        .nav-link.bg-transparent {
          background: transparent !important;
        }

        .nav-link.bg-transparent:hover {
          background-color: rgba(255,255,255,0.1) !important;
          transform: translateX(5px);
          color: white;
        }

        /* Desktop Styles */
        @media (min-width: 768px) {
          .sidebar {
            transform: translateX(0) !important;
          }
        }

        /* Mobile Styles */
        @media (max-width: 767.98px) {
          .mobile-menu-btn {
            display: flex;
          }

          .sidebar {
            transform: translateX(-100%);
          }
          
          .sidebar.open {
            transform: translateX(0);
          }

          .brand-logo {
            padding-top: 70px;
          }
        }

        /* Tablet Styles */
        @media (max-width: 1024px) and (min-width: 768px) {
          .sidebar {
            width: 200px;
          }
          
          .sidebar .nav-link {
            padding: 10px 15px;
            font-size: 0.9rem;
          }
          
          .brand-logo {
            padding: 15px;
          }
          
          .brand-logo img {
            width: 50px;
            height: 50px;
          }
          
          .brand-logo h5 {
            font-size: 1.1rem;
          }
        }
      `}</style>
    </>
  )
}