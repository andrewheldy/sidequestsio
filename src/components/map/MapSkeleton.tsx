interface MapSkeletonProps {
  height?: string;
}

const MapSkeleton = ({ height = '380px' }: MapSkeletonProps) => (
  <div
    className="animate-pulse overflow-hidden rounded-2xl"
    style={{ height }}
    aria-label="Loading map…"
    role="status"
  >
    <div className="h-full w-full bg-gradient-to-br from-card/80 via-muted/40 to-card/60" />
  </div>
);

export default MapSkeleton;
