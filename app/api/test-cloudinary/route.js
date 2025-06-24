// File: app/api/test-cloudinary/route.js

import { NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function GET() {
  try {
    // Test environment variables
    const envCheck = {
      CLOUDINARY_CLOUD_NAME: !!process.env.CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: !!process.env.CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET: !!process.env.CLOUDINARY_API_SECRET,
    }

    // Test Cloudinary connection
    const pingResult = await cloudinary.api.ping()
    
    return NextResponse.json({
      success: true,
      environment: envCheck,
      cloudinary: pingResult,
      message: 'Cloudinary connection successful'
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      environment: {
        CLOUDINARY_CLOUD_NAME: !!process.env.CLOUDINARY_CLOUD_NAME,
        CLOUDINARY_API_KEY: !!process.env.CLOUDINARY_API_KEY,
        CLOUDINARY_API_SECRET: !!process.env.CLOUDINARY_API_SECRET,
      }
    }, { status: 500 })
  }
}