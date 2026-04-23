'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@/contexts/UserContext'

export default function SignupPage() {
  const router = useRouter()
  const { login } = useUser()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password, name }),
      })

      let data: { error?: string; details?: string; user?: { id: string; email: string; name: string | null } }
      try {
        data = await response.json()
      } catch {
        setError(`Server error (${response.status}). Try again or check Vercel function logs.`)
        setLoading(false)
        return
      }

      if (!response.ok) {
        const errorMsg = data.error || 'Failed to create account'
        setError(errorMsg)
        if (data.details) {
          console.error('Signup error details:', data.details)
        }
        console.error('Signup failed:', { status: response.status, error: errorMsg })
        setLoading(false)
        return
      }

      if (!data.user) {
        setError('Invalid response from server. Please try again.')
        setLoading(false)
        return
      }

      login(data.user)
      setLoading(false)
      router.push('/')
      router.refresh()
    } catch (err) {
      console.error('Signup error:', err)
      setError('An error occurred. Please check your connection and try again.')
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: '400px', margin: '4rem auto' }}>
      <div className="card">
        <h1 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Sign Up</h1>

        {error && (
          <div
            style={{
              padding: '0.75rem',
              background: '#fee2e2',
              color: '#991b1b',
              borderRadius: '0.375rem',
              marginBottom: '1rem',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="name"
              style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}
            >
              Name (optional)
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="Your name"
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="email"
              style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input"
              placeholder="your@email.com"
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label
              htmlFor="password"
              style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input"
              placeholder="••••••••"
              minLength={6}
            />
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
              Must be at least 6 characters
            </p>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', marginBottom: '1rem' }}
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
          <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#6366f1', fontWeight: 500 }}>
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
