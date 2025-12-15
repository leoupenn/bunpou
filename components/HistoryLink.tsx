'use client'

import Link from 'next/link'

interface HistoryLinkProps {
  grammarProgressId: string
}

export default function HistoryLink({ grammarProgressId }: HistoryLinkProps) {
  return (
    <Link
      href={`/history/${grammarProgressId}`}
      className="history-arrow"
      title="View past attempts"
    >
      →
    </Link>
  )
}

