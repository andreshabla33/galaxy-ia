'use client'

import { useState, useEffect } from 'react'

export type DeviceType = 'mobile' | 'tablet' | 'desktop'

const BREAKPOINTS = {
  mobile: 768,   // < 768px
  tablet: 1024,  // 768px - 1023px
  desktop: 1024, // >= 1024px
}

export function useMediaQuery(): {
  device: DeviceType
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  width: number
} {
  const [width, setWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1280
  )

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isMobile = width < BREAKPOINTS.mobile
  const isTablet = width >= BREAKPOINTS.mobile && width < BREAKPOINTS.desktop
  const isDesktop = width >= BREAKPOINTS.desktop

  const device: DeviceType = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'

  return { device, isMobile, isTablet, isDesktop, width }
}
