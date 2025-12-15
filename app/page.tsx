'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ReviewForecast from '@/components/ReviewForecast'
import JLPTProgressChart from '@/components/JLPTProgressChart'
import SublevelProgress from '@/components/SublevelProgress'
import MasteryOverview from '@/components/MasteryOverview'
import DashboardGrid from '@/components/DashboardGrid'
import Navbar from '@/components/Navbar'
import { useUser } from '@/contexts/UserContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'

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
      <Navbar />
      <div className="container">
        <h1 style={{ marginBottom: '2rem', fontSize: '2rem', fontWeight: 'bold' }}>
          Dashboard
        </h1>

        {/* Dashboard Grid */}
        <DashboardGrid userId={user.id} />
      </div>
    </ProtectedRoute>
  )
}

