'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAuth } from './AuthProvider'

export default function ResellerSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth >= 768) {
        setIsOpen(false) // Close mobile menu when screen becomes large
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

  // WhatsApp Admin Configuration
  const ADMIN_WHATSAPP = "62895330876559" // Ganti dengan nomor WhatsApp admin (format internasional)
  const WHATSAPP_MESSAGE = "Halo Admin BeautyOrder, saya memerlukan bantuan terkait sistem reseller."

  const handleWhatsAppClick = () => {
    const message = encodeURIComponent(WHATSAPP_MESSAGE)
    const whatsappUrl = `https://wa.me/${ADMIN_WHATSAPP}?text=${message}`
    window.open(whatsappUrl, '_blank')
    closeSidebar()
  }

  // Adjusted menu items for B2B reseller system (no end customers, no courier)
  const menuItems = [
    { href: '/reseller', icon: 'fas fa-store', label: 'Dashboard Reseller' },
    { href: '/reseller/catalog', icon: 'fas fa-book-open', label: 'Katalog Harga Grosir' },
    { href: '/reseller/orders', icon: 'fas fa-shopping-cart', label: 'Pemesanan Produk' },
    { href: '/reseller/profile', icon: 'fas fa-user-tie', label: 'Profil Reseller' }
  ]

  const handleLogout = () => {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
      // Clear cookies
      document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
      document.cookie = 'user-role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
      document.cookie = 'username=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
      
      // Redirect to login
      router.push('/')
    }
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button 
        className={`mobile-menu-btn ${isOpen ? 'open' : ''}`}
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
      <nav className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="brand-logo">
          <div className="profile-avatar">
            <i className="fas fa-user-tie"></i>
          </div>
          <h5 className="text-white mb-0">BeautyOrder</h5>
          <small className="text-white-50">Reseller Panel</small>
          {/* Reseller Info */}
          <div className="reseller-info mt-2">
            <div className="reseller-status">
              <i className="fas fa-circle text-success me-1"></i>
              Aktif
            </div>
          </div>
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
          
          {/* WhatsApp Chat Admin */}
          <li className="nav-item">
            <button 
              className="nav-link border-0 bg-transparent w-100 text-start whatsapp-btn"
              onClick={handleWhatsAppClick}
            >
              <i className="fab fa-whatsapp"></i>
              Chat Admin
              <span className="online-indicator"></span>
            </button>
          </li>
          
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
          background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
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
          background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
          height: 100vh;
          position: fixed;
          top: 0;
          left: 0;
          width: 250px;
          overflow-y: auto;
          z-index: 1000;
          transition: transform 0.3s ease;
        }

        .sidebar .nav-link {
          color: white;
          font-weight: 500;
          padding: 12px 20px;
          border-radius: 8px;
          margin: 2px 10px;
          transition: all 0.3s ease;
          text-decoration: none;
          position: relative;
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

        .profile-avatar {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: rgba(255,255,255,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
          border: 2px solid rgba(255,255,255,0.3);
        }

        .profile-avatar i {
          font-size: 24px;
          color: white;
        }

        .reseller-info {
          text-align: center;
          width: 100%;
        }

        .reseller-badge {
          background: rgba(255,255,255,0.2);
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
          margin-bottom: 4px;
          display: inline-block;
        }

        .reseller-status {
          color: rgba(255,255,255,0.8);
          font-size: 0.75rem;
          font-weight: 500;
        }

        .reseller-status .text-success {
          color: #28a745 !important;
          font-size: 0.6rem;
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

        /* WhatsApp Button Styles */
        .whatsapp-btn {
          position: relative;
        }

        .whatsapp-btn:hover {
          background-color: rgba(37, 211, 102, 0.2) !important;
        }

        .whatsapp-btn .fa-whatsapp {
          color: #25D366;
          font-size: 1.1em;
        }

        .online-indicator {
          position: absolute;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          width: 8px;
          height: 8px;
          background-color: #25D366;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% {
            transform: translateY(-50%) scale(1);
            opacity: 1;
          }
          50% {
            transform: translateY(-50%) scale(1.2);
            opacity: 0.7;
          }
          100% {
            transform: translateY(-50%) scale(1);
            opacity: 1;
          }
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