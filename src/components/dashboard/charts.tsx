type ChartPoint = {
  label: string;
  value: number;
};

type BarItem = {
  label: string;
  value: number;
  detail?: string;
};

type RingSegment = {
  label: string;
  value: number;
  tone?: "blue" | "green" | "amber" | "slate";
};

function finite(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function linePoints(values: number[], width: number, height: number, padding: number) {
  const safe = values.map(finite);
  const min = Math.min(...safe);
  const max = Math.max(...safe);
  const range = max - min || 1;
  return safe.map((value, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(safe.length - 1, 1);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return { x, y };
  });
}

export function MiniSparkline({
  values,
  tone = "blue",
}: {
  values: number[];
  tone?: "blue" | "green";
}) {
  const usable = values.length > 1 ? values : [0, values[0] || 0];
  const points = linePoints(usable, 132, 42, 3);
  const path = points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
  const area = `${path} L 129 42 L 3 42 Z`;
  return (
    <svg className={`mini-sparkline ${tone}`} viewBox="0 0 132 42" aria-hidden="true">
      <path className="spark-area" d={area} />
      <path className="spark-line" d={path} />
    </svg>
  );
}

export function TrendLineChart({
  data,
  valueLabel,
  formatValue = (value) => String(value),
}: {
  data: ChartPoint[];
  valueLabel: string;
  formatValue?: (value: number) => string;
}) {
  if (!data.length) return <p className="chart-empty">Not enough data to show a trend yet.</p>;
  const width = 720;
  const height = 250;
  const paddingX = 38;
  const paddingY = 28;
  const values = data.map((item) => finite(item.value));
  const points = linePoints(values, width, height, paddingY).map((point, index) => ({
    ...point,
    x: paddingX + (index * (width - paddingX * 2)) / Math.max(data.length - 1, 1),
  }));
  const path = points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
  const area = `${path} L ${points.at(-1)?.x || paddingX} ${height - paddingY} L ${paddingX} ${height - paddingY} Z`;
  const max = Math.max(...values);
  const min = Math.min(...values);

  return (
    <div className="trend-chart">
      <div className="chart-summary">
        <div><span>Highest</span><strong>{formatValue(max)}</strong></div>
        <div><span>Latest</span><strong>{formatValue(values.at(-1) || 0)}</strong></div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${valueLabel} trend from ${data[0].label} to ${data.at(-1)?.label}. Lowest ${formatValue(min)}, highest ${formatValue(max)}.`}>
        {[0, 1, 2, 3].map((line) => {
          const y = paddingY + (line * (height - paddingY * 2)) / 3;
          return <line className="chart-grid-line" x1={paddingX} x2={width - paddingX} y1={y} y2={y} key={line} />;
        })}
        <path className="chart-area" d={area} />
        <path className="chart-line" d={path} />
        {points.map((point, index) => <circle className="chart-point" cx={point.x} cy={point.y} r="4" key={data[index].label} />)}
      </svg>
      <div className="chart-labels">
        {data.map((item) => <span key={item.label}>{item.label}</span>)}
      </div>
    </div>
  );
}

export function HorizontalBars({
  items,
  valueLabel = "clients",
}: {
  items: BarItem[];
  valueLabel?: string;
}) {
  const max = Math.max(...items.map((item) => finite(item.value)), 1);
  if (!items.length) return <p className="chart-empty">No category data is available yet.</p>;
  return (
    <div className="horizontal-bars" role="img" aria-label={`${valueLabel} by category`}>
      {items.map((item) => (
        <div className="horizontal-bar" key={item.label}>
          <div><strong>{item.label}</strong><span>{item.detail || `${item.value} ${valueLabel}`}</span></div>
          <div className="horizontal-track"><span style={{ width: `${Math.max((item.value / max) * 100, item.value ? 4 : 0)}%` }} /></div>
          <b>{item.value}</b>
        </div>
      ))}
    </div>
  );
}

export function RingChart({
  segments,
  centerLabel,
  centerValue,
}: {
  segments: RingSegment[];
  centerLabel: string;
  centerValue: string;
}) {
  const total = Math.max(segments.reduce((sum, segment) => sum + finite(segment.value), 0), 1);
  const circles = segments.map((segment, index) => {
    const percent = (finite(segment.value) / total) * 100;
    const progress = segments
      .slice(0, index)
      .reduce((sum, item) => sum + (finite(item.value) / total) * 100, 0);
    return (
      <circle
        className={`ring-segment ${segment.tone || "blue"}`}
        cx="70"
        cy="70"
        r="54"
        pathLength="100"
        strokeDasharray={`${percent} ${100 - percent}`}
        strokeDashoffset={-progress}
        key={segment.label}
      />
    );
  });
  return (
    <div className="ring-chart-wrap">
      <div className="ring-chart">
        <svg viewBox="0 0 140 140" role="img" aria-label={segments.map((segment) => `${segment.label}: ${segment.value}`).join(", ")}>
          <circle className="ring-track" cx="70" cy="70" r="54" />
          {circles}
        </svg>
        <div><strong>{centerValue}</strong><span>{centerLabel}</span></div>
      </div>
      <div className="ring-legend">
        {segments.map((segment) => <div key={segment.label}><i className={segment.tone || "blue"} /><span>{segment.label}</span><strong>{segment.value}</strong></div>)}
      </div>
    </div>
  );
}
