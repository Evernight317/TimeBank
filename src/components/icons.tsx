import type { SVGProps } from 'react'

const paths: Record<string, React.ReactNode> = {
  today: (
    <>
      <rect x="3.5" y="4.5" width="17" height="16" rx="3" />
      <path d="M8 3v3M16 3v3M3.5 9.5h17" />
      <path d="M8 13.5h2M14 13.5h2M8 17h2M14 17h2" />
    </>
  ),
  schedule: (
    <>
      <path d="M4 6.5h16M4 12h16M4 17.5h10" />
      <circle cx="19" cy="17.5" r="2.2" />
    </>
  ),
  records: (
    <>
      <path d="M6 3.5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z" />
      <path d="M8 8.5h8M8 12.5h8M8 16.5h5" />
    </>
  ),
  assets: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v8.5l6 3.2" />
    </>
  ),
  replay: (
    <>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
      <path d="M3.5 4.5v4h4" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  insights: (
    <>
      <path d="M9 18.5h6M10 21.5h4" />
      <path d="M12 3.5a6 6 0 0 0-3.6 10.8c.6.5.9 1.1.9 1.8v.4h5.4v-.4c0-.7.3-1.3.9-1.8A6 6 0 0 0 12 3.5Z" />
      <path d="M10 12.5 11.6 9 13 12.5l1.2-2" />
    </>
  ),
  budget: (
    <>
      <path d="M3.5 7.5h17v11a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-11Z" />
      <path d="M3.5 7.5 15 3.8a1.6 1.6 0 0 1 2 1.1l.6 2.6" />
      <path d="M16.5 13.5h2" />
    </>
  ),
  persona: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20.5c.6-3.8 3.6-6 7.5-6s6.9 2.2 7.5 6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m4.5 12.5 4.5 4.5 10.5-11" />,
  play: <path d="M7 4.5 19 12 7 19.5Z" />,
  spark: (
    <path d="M12 3.5 13.8 9l5.7 1.6-4.4 4 1 5.8-4.8-2.9-4.8 2.9 1-5.8-4.4-4L9.9 9Z" />
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  trash: (
    <>
      <path d="M4.5 7h15M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2" />
      <path d="M6.5 7 7.5 20h9l1-13" />
    </>
  ),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
    </>
  ),
}

export type IconName = keyof typeof paths

export function Icon({
  name,
  size = 18,
  ...rest
}: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {paths[name]}
    </svg>
  )
}

export function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.6" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 7.2V12l3.2 2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path d="M12 1.8v2.2M12 20v2.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
