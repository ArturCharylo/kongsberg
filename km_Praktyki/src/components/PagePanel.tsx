import type { ReactNode } from 'react'

type PagePanelProps = {
  eyebrow: string
  title: string
  children: ReactNode
  className?: string
}

export function PagePanel({ eyebrow, title, children, className = '' }: PagePanelProps) {
  return (
    <section className={`page-panel ${className}`.trim()}>
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {children}
    </section>
  )
}
