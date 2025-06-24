// middleware.js - Enhanced Security Middleware (FIXED)
import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

// Simple rate limiting store (use Redis in production)
const rateLimitStore = new Map()

// JWT secret key (pastikan ini di environment variable)
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'
)

function rateLimit(ip, limit = 10, windowMs = 60000) {
  const now = Date.now()
  const windowStart = now - windowMs
  
  if (!rateLimitStore.has(ip)) {
    rateLimitStore.set(ip, [])
  }
  
  const requests = rateLimitStore.get(ip).filter(time => time > windowStart)
  
  if (requests.length >= limit) {
    return false
  }
  
  requests.push(now)
  rateLimitStore.set(ip, requests)
  return true
}

// Verify JWT token
async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return { valid: true, payload }
  } catch (error) {
    console.error('Token verification failed:', error.message)
    return { valid: false, error: error.message }
  }
}

export async function middleware(request) {
  const { pathname } = request.nextUrl
  const ip = request.ip || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  
  console.log(`Middleware: Processing ${pathname}`)
  
  // Rate limiting untuk semua requests
  if (!rateLimit(ip, 100, 60000)) { // 100 requests per minute per IP
    return new NextResponse('Too many requests', { 
      status: 429,
      headers: {
        'Retry-After': '60'
      }
    })
  }
  
  // Rate limit login attempts lebih ketat
  if (pathname === '/login' && request.method === 'POST') {
    if (!rateLimit(ip + ':login', 5, 300000)) { // 5 attempts per 5 minutes for login
      return new NextResponse('Too many login attempts', { 
        status: 429,
        headers: {
          'Retry-After': '300'
        }
      })
    }
  }

  // Get auth token from cookies
  const token = request.cookies.get('auth-token')?.value
  const userRole = request.cookies.get('user-role')?.value

  console.log(`Middleware: Token exists: ${!!token}, Role: ${userRole}`)

  // Public routes yang tidak memerlukan authentication
  const publicRoutes = ['/login', '/register', '/forgot-password']
  
  // Protected routes yang memerlukan authentication
  const protectedRoutes = [
    '/admin',
    '/reseller', 
    '/products',
    '/orders',
    '/verification',
    '/shipping',
    '/reports',
    '/display',
    '/payment',
    '/profile',
    '/dashboard'
  ]
  
  // Admin-only routes
  const adminOnlyRoutes = [
    '/admin',
    '/products',
    '/orders',
    '/verification', 
    '/shipping',
    '/reports',
    '/display',
    '/payment',
    '/users'
  ]
  
  // Reseller-only routes  
  const resellerOnlyRoutes = [
    '/reseller'
  ]

  // Check if current path is public
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  
  // Check if current path is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  
  // Check if current path is admin only
  const isAdminOnlyRoute = adminOnlyRoutes.some(route => pathname.startsWith(route))
  
  // Check if current path is reseller only
  const isResellerOnlyRoute = resellerOnlyRoutes.some(route => pathname.startsWith(route))

  console.log(`Middleware: isPublicRoute: ${isPublicRoute}, isProtectedRoute: ${isProtectedRoute}`)

  // Root path redirect logic
  if (pathname === '/') {
    console.log('Middleware: Processing root path')
    
    if (!token) {
      console.log('Middleware: No token, redirecting to login')
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    // Verify token validity
    const tokenVerification = await verifyToken(token)
    if (!tokenVerification.valid) {
      console.log('Middleware: Invalid token, clearing cookies and redirecting to login')
      // Clear invalid cookies
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.set('auth-token', '', { expires: new Date(0), path: '/' })
      response.cookies.set('user-role', '', { expires: new Date(0), path: '/' })
      response.cookies.set('email', '', { expires: new Date(0), path: '/' })
      return response
    }
    
    console.log(`Middleware: Valid token, role: ${userRole}`)
    
    // Redirect based on role
    if (userRole === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url))
    } else if (userRole === 'reseller') {
      return NextResponse.redirect(new URL('/reseller', request.url))
    } else {
      // Invalid role, redirect to login
      console.log('Middleware: Invalid role, clearing cookies')
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.set('auth-token', '', { expires: new Date(0), path: '/' })
      response.cookies.set('user-role', '', { expires: new Date(0), path: '/' })
      response.cookies.set('email', '', { expires: new Date(0), path: '/' })
      return response
    }
  }

  // If user is not authenticated and trying to access protected route
  if (!token && (isProtectedRoute || pathname.startsWith('/api'))) {
    console.log('Middleware: No token for protected route, redirecting to login')
    if (pathname.startsWith('/api')) {
      return new NextResponse('Unauthorized', { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If user has token, verify it
  if (token) {
    console.log('Middleware: Verifying token')
    const tokenVerification = await verifyToken(token)
    
    if (!tokenVerification.valid) {
      console.log('Middleware: Token verification failed, clearing cookies')
      // Token invalid, clear cookies and redirect to login
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.set('auth-token', '', { expires: new Date(0), path: '/' })
      response.cookies.set('user-role', '', { expires: new Date(0), path: '/' })
      response.cookies.set('email', '', { expires: new Date(0), path: '/' })
      return response
    }

    console.log('Middleware: Token verified successfully')

    // If authenticated user trying to access login page
    if (isPublicRoute && pathname !== '/register') {
      console.log('Middleware: Authenticated user accessing public route, redirecting')
      if (userRole === 'admin') {
        return NextResponse.redirect(new URL('/admin', request.url))
      } else if (userRole === 'reseller') {
        return NextResponse.redirect(new URL('/reseller', request.url))
      }
    }

    // Role-based access control
    if (userRole === 'reseller' && isAdminOnlyRoute) {
      console.log('Middleware: Reseller accessing admin route, redirecting')
      return NextResponse.redirect(new URL('/reseller', request.url))
    }
    
    if (userRole === 'admin' && isResellerOnlyRoute) {
      console.log('Middleware: Admin accessing reseller route, redirecting')
      return NextResponse.redirect(new URL('/admin', request.url))
    }

    // Additional security: check if role in cookie matches role in token
    const tokenRole = tokenVerification.payload.role
    if (tokenRole && tokenRole !== userRole) {
      console.log('Middleware: Role mismatch, clearing cookies')
      // Role mismatch, clear cookies and redirect to login
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.set('auth-token', '', { expires: new Date(0), path: '/' })
      response.cookies.set('user-role', '', { expires: new Date(0), path: '/' })
      response.cookies.set('email', '', { expires: new Date(0), path: '/' })
      return response
    }
  }

  // Security headers
  const response = NextResponse.next()
  
  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // CSP header untuk mencegah XSS
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: https:; font-src 'self' https://cdn.jsdelivr.net;"
  )

  console.log(`Middleware: Request processed successfully for ${pathname}`)
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (public images)
     * - robots.txt, sitemap.xml (SEO files)
     */
    '/((?!_next/static|_next/image|favicon.ico|images|robots.txt|sitemap.xml).*)',
  ],
}