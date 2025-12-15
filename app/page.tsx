'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ReviewForecast from '@/components/ReviewForecast'
import JLPTProgressChart from '@/components/JLPTProgressChart'
import SublevelProgress from '@/components/SublevelProgress'
import MasteryOverview from '@/components/MasteryOverview'
import DashboardGrid from '@/components/DashboardGrid'
import { useUser } from '@/contexts/UserContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'

function LogoutButton() {
  const { logout } = useUser()
  return (
    <button
      onClick={logout}
      style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
    >
      Logout
    </button>
  )
}

export default function Home() {
  const { user, loading } = useUser()

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '4rem' }}>
        <p>Loading...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container">
        <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
          <h1 style={{ marginBottom: '2rem' }}>Bunpou - Japanese Grammar Learning</h1>
          <div className="card">
            <h2>Welcome to Bunpou</h2>
            <p style={{ marginTop: '1rem', marginBottom: '2rem' }}>
              Learn Japanese grammar through spaced repetition and AI-powered feedback.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <Link href="/login">
                <button className="btn-primary">Login</button>
              </Link>
              <Link href="/signup">
                <button className="btn-secondary">Sign Up</button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ margin: 0 }}>Bunpou - Japanese Grammar Learning</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              {user.name || user.email}
            </span>
            <LogoutButton />
          </div>
        </div>

        <nav style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <Link href="/learning" style={{ padding: '0.5rem 1rem', background: '#6366f1', color: 'white', borderRadius: '0.375rem', textDecoration: 'none', fontWeight: 500 }}>
              Learn New Grammar
            </Link>
            <Link href="/review" style={{ padding: '0.5rem 1rem', background: '#8b5cf6', color: 'white', borderRadius: '0.375rem', textDecoration: 'none', fontWeight: 500 }}>
              Review
            </Link>
            <Link href="/master-review" style={{ padding: '0.5rem 1rem', background: '#06b6d4', color: 'white', borderRadius: '0.375rem', textDecoration: 'none', fontWeight: 500 }}>
              Master Review
            </Link>
            <Link href="/achievement-test" style={{ padding: '0.5rem 1rem', background: '#10b981', color: 'white', borderRadius: '0.375rem', textDecoration: 'none', fontWeight: 500 }}>
              Achievement Test
            </Link>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            <Link href="/progress" style={{ padding: '0.5rem 1rem', background: '#f59e0b', color: 'white', borderRadius: '0.375rem', textDecoration: 'none', fontWeight: 500 }}>
              My Progress
            </Link>
            <Link href="/inventory" style={{ padding: '0.5rem 1rem', background: '#ec4899', color: 'white', borderRadius: '0.375rem', textDecoration: 'none', fontWeight: 500 }}>
              Inventory
            </Link>
          </div>
        </nav>

        {/* Dashboard Grid */}
        <DashboardGrid userId={user.id} />
      </div>
    </ProtectedRoute>
  )
}

