'use client'

import { useState } from 'react'
import Link from 'next/link'
import Head from 'next/head'
import Biodata from '../app/components/biodata' // Pastikan path ini benar

export default function HomePage() {
  const [showAbout, setShowAbout] = useState(true)

  return (
    <>
      <Head>
        <link 
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" 
          rel="stylesheet" 
        />
        <link 
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" 
          rel="stylesheet" 
        />
        <script 
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"
          async
        />
      </Head>

      <div className="landing-page">
        {/* Navigation */}
        <nav className="navbar navbar-expand-lg fixed-top">
          <div className="container">
            <Link className="navbar-brand d-flex align-items-center" href="/">
              <i className="fas fa-heart text-primary me-2"></i>
              <span className="brand-text">BeautyOrder</span>
            </Link>
            <button 
              className="navbar-toggler" 
              type="button" 
              data-bs-toggle="collapse" 
              data-bs-target="#navbarNav"
            >
              <span className="navbar-toggler-icon"></span>
            </button>
            <div className="collapse navbar-collapse" id="navbarNav">
              <ul className="navbar-nav ms-auto">
                <li className="nav-item">
                  <Link className="nav-link" href="/login">
                    <i className="fas fa-sign-in-alt me-1"></i>
                    Login
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-bg">
            <div className="container">
              <div className="row align-items-center min-vh-100">
                <div className="col-lg-6">
                  <div className="hero-content">
                    <h1 className="hero-title">
                      <span className="text-primary"></span>BeautyOrder
                    </h1>
                    <p className="hero-subtitle">
                      Sistem Pemesanan Kecantikan Terpadu
                    </p>
                    <p className="hero-description">
                      Kelola bisnis kecantikan Anda dengan mudah! Sistem manajemen pesanan yang 
                      dirancang khusus untuk admin dan reseller produk kecantikan. Pantau stok, kelola 
                      pesanan, dan tingkatkan penjualan dengan interface yang user-friendly.
                    </p>
                    <div className="hero-buttons">
                      <Link href="/login" className="btn btn-primary btn-lg me-3">
                        <i className="fas fa-rocket me-2"></i>
                        Mulai Sekarang
                      </Link>
                      <button 
                        className="btn btn-outline-primary btn-lg"
                        onClick={() => setShowAbout(!showAbout)}
                      >
                        <i className="fas fa-info-circle me-2"></i>
                        Pelajari Lebih Lanjut
                      </button>
                    </div>
                  </div>
                </div>
                <div className="col-lg-6">
                  <div className="hero-image">
                    <div className="floating-card">
                      <i className="fas fa-chart-line text-success"></i>
                      <span>Dashboard Analytics</span>
                    </div>
                    <div className="floating-card card-2">
                      <i className="fas fa-shopping-cart text-primary"></i>
                      <span>Order Management</span>
                    </div>
                    <div className="floating-card card-3">
                      <i className="fas fa-users text-warning"></i>
                      <span>Multi-Role System</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="features-section py-5">
          <div className="container">
            <div className="row text-center mb-5">
              <div className="col-lg-8 mx-auto">
                <h2 className="section-title">Fitur Unggulan</h2>
                <p className="section-subtitle">
                  Solusi lengkap untuk mengelola bisnis kecantikan Anda
                </p>
              </div>
            </div>
            <div className="row">
              <div className="col-lg-4 col-md-6 mb-4">
                <div className="feature-card">
                  <div className="feature-icon">
                    <i className="fas fa-users-cog"></i>
                  </div>
                  <h5>Multi-Role System</h5>
                  <p>Sistem role yang fleksibel untuk admin dan reseller dengan akses yang berbeda sesuai kebutuhan.</p>
                </div>
              </div>
              <div className="col-lg-4 col-md-6 mb-4">
                <div className="feature-card">
                  <div className="feature-icon">
                    <i className="fas fa-shopping-cart"></i>
                  </div>
                  <h5>Manajemen Pesanan</h5>
                  <p>Kelola pesanan dengan mudah, pantau status, dan update inventory secara real-time.</p>
                </div>
              </div>
              <div className="col-lg-4 col-md-6 mb-4">
                <div className="feature-card">
                  <div className="feature-icon">
                    <i className="fas fa-boxes"></i>
                  </div>
                  <h5>Inventory Control</h5>
                  <p>Kontrol stok otomatis dengan notifikasi ketika produk hampir habis atau kadaluarsa.</p>
                </div>
              </div>
              <div className="col-lg-4 col-md-6 mb-4">
                <div className="feature-card">
                  <div className="feature-icon">
                    <i className="fas fa-mobile-alt"></i>
                  </div>
                  <h5>Responsive Design</h5>
                  <p>Interface yang responsif dan mudah digunakan di desktop, tablet, maupun smartphone.</p>
                </div>
              </div>
              <div className="col-lg-4 col-md-6 mb-4">
                <div className="feature-card">
                  <div className="feature-icon">
                    <i className="fas fa-shield-alt"></i>
                  </div>
                  <h5>Keamanan Terjamin</h5>
                  <p>Sistem keamanan tingkat tinggi dengan autentikasi Firebase dan enkripsi data.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Biodata Section - pastikan komponen ini conditional */}
        {showAbout && <Biodata />}

        {/* Footer */}
        <footer className="footer py-4">
          <div className="container">
            <div className="row align-items-center">
              <div className="col-md-6">
                <div className="d-flex align-items-center">
                  <i className="fas fa-heart text-primary me-2"></i>
                  <span className="text-muted">© 2024 BeautyOrder. All rights reserved.</span>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>

      <style jsx>{`
        .landing-page {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          overflow-x: hidden;
        }

        .navbar {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          box-shadow: 0 2px 20px rgba(248, 187, 208, 0.2);
          transition: all 0.3s ease;
        }

        .brand-text {
          font-weight: 700;
          font-size: 1.5rem;
          color: #8B5A83;
        }

        .nav-link {
          color: #A888B5 !important;
          font-weight: 500;
          transition: color 0.3s ease;
        }

        .nav-link:hover {
          color: #E6B3CC !important;
        }

        .hero-section {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
        }

        .hero-bg {
          background: linear-gradient(135deg, #FFE5F1 0%, #E6B3CC 50%, #D4A5D8 100%);
          position: relative;
          width: 100%;
          color: #8B5A83;
        }

        .hero-bg::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(248, 187, 208, 0.1);
        }

        .hero-content {
          position: relative;
          z-index: 2;
        }

        .hero-title {
          font-size: 3.5rem;
          font-weight: 800;
          margin-bottom: 1rem;
          line-height: 1.1;
          color: #8B5A83;
        }

        .hero-title .text-primary {
          color: #E6B3CC !important;
        }

        .hero-subtitle {
          font-size: 1.5rem;
          font-weight: 300;
          margin-bottom: 1.5rem;
          opacity: 0.9;
          color: #A888B5;
        }

        .hero-description {
          font-size: 1.1rem;
          line-height: 1.6;
          margin-bottom: 2rem;
          opacity: 0.8;
          color: #8B5A83;
        }

        .hero-buttons {
          margin-top: 2rem;
        }

        .btn-primary {
          background: linear-gradient(135deg, #E6B3CC 0%, #F8BBD0 100%);
          border: none;
          border-radius: 50px;
          padding: 12px 30px;
          font-weight: 600;
          transition: all 0.3s ease;
          color: #8B5A83;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(230, 179, 204, 0.4);
          background: linear-gradient(135deg, #F8BBD0 0%, #E6B3CC 100%);
        }

        .btn-outline-primary {
          border: 2px solid rgba(230, 179, 204, 0.6);
          color: #8B5A83;
          border-radius: 50px;
          padding: 12px 30px;
          font-weight: 600;
          background: rgba(255, 229, 241, 0.3);
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
        }

        .btn-outline-primary:hover {
          background: rgba(230, 179, 204, 0.3);
          border-color: rgba(230, 179, 204, 0.8);
          color: #8B5A83;
          transform: translateY(-2px);
        }

        .hero-image {
          position: relative;
          height: 400px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .floating-card {
          position: absolute;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 15px;
          padding: 1rem 1.5rem;
          box-shadow: 0 10px 30px rgba(230, 179, 204, 0.3);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          color: #8B5A83;
          animation: floating 3s ease-in-out infinite;
          border: 1px solid rgba(230, 179, 204, 0.2);
        }

        .floating-card i {
          font-size: 1.2rem;
        }

        .floating-card .text-success {
          color: #B8E6B8 !important;
        }

        .floating-card .text-primary {
          color: #E6B3CC !important;
        }

        .floating-card .text-warning {
          color: #F8E6A0 !important;
        }

        .card-2 {
          top: 20%;
          right: 10%;
          animation-delay: -1s;
        }

        .card-3 {
          bottom: 20%;
          left: 10%;
          animation-delay: -2s;
        }

        @keyframes floating {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        .features-section {
          background: linear-gradient(135deg, #FFF5F8 0%, #F8F0FF 100%);
        }

        .section-title {
          font-size: 2.5rem;
          font-weight: 700;
          color: #8B5A83;
          margin-bottom: 1rem;
        }

        .section-subtitle {
          font-size: 1.2rem;
          color: #A888B5;
        }

        .feature-card {
          background: rgba(255, 255, 255, 0.9);
          border-radius: 15px;
          padding: 2rem;
          text-align: center;
          box-shadow: 0 5px 20px rgba(230, 179, 204, 0.15);
          transition: all 0.3s ease;
          height: 100%;
          border: 1px solid rgba(230, 179, 204, 0.1);
        }

        .feature-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 40px rgba(230, 179, 204, 0.25);
        }

        .feature-icon {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #E6B3CC 0%, #F8BBD0 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
        }

        .feature-icon i {
          font-size: 2rem;
          color: white;
        }

        .feature-card h5 {
          font-weight: 600;
          color: #8B5A83;
          margin-bottom: 1rem;
        }

        .feature-card p {
          color: #A888B5;
          line-height: 1.6;
        }

        .footer {
          background: linear-gradient(135deg, #8B5A83 0%, #A888B5 100%);
          color: white;
        }

        .footer .text-muted {
          color: rgba(255, 255, 255, 0.8) !important;
        }

        .footer .text-primary {
          color: #FFE5F1 !important;
        }

        .footer .btn-outline-primary {
          border-color: #E6B3CC;
          color: #FFE5F1;
          background: transparent;
        }

        .footer .btn-outline-primary:hover {
          background: #E6B3CC;
          color: #8B5A83;
        }

        @media (max-width: 768px) {
          .hero-title {
            font-size: 2.5rem;
          }
          
          .hero-subtitle {
            font-size: 1.2rem;
          }
          
          .hero-description {
            font-size: 1rem;
          }
          
          .hero-buttons {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }
          
          .floating-card {
            position: relative;
            margin: 0.5rem;
          }
          
          .hero-image {
            height: auto;
            flex-direction: column;
            margin-top: 2rem;
          }
        }

        @media (max-width: 576px) {
          .section-title {
            font-size: 2rem;
          }
        }
      `}</style>
    </>
  )
}