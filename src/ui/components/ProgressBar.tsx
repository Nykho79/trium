interface ProgressBarProps {
  value: number;
  max: number;
  label: string;
  tone?: "cyan" | "amber" | "violet";
}

function progressPercent(value: number, max: number): number {
  if (max <= 0) {
    return 0;
  }
  return Math.min(100, Math.max(0, (value / max) * 100));
}

export function ProgressBar({ value, max, label, tone = "cyan" }: ProgressBarProps) {
  const percent = progressPercent(value, max);
  return (
    <div className={`progress progress-${tone}`}>
      <div className="progress-meta">
        <span>{label}</span>
        <strong>{Math.round(percent)}%</strong>
      </div>
      <div className="progress-track" role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
        <span className="progress-fill" style={{ inlineSize: `${percent}%` }} />
      </div>
    </div>
  );
}