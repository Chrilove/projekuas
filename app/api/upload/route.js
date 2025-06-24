// /api/upload/route.js
import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

export async function POST(request) {
  try {
    console.log('Upload API called')
    
    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.error('Cloudinary configuration missing')
      return NextResponse.json({
        success: false,
        error: 'Server configuration error - Cloudinary not configured'
      }, { status: 500 })
    }

    console.log('Local server time (ISO):', new Date().toISOString())

    const formData = await request.formData()
    const file = formData.get('image')
    const productName = formData.get('productName')
    
    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file uploaded'
      }, { status: 400 })
    }

    console.log('Processing file:', {
      name: file.name,
      size: file.size,
      type: file.type
    })

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Create a promise-based upload
    const uploadPromise = new Promise((resolve, reject) => {
      const uploadOptions = {
        folder: 'cosmetic-products',
        public_id: `${productName}-${Date.now()}`.replace(/[^a-zA-Z0-9-_]/g, '-'),
        resource_type: 'auto',
        overwrite: true,
        // Use current timestamp to avoid stale request
        timestamp: Math.floor(Date.now() / 1000),
        // Add quality optimization
        quality: 'auto:good',
        fetch_format: 'auto',
        // Set timeout
        timeout: 30000
      }

      console.log('Starting Cloudinary upload with options:', uploadOptions)

      cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error)
            
            // Handle specific error types
            if (error.message && error.message.includes('Stale request')) {
              reject(new Error('Stale request'))
            } else if (error.message && error.message.includes('timeout')) {
              reject(new Error('Upload timeout'))
            } else {
              reject(new Error(error.message || 'Cloudinary upload failed'))
            }
          } else {
            console.log('Cloudinary upload successful:', {
              public_id: result.public_id,
              secure_url: result.secure_url,
              format: result.format,
              bytes: result.bytes
            })
            resolve(result)
          }
        }
      ).end(buffer)
    })

    // Set a timeout for the entire operation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Upload timeout')), 35000) // 35 seconds
    })

    // Race between upload and timeout
    const result = await Promise.race([uploadPromise, timeoutPromise])

    return NextResponse.json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      bytes: result.bytes
    })

  } catch (error) {
    console.error('Upload API error:', error)
    
    // Return specific error messages
    if (error.message.includes('Stale request')) {
      return NextResponse.json({
        success: false,
        error: 'Stale request - please try again',
        details: error.message
      }, { status: 400 })
    } else if (error.message.includes('timeout')) {
      return NextResponse.json({
        success: false,
        error: 'Upload timeout - please try again',
        details: error.message
      }, { status: 408 })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Upload failed',
        details: error.message
      }, { status: 500 })
    }
  }
}