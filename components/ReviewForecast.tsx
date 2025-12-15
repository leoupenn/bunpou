'use client'

import { useState, useEffect } from 'react'
import { format, parseISO, isToday, isTomorrow, addDays } from 'date-fns'

interface ReviewForecastProps {
  userId: string
}

interface ForecastData {
  currentReviews: number
  currentMasterReviews?: number
  dailyForecast: Record<string, Record<number, number>>
  dailyTotals: Record<string, number>
  masterDailyForecast?: Record<string, Record<number, number>>
  masterDailyTotals?: Record<string, number>
}

export default function ReviewForecast({ userId }: ReviewForecastProps) {
  const [forecast, setForecast] = useState<ForecastData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())
  const [skippingWait, setSkippingWait] = useState(false)

  const fetchForecast = () => {
    setLoading(true)
    fetch(`/api/reviews/forecast?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        setForecast(data)
        setLoading(false)
        // Expand today by default
        if (data.dailyForecast) {
          const today = format(new Date(), 'yyyy-MM-dd')
          if (data.dailyForecast[today]) {
            setExpandedDays(new Set([today]))
          }
        }
      })
      .catch((err) => {
        console.error('Error fetching forecast:', err)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchForecast()
  }, [userId])

  const toggleDay = (dayKey: string) => {
    setExpandedDays((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(dayKey)) {
        newSet.delete(dayKey)
      } else {
        newSet.add(dayKey)
      }
      return newSet
    })
  }

  const getDayLabel = (dayKey: string) => {
    const date = parseISO(dayKey)
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    return format(date, 'EEE, MMM d')
  }

  const getMaxCount = (dayForecast: Record<number, number>) => {
    return Math.max(...Object.values(dayForecast), 0)
  }

  const handleSkipWait = async () => {
    if (skippingWait) return
    
    setSkippingWait(true)
    try {
      const response = await fetch('/api/reviews/skip-wait', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      const data = await response.json()

      if (response.ok) {
        // Refresh forecast
        fetchForecast()
      } else {
        alert(data.error || 'Error skipping wait time. Please try again.')
      }
    } catch (error) {
      console.error('Error skipping wait time:', error)
      alert('Error skipping wait time. Please try again.')
    } finally {
      setSkippingWait(false)
    }
  }

  if (loading) {
    return (
      <div className="card">
        <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: 600 }}>Review Forecast</h3>
        <p>Loading...</p>
      </div>
    )
  }

  if (!forecast) {
    return (
      <div className="card">
        <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: 600 }}>Review Forecast</h3>
        <p>Error loading forecast</p>
      </div>
    )
  }

  const sortedDays = Object.keys(forecast.dailyForecast || {}).sort()
  const totalUpcoming = Object.values(forecast.dailyTotals || {}).reduce((sum, count) => sum + count, 0)
  const totalReviews = forecast.currentReviews + totalUpcoming

  const sortedMasterDays = Object.keys(forecast.masterDailyForecast || {}).sort()
  const totalMasterUpcoming = Object.values(forecast.masterDailyTotals || {}).reduce((sum, count) => sum + count, 0)
  const totalMasterReviews = (forecast.currentMasterReviews || 0) + totalMasterUpcoming

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Review Forecast</h3>
        <button
          onClick={handleSkipWait}
          disabled={skippingWait}
          className="btn-secondary"
          style={{ 
            padding: '0.375rem 0.75rem',
            fontSize: '0.75rem',
            opacity: skippingWait ? 0.6 : 1,
            cursor: skippingWait ? 'not-allowed' : 'pointer'
          }}
          title="Make all upcoming reviews immediately available"
        >
          {skippingWait ? 'Skipping...' : '⏩ Skip Wait'}
        </button>
      </div>

      {/* Current Reviews */}
      {(forecast.currentReviews > 0 || (forecast.currentMasterReviews && forecast.currentMasterReviews > 0)) && (
        <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {forecast.currentReviews > 0 && (
            <div style={{ 
              padding: '1rem', 
              background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', 
              borderRadius: '0.5rem',
              border: '2px solid #93c5fd',
              boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e40af', marginBottom: '0.25rem' }}>
                    Level Review - Available Now
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#3b82f6' }}>
                    Ready to review immediately
                  </div>
                </div>
                <div style={{
                  background: '#1e40af',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.2)'
                }}>
                  {forecast.currentReviews}
                </div>
              </div>
            </div>
          )}
          {forecast.currentMasterReviews && forecast.currentMasterReviews > 0 && (
            <div style={{ 
              padding: '1rem', 
              background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', 
              borderRadius: '0.5rem',
              border: '2px solid #6ee7b7',
              boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#065f46', marginBottom: '0.25rem' }}>
                    Master Review - Available Now
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#10b981' }}>
                    Mastered items ready for review
                  </div>
                </div>
                <div style={{
                  background: '#065f46',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.2)'
                }}>
                  {forecast.currentMasterReviews}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Daily Forecast */}
      {sortedDays.length > 0 ? (
        <div>
          {sortedDays.map((dayKey) => {
            const dayForecast = forecast.dailyForecast[dayKey]
            const dayTotal = forecast.dailyTotals[dayKey] || 0
            const isExpanded = expandedDays.has(dayKey)
            const maxCount = getMaxCount(dayForecast)
            const hours = Array.from({ length: 24 }, (_, i) => i)

            return (
              <div key={dayKey} style={{ marginBottom: '0.75rem' }}>
                {/* Day Header */}
                <div
                  onClick={() => toggleDay(dayKey)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    background: isExpanded ? '#f0fdf4' : '#ffffff',
                    borderRadius: '0.5rem',
                    border: `2px solid ${isExpanded ? '#10b981' : '#e5e7eb'}`,
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'all 0.2s',
                    boxShadow: isExpanded 
                      ? '0 2px 4px -1px rgba(0, 0, 0, 0.1)' 
                      : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isExpanded) {
                      e.currentTarget.style.background = '#f9fafb'
                      e.currentTarget.style.borderColor = '#d1d5db'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isExpanded) {
                      e.currentTarget.style.background = '#ffffff'
                      e.currentTarget.style.borderColor = '#e5e7eb'
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                        fontSize: '0.875rem',
                        color: isExpanded ? '#10b981' : '#6b7280',
                        fontWeight: 'bold',
                      }}
                    >
                      ▶
                    </span>
                    <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#111827' }}>
                      {getDayLabel(dayKey)}
                    </span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    background: isExpanded ? '#10b981' : '#f3f4f6',
                    padding: '0.375rem 0.75rem',
                    borderRadius: '0.375rem',
                    transition: 'all 0.2s',
                  }}>
                    <span style={{ 
                      fontSize: '1rem', 
                      fontWeight: 700, 
                      color: isExpanded ? 'white' : '#059669'
                    }}>
                      {dayTotal}
                    </span>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      color: isExpanded ? 'rgba(255,255,255,0.9)' : '#6b7280',
                      fontWeight: 500
                    }}>
                      review{dayTotal !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Hourly Breakdown */}
                {isExpanded && (
                  <div style={{ 
                    marginTop: '0.5rem',
                    padding: '1rem',
                    background: '#fafafa',
                    borderRadius: '0.375rem',
                    border: '1px solid #e5e7eb'
                  }}>
                    <h4 style={{ 
                      fontSize: '0.875rem', 
                      fontWeight: 600, 
                      marginBottom: '1rem',
                      color: '#374151'
                    }}>
                      Hourly Breakdown
                    </h4>
                    <div style={{ 
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      maxHeight: '400px',
                      overflowY: 'auto',
                      paddingRight: '0.5rem'
                    }}>
                      {hours
                        .filter((hour) => (dayForecast[hour] || 0) > 0)
                        .map((hour) => {
                          const count = dayForecast[hour] || 0
                          const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0
                          
                          return (
                            <div
                              key={hour}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                              }}
                            >
                              <div style={{ 
                                minWidth: '60px',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                color: '#6b7280'
                              }}>
                                {hour.toString().padStart(2, '0')}:00
                              </div>
                              <div style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                position: 'relative',
                                height: '24px',
                              }}>
                                <div
                                  style={{
                                    width: `${barWidth}%`,
                                    height: '100%',
                                    background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                                    borderRadius: '0.25rem',
                                    minWidth: count > 0 ? '20px' : '0',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'flex-end',
                                    paddingRight: '0.5rem',
                                  }}
                                  title={`${count} review${count !== 1 ? 's' : ''} at ${hour}:00`}
                                >
                                  {count > 0 && (
                                    <span style={{ 
                                      fontSize: '0.75rem', 
                                      fontWeight: 600, 
                                      color: 'white',
                                      textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                    }}>
                                      {count}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      {hours.filter((hour) => (dayForecast[hour] || 0) > 0).length === 0 && (
                        <div style={{ 
                          padding: '1rem', 
                          textAlign: 'center', 
                          color: '#9ca3af',
                          fontSize: '0.875rem'
                        }}>
                          No reviews scheduled for this day
                        </div>
                      )}
                    </div>
                    <div style={{ 
                      marginTop: '1rem', 
                      paddingTop: '1rem', 
                      borderTop: '1px solid #e5e7eb',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        Reviews scheduled throughout the day
                      </span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                        Total: <span style={{ color: '#059669' }}>{dayTotal}</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Total Summary */}
          <div style={{ 
            marginTop: '1.5rem',
            padding: '1rem',
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            borderRadius: '0.5rem',
            border: '2px solid #86efac',
            boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#065f46' }}>
                Total Level Reviews (Next 7 Days)
              </span>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#059669' }}>
                {totalReviews}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ 
          padding: '1.5rem', 
          textAlign: 'center', 
          color: '#9ca3af',
          fontSize: '0.875rem'
        }}>
          No upcoming level reviews in the next week
        </div>
      )}

      {/* Master Review Section */}
      {sortedMasterDays.length > 0 && (
        <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '2px solid #e5e7eb' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#065f46' }}>
            Master Reviews
          </h4>
          {sortedMasterDays.map((dayKey) => {
            const dayForecast = forecast.masterDailyForecast![dayKey]
            const dayTotal = forecast.masterDailyTotals![dayKey] || 0
            const isExpanded = expandedDays.has(`master-${dayKey}`)
            const maxCount = getMaxCount(dayForecast)
            const hoursWithReviews = Object.keys(dayForecast).map(Number).sort((a, b) => a - b)

            return (
              <div key={`master-${dayKey}`} style={{ marginBottom: '0.75rem' }}>
                {/* Day Header */}
                <div
                  onClick={() => toggleDay(`master-${dayKey}`)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    background: isExpanded ? '#f0fdf4' : '#ffffff',
                    borderRadius: '0.5rem',
                    border: `2px solid ${isExpanded ? '#10b981' : '#d1fae5'}`,
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'all 0.2s',
                    boxShadow: isExpanded 
                      ? '0 2px 4px -1px rgba(0, 0, 0, 0.1)' 
                      : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', color: '#10b981' }}>
                      {isExpanded ? '▼' : '▶'}
                    </span>
                    <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>
                      {getDayLabel(dayKey)}
                    </span>
                  </div>
                  <span style={{ fontSize: '1rem', fontWeight: 600, color: '#059669' }}>
                    {dayTotal}
                  </span>
                </div>

                {/* Hourly Breakdown */}
                {isExpanded && hoursWithReviews.length > 0 && (
                  <div style={{ 
                    marginTop: '0.75rem', 
                    padding: '1rem', 
                    background: '#f9fafb', 
                    borderRadius: '0.5rem',
                    border: '1px solid #d1fae5'
                  }}>
                    {hoursWithReviews.map((hour) => {
                      const count = dayForecast[hour] || 0
                      const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0

                      return (
                        <div key={hour} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.75rem', 
                          marginBottom: '0.5rem' 
                        }}>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: 500, 
                            color: '#6b7280',
                            minWidth: '3.5rem'
                          }}>
                            {hour}:00
                          </span>
                          <div style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            position: 'relative',
                            height: '24px',
                          }}>
                            <div
                              style={{
                                width: `${barWidth}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                                borderRadius: '0.25rem',
                                minWidth: count > 0 ? '20px' : '0',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                paddingRight: '0.5rem',
                              }}
                            >
                              {count > 0 && (
                                <span style={{ 
                                  fontSize: '0.75rem', 
                                  fontWeight: 600, 
                                  color: 'white',
                                  textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                }}>
                                  {count}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    <div style={{ 
                      marginTop: '1rem', 
                      paddingTop: '1rem', 
                      borderTop: '1px solid #d1fae5',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        Master reviews scheduled throughout the day
                      </span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                        Total: <span style={{ color: '#059669' }}>{dayTotal}</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          <div style={{ 
            marginTop: '1.5rem',
            padding: '1rem',
            background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
            borderRadius: '0.5rem',
            border: '2px solid #6ee7b7',
            boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#065f46' }}>
                Total Master Reviews (Next 7 Days)
              </span>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#059669' }}>
                {totalMasterReviews}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

