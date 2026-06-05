export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="size-6 rounded-full border-2 border-border border-t-primary animate-spin" />
    </div>
  )
}
