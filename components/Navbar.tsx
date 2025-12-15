'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@/contexts/UserContext'

export default function Navbar() {
  const { user, logout } = useUser()
  const pathname = usePathname()

  if (!user) {
    return null
  }

  const isActive = (path: string) => pathname === path

  return (
    <nav style={{
      background: 'white',
      borderBottom: '1px solid #e5e7eb',
      padding: '1rem 0',
      marginBottom: '2rem',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        {/* Logo/Title */}
        <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#6366f1' }}>
            Bunpou
          </h1>
        </Link>

        {/* Navigation Links */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Practice Section */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', paddingRight: '1rem', borderRight: '1px solid #e5e7eb' }}>
            <Link
              href="/learning"
              style={{
                padding: '0.5rem 1rem',
                background: isActive('/learning') ? '#6366f1' : 'transparent',
                color: isActive('/learning') ? 'white' : '#374151',
                borderRadius: '0.375rem',
                textDecoration: 'none',
                fontWeight: isActive('/learning') ? 600 : 500,
                fontSize: '0.875rem',
                transition: 'all 0.2s',
                border: isActive('/learning') ? 'none' : '1px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (!isActive('/learning')) {
                  e.currentTarget.style.background = '#f3f4f6'
                  e.currentTarget.style.borderColor = '#e5e7eb'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive('/learning')) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = 'transparent'
                }
              }}
            >
              Learn
            </Link>
            <Link
              href="/review"
              style={{
                padding: '0.5rem 1rem',
                background: isActive('/review') ? '#8b5cf6' : 'transparent',
                color: isActive('/review') ? 'white' : '#374151',
                borderRadius: '0.375rem',
                textDecoration: 'none',
                fontWeight: isActive('/review') ? 600 : 500,
                fontSize: '0.875rem',
                transition: 'all 0.2s',
                border: isActive('/review') ? 'none' : '1px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (!isActive('/review')) {
                  e.currentTarget.style.background = '#f3f4f6'
                  e.currentTarget.style.borderColor = '#e5e7eb'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive('/review')) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = 'transparent'
                }
              }}
            >
              Review
            </Link>
            <Link
              href="/master-review"
              style={{
                padding: '0.5rem 1rem',
                background: isActive('/master-review') ? '#06b6d4' : 'transparent',
                color: isActive('/master-review') ? 'white' : '#374151',
                borderRadius: '0.375rem',
                textDecoration: 'none',
                fontWeight: isActive('/master-review') ? 600 : 500,
                fontSize: '0.875rem',
                transition: 'all 0.2s',
                border: isActive('/master-review') ? 'none' : '1px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (!isActive('/master-review')) {
                  e.currentTarget.style.background = '#f3f4f6'
                  e.currentTarget.style.borderColor = '#e5e7eb'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive('/master-review')) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = 'transparent'
                }
              }}
            >
              Master Review
            </Link>
            <Link
              href="/achievement-test"
              style={{
                padding: '0.5rem 1rem',
                background: isActive('/achievement-test') ? '#10b981' : 'transparent',
                color: isActive('/achievement-test') ? 'white' : '#374151',
                borderRadius: '0.375rem',
                textDecoration: 'none',
                fontWeight: isActive('/achievement-test') ? 600 : 500,
                fontSize: '0.875rem',
                transition: 'all 0.2s',
                border: isActive('/achievement-test') ? 'none' : '1px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (!isActive('/achievement-test')) {
                  e.currentTarget.style.background = '#f3f4f6'
                  e.currentTarget.style.borderColor = '#e5e7eb'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive('/achievement-test')) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = 'transparent'
                }
              }}
            >
              Achievement Test
            </Link>
          </div>

          {/* Progress Section */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', paddingRight: '1rem', borderRight: '1px solid #e5e7eb' }}>
            <Link
              href="/progress"
              style={{
                padding: '0.5rem 1rem',
                background: isActive('/progress') ? '#f59e0b' : 'transparent',
                color: isActive('/progress') ? 'white' : '#374151',
                borderRadius: '0.375rem',
                textDecoration: 'none',
                fontWeight: isActive('/progress') ? 600 : 500,
                fontSize: '0.875rem',
                transition: 'all 0.2s',
                border: isActive('/progress') ? 'none' : '1px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (!isActive('/progress')) {
                  e.currentTarget.style.background = '#f3f4f6'
                  e.currentTarget.style.borderColor = '#e5e7eb'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive('/progress')) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = 'transparent'
                }
              }}
            >
              Progress
            </Link>
            <Link
              href="/inventory"
              style={{
                padding: '0.5rem 1rem',
                background: isActive('/inventory') ? '#ec4899' : 'transparent',
                color: isActive('/inventory') ? 'white' : '#374151',
                borderRadius: '0.375rem',
                textDecoration: 'none',
                fontWeight: isActive('/inventory') ? 600 : 500,
                fontSize: '0.875rem',
                transition: 'all 0.2s',
                border: isActive('/inventory') ? 'none' : '1px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (!isActive('/inventory')) {
                  e.currentTarget.style.background = '#f3f4f6'
                  e.currentTarget.style.borderColor = '#e5e7eb'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive('/inventory')) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = 'transparent'
                }
              }}
            >
              Inventory
            </Link>
          </div>

          {/* User Section */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              {user.name || user.email}
            </span>
            <button
              onClick={logout}
              style={{
                padding: '0.5rem 1rem',
                background: 'transparent',
                color: '#6b7280',
                border: '1px solid #e5e7eb',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                transition: 'all 0.2s',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f3f4f6'
                e.currentTarget.style.borderColor = '#d1d5db'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = '#e5e7eb'
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
