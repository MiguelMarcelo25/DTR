export function CompletionBar({
  percentage,
  filled,
  total,
}: {
  percentage: number;
  filled?: number;
  total?: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Profile completion</span>
        <span className="font-medium">
          {percentage}%
          {filled !== undefined && total !== undefined && (
            <span className="ml-1 text-muted-foreground">
              ({filled}/{total})
            </span>
          )}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
    </div>
  );
}
