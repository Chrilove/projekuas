// /api/delete-image/route.js
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
    console.log('Delete image API called')
    
    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.error('Cloudinary configuration missing')
      return NextResponse.json({
        success: false,
        error: 'Server configuration error - Cloudinary not configured'
      }, { status: 500 })
    }

    const body = await request.json()
    const { publicId } = body
    
    if (!publicId) {
      console.error('No public ID provided')
      return NextResponse.json({
        success: false,
        error: 'No public ID provided'
      }, { status: 400 })
    }

    console.log('Attempting to delete image with public ID:', publicId)

    // Use the destroy method to delete the image
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      invalidate: true // This ensures the image is immediately removed from CDN cache
    })

    console.log('Cloudinary delete result:', result)

    // Check if deletion was successful
    if (result.result === 'ok') {
      return NextResponse.json({
        success: true,
        message: 'Image deleted successfully',
        result: result
      })
    } else if (result.result === 'not found') {
      // Image was already deleted or doesn't exist
      console.log('Image not found, considering as successful deletion')
      return NextResponse.json({
        success: true,
        message: 'Image not found (may have been already deleted)',
        result: result
      })
    } else {
      console.error('Unexpected delete result:', result)
      return NextResponse.json({
        success: false,
        error: 'Failed to delete image',
        details: result
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Delete image API error:', error)
    
    // Handle specific Cloudinary errors
    let errorMessage = 'Failed to delete image'
    let statusCode = 500
    
    if (error.message) {
      if (error.message.includes('Invalid public_id')) {
        errorMessage = 'Invalid public ID format'
        statusCode = 400
      } else if (error.message.includes('Not found')) {
        errorMessage = 'Image not found'
        statusCode = 404
      } else if (error.message.includes('Unauthorized')) {
        errorMessage = 'Unauthorized - check API credentials'
        statusCode = 401
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: error.message
    }, { status: statusCode })
  }
}