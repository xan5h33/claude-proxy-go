export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-mono font-bold ${className}`}>
      <span style={{ color: "#00ff88" }}>|</span>
      <span>ad</span>
      <span style={{ color: "#00ff88" }}>|</span>
      <span>e</span>
    </span>
  )
}
