import { useEffect, useState } from 'react'

export interface ClockValue {
  /** e.g. "7:42 PM" */
  time: string
  /** e.g. "FRI, MAY 24" */
  date: string
}

function read(): ClockValue {
  const now = new Date()
  const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const date = now
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    .toUpperCase()
    .replace(/,\s/, ', ')
  return { time, date }
}

export function useClock(): ClockValue {
  const [value, setValue] = useState<ClockValue>(read)
  useEffect(() => {
    const id = setInterval(() => setValue(read()), 10_000)
    return () => clearInterval(id)
  }, [])
  return value
}
