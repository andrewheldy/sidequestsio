export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function timeAgo(minutes: number): string {
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  return hours === 1 ? '1 hr ago' : `${hours} hrs ago`
}
