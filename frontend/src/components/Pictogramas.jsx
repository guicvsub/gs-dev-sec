// Pictogramas no estilo dos semáforos de pedestre (desenhados à mão em SVG)

export function Pedestre({ className = '', title }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <circle cx="13.2" cy="3.6" r="2.1" />
      <path d="M11.4 6.6c.9-.4 1.9-.3 2.6.3l2.4 2.3 2.4.6c.6.2.9.7.8 1.3-.2.6-.7.9-1.3.8l-2.8-.7a1 1 0 01-.5-.3l-.9-.9-.8 3.6 2.3 2.4c.2.2.3.4.3.7l.5 4.6c.1.6-.4 1.1-1 1.2-.6.1-1.1-.4-1.2-1l-.4-4.2-2.5-2.5-1 4.2c-.1.2-.2.4-.3.5l-2.8 3.3c-.4.5-1.1.5-1.5.1-.5-.4-.5-1.1-.1-1.5l2.6-3 1.6-7.1-1.3.6-1 2.6c-.2.6-.8.9-1.4.6-.5-.2-.8-.8-.6-1.4l1.2-3c.1-.3.3-.5.5-.6l3.2-1.5z" />
    </svg>
  )
}

export function Mao({ className = '', title }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <rect x="7" y="3.2" width="2.4" height="10" rx="1.2" />
      <rect x="10.1" y="2" width="2.4" height="11" rx="1.2" />
      <rect x="13.2" y="2.6" width="2.4" height="10.5" rx="1.2" />
      <rect x="16.3" y="4.4" width="2.3" height="9" rx="1.15" />
      <path d="M7 11h11.6v3.8c0 3.9-2.7 7.2-6.4 7.2-2.3 0-4-1-5.3-3L3.7 14.4c-.5-.7-.3-1.6.4-2 .6-.4 1.4-.3 1.9.3L7 14z" />
    </svg>
  )
}

export function Zebra({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M2 17h3.2l1-10H4.4z" />
      <path d="M7.4 17h3.2l.4-10H8.6z" />
      <path d="M12.8 17H16l-.6-10h-2.2z" />
      <path d="M18.2 17h3.2L19.6 7h-1.8z" />
    </svg>
  )
}

export function Olho({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  )
}
