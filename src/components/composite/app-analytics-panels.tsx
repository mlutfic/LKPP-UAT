"use client";

import * as React from "react";

import { AppCard, AppCardDescription, AppCardTitle } from "@/components/ui/app-card";
import { cn } from "@/lib/utils";

type AnalyticsTone = "role" | "info" | "warning" | "success" | "danger" | "neutral";

type AnalyticsItem = {
  label: string;
  value: number;
  meta?: string;
  tone?: AnalyticsTone;
};

type AnalyticsSeries = {
  label: string;
  values: number[];
  tone?: AnalyticsTone;
};

const toneClassMap: Record<AnalyticsTone, string> = {
  role: "bg-role-accent",
  info: "bg-sky-500",
  warning: "bg-amber-500",
  success: "bg-emerald-500",
  danger: "bg-rose-600",
  neutral: "bg-slate-400",
};

const toneColorMap: Record<AnalyticsTone, string> = {
  role: "var(--color-chart-1)",
  info: "var(--color-chart-2)",
  warning: "var(--color-chart-4)",
  success: "var(--color-chart-5)",
  danger: "#c1121f",
  neutral: "var(--color-chart-3)",
};

function resolveToneClass(tone: AnalyticsTone = "role") {
  return toneClassMap[tone];
}

function resolveToneColor(tone: AnalyticsTone = "role") {
  return toneColorMap[tone];
}

function getChartScale(maxValue: number, segments = 4) {
  const safeMax = Math.max(maxValue, 1);
  const step = Math.max(1, Math.ceil(safeMax / segments));
  const scaleMax = step * segments;
  const ticks = Array.from({ length: segments + 1 }, (_, index) => index * step);

  return { scaleMax, ticks };
}

function formatTickValue(value: number) {
  if (value >= 1000) {
    return `${Math.round(value / 100) / 10}k`;
  }

  return String(value);
}

function buildLinePath(points: Array<{ x: number; y: number }>) {
  if (!points.length) {
    return "";
  }

  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function getSmoothControlPoint(
  current: { x: number; y: number },
  previous?: { x: number; y: number },
  next?: { x: number; y: number },
  reverse = false,
) {
  const prev = previous ?? current;
  const nxt = next ?? current;
  const smoothing = 0.18;
  const angle =
    Math.atan2(nxt.y - prev.y, nxt.x - prev.x) + (reverse ? Math.PI : 0);
  const length = Math.hypot(nxt.x - prev.x, nxt.y - prev.y) * smoothing;

  return {
    x: current.x + Math.cos(angle) * length,
    y: current.y + Math.sin(angle) * length,
  };
}

function buildSmoothLinePath(points: Array<{ x: number; y: number }>) {
  if (!points.length) {
    return "";
  }

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }

  return points.reduce((path, point, index, allPoints) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }

    const previousPoint = allPoints[index - 1];
    const previousPreviousPoint = allPoints[index - 2];
    const nextPoint = allPoints[index + 1];
    const controlPointStart = getSmoothControlPoint(
      previousPoint,
      previousPreviousPoint,
      point,
    );
    const controlPointEnd = getSmoothControlPoint(
      point,
      previousPoint,
      nextPoint,
      true,
    );

    return `${path} C ${controlPointStart.x} ${controlPointStart.y}, ${controlPointEnd.x} ${controlPointEnd.y}, ${point.x} ${point.y}`;
  }, "");
}

function buildAreaPath(points: Array<{ x: number; y: number }>, baselineY: number) {
  if (!points.length) {
    return "";
  }

  const line = buildLinePath(points);
  const first = points[0];
  const last = points[points.length - 1];

  return `${line} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
}

function buildSmoothAreaPath(points: Array<{ x: number; y: number }>, baselineY: number) {
  if (!points.length) {
    return "";
  }

  const line = buildSmoothLinePath(points);
  const first = points[0];
  const last = points[points.length - 1];

  return `${line} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
}

function buildStackedAreaPath(
  upperPoints: Array<{ x: number; y: number }>,
  lowerPoints: Array<{ x: number; y: number }>,
) {
  if (!upperPoints.length || !lowerPoints.length) {
    return "";
  }

  const upper = upperPoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const lower = [...lowerPoints]
    .reverse()
    .map((point) => `L ${point.x} ${point.y}`)
    .join(" ");

  return `${upper} ${lower} Z`;
}

type ChartTooltipState = {
  title: string;
  value: string;
  meta?: string;
  leftPercent: number;
  topPercent: number;
  accentColor?: string;
};

function ChartTooltip({ tooltip }: { tooltip: ChartTooltipState | null }) {
  if (!tooltip) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute z-10 min-w-[148px] -translate-x-1/2 -translate-y-[calc(100%+18px)] rounded-[18px] border border-border bg-white/96 px-3 py-2 shadow-[0_14px_40px_rgba(15,23,42,0.12)] backdrop-blur-sm"
      style={{
        left: `${tooltip.leftPercent}%`,
        top: `${tooltip.topPercent}%`,
      }}
    >
      <div className="flex items-center gap-2">
        {tooltip.accentColor ? (
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: tooltip.accentColor }}
          />
        ) : null}
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {tooltip.title}
        </p>
      </div>
      <p className="mt-1 text-base font-bold tracking-tight text-foreground">{tooltip.value}</p>
      {tooltip.meta ? (
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{tooltip.meta}</p>
      ) : null}
    </div>
  );
}

export function AppAnalyticsPanel({
  eyebrow,
  title,
  description,
  className,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <AppCard padding="lg" className={cn("space-y-5", className)}>
      <div className="space-y-1.5">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">
            {eyebrow}
          </p>
        ) : null}
        <AppCardTitle className="text-xl">{title}</AppCardTitle>
        {description ? <AppCardDescription>{description}</AppCardDescription> : null}
      </div>
      {children}
    </AppCard>
  );
}

export function AppAnalyticsBarList({
  items,
  valueSuffix = "",
  variant = "default",
  showRatioLabel = false,
}: {
  items: AnalyticsItem[];
  valueSuffix?: string;
  variant?: "default" | "highlight";
  showRatioLabel?: boolean;
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const width = `${Math.max((item.value / maxValue) * 100, item.value > 0 ? 8 : 0)}%`;
        const ratioLabel = `${Math.round((item.value / maxValue) * 100)}%`;
        return (
          <div
            key={item.label}
            className={cn(
              "space-y-2",
              variant === "highlight" && "rounded-[24px] bg-surface-container-low px-4 py-4",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{item.label}</p>
                {item.meta ? (
                  <p className="truncate text-xs text-muted-foreground">{item.meta}</p>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-foreground">
                  {item.value}
                  {valueSuffix}
                </p>
                {variant === "highlight" && showRatioLabel ? (
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {ratioLabel}
                  </p>
                ) : null}
              </div>
            </div>
            <div
              className={cn(
                "rounded-full",
                variant === "highlight" ? "h-4 bg-background/70" : "h-2.5 bg-surface-container-low",
              )}
            >
              <div
                className={cn(
                  "h-full rounded-full",
                  resolveToneClass(item.tone),
                  variant === "highlight" && "shadow-[inset_0_-1px_0_rgba(0,0,0,0.08)]",
                )}
                style={{ width }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AppAnalyticsMetricTiles({
  items,
  valueSuffix = "",
}: {
  items: AnalyticsItem[];
  valueSuffix?: string;
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
      {items.map((item) => {
        const width = `${Math.max((item.value / maxValue) * 100, item.value > 0 ? 12 : 0)}%`;

        return (
          <div
            key={item.label}
            className="flex min-h-[148px] min-w-0 flex-col rounded-[24px] border border-border bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-role-accent)_5%,white),white)] p-4"
          >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0 space-y-1">
                {item.meta ? (
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {item.meta}
                  </p>
                ) : null}
                <p className="break-words text-base font-semibold leading-6 text-foreground">{item.label}</p>
              </div>
              <div className="shrink-0 rounded-full bg-surface-container-low px-3 py-1.5 text-right">
                <p className="text-lg font-bold tracking-tight text-foreground">
                  {item.value}
                  {valueSuffix}
                </p>
              </div>
            </div>
            <div className="mt-auto pt-5">
              <div className="h-2.5 rounded-full bg-surface-container-low">
                <div
                  className={cn("h-full rounded-full", resolveToneClass(item.tone))}
                  style={{ width }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AppAnalyticsSegmentBar({
  items,
}: {
  items: AnalyticsItem[];
}) {
  const total = Math.max(items.reduce((sum, item) => sum + item.value, 0), 1);

  return (
    <div className="space-y-4">
      <div className="flex h-4 overflow-hidden rounded-full bg-surface-container-low">
        {items.map((item) => (
          <div
            key={item.label}
            className={resolveToneClass(item.tone)}
            style={{ width: `${(item.value / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-[20px] bg-surface-container-low px-3 py-3"
          >
            <div className="flex items-center gap-2">
              <span className={cn("size-2.5 rounded-full", resolveToneClass(item.tone))} />
              <span className="text-sm font-medium text-foreground">{item.label}</span>
            </div>
            <span className="text-sm font-semibold text-foreground">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AppAnalyticsAreaChart({
  items,
  heightClassName = "h-64",
  valueSuffix = "",
}: {
  items: AnalyticsItem[];
  heightClassName?: string;
  valueSuffix?: string;
}) {
  const gradientId = React.useId();
  const chartWidth = 640;
  const chartHeight = 260;
  const margin = { top: 18, right: 12, bottom: 34, left: 40 };
  const innerWidth = chartWidth - margin.left - margin.right;
  const innerHeight = chartHeight - margin.top - margin.bottom;
  const maxValue = Math.max(...items.map((item) => item.value), 1);
  const { scaleMax, ticks } = getChartScale(maxValue);
  const stepX = items.length > 1 ? innerWidth / (items.length - 1) : innerWidth / 2;
  const baselineY = margin.top + innerHeight;
  const [tooltip, setTooltip] = React.useState<ChartTooltipState | null>(null);
  const points = items.map((item, index) => ({
    x: margin.left + (items.length > 1 ? index * stepX : innerWidth / 2),
    y: baselineY - (item.value / scaleMax) * innerHeight,
    value: item.value,
    label: item.label,
  }));
  const linePath = buildSmoothLinePath(points);
  const areaPath = buildSmoothAreaPath(points, baselineY);
  const color = resolveToneColor(items[0]?.tone);

  return (
    <div className="space-y-4">
      <div
        className="relative"
        onMouseLeave={() => setTooltip(null)}
      >
        <ChartTooltip tooltip={tooltip} />
        <div
        className={cn(
          "rounded-[28px] border border-border bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-role-accent)_10%,white),white)] p-3",
          heightClassName,
        )}
      >
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-full w-full overflow-visible">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.34" />
              <stop offset="100%" stopColor={color} stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {ticks.map((tick) => {
            const y = baselineY - (tick / scaleMax) * innerHeight;
            return (
              <g key={tick}>
                <line
                  x1={margin.left}
                  x2={chartWidth - margin.right}
                  y1={y}
                  y2={y}
                  stroke="color-mix(in srgb, var(--color-role-accent) 10%, var(--color-outline))"
                  strokeDasharray={tick === 0 ? undefined : "4 6"}
                />
                <text
                  x={margin.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-muted-foreground text-[11px] font-semibold"
                >
                  {formatTickValue(tick)}
                </text>
              </g>
            );
          })}

          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((point) => (
            <g key={`${point.label}-${point.value}`}>
              <circle cx={point.x} cy={point.y} r="4.5" fill="white" stroke={color} strokeWidth="2.5" />
              <circle
                cx={point.x}
                cy={point.y}
                r="16"
                fill="transparent"
                onMouseEnter={() =>
                  setTooltip({
                    title: point.label,
                    value: `${point.value}${valueSuffix}`,
                    leftPercent: (point.x / chartWidth) * 100,
                    topPercent: (point.y / chartHeight) * 100,
                    accentColor: color,
                  })
                }
              >
                <title>
                  {point.label}: {point.value}
                  {valueSuffix}
                </title>
              </circle>
              <text
                x={point.x}
                y={chartHeight - 6}
                textAnchor="middle"
                className="fill-muted-foreground text-[11px] font-semibold"
              >
                {point.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
        {items.slice(-3).map((item) => (
          <div key={item.label} className="rounded-[20px] bg-surface-container-low px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-2 text-lg font-bold tracking-tight text-foreground">
              {item.value}
              {valueSuffix}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AppAnalyticsStackedAreaChart({
  labels,
  series,
  heightClassName = "h-72",
}: {
  labels: string[];
  series: AnalyticsSeries[];
  heightClassName?: string;
}) {
  const chartWidth = 680;
  const chartHeight = 280;
  const margin = { top: 18, right: 14, bottom: 34, left: 40 };
  const innerWidth = chartWidth - margin.left - margin.right;
  const innerHeight = chartHeight - margin.top - margin.bottom;
  const labelCount = labels.length;
  const stepX = labelCount > 1 ? innerWidth / (labelCount - 1) : innerWidth / 2;
  const totals = labels.map((_, index) =>
    series.reduce((sum, item) => sum + (item.values[index] ?? 0), 0),
  );
  const maxValue = Math.max(...totals, 1);
  const { scaleMax, ticks } = getChartScale(maxValue);
  const baselineY = margin.top + innerHeight;
  const [tooltip, setTooltip] = React.useState<ChartTooltipState | null>(null);
  const cumulativeValues = new Array(labelCount).fill(0);
  const areaLayers = series.map((item) => {
    const lowerValues = [...cumulativeValues];
    const upperValues = cumulativeValues.map((value, index) => value + (item.values[index] ?? 0));

    for (let index = 0; index < labelCount; index += 1) {
      cumulativeValues[index] = upperValues[index];
    }

    const upperPoints = upperValues.map((value, index) => ({
      x: margin.left + (labelCount > 1 ? index * stepX : innerWidth / 2),
      y: baselineY - (value / scaleMax) * innerHeight,
    }));
    const lowerPoints = lowerValues.map((value, index) => ({
      x: margin.left + (labelCount > 1 ? index * stepX : innerWidth / 2),
      y: baselineY - (value / scaleMax) * innerHeight,
    }));

    return {
      label: item.label,
      tone: item.tone,
      color: resolveToneColor(item.tone),
      total: item.values.reduce((sum, value) => sum + value, 0),
      areaPath: buildStackedAreaPath(upperPoints, lowerPoints),
      linePath: buildSmoothLinePath(upperPoints),
      points: upperPoints,
      values: item.values,
    };
  });

  return (
    <div className="space-y-4">
      <div
        className="relative"
        onMouseLeave={() => setTooltip(null)}
      >
        <ChartTooltip tooltip={tooltip} />
        <div
        className={cn(
          "rounded-[28px] border border-border bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--color-role-accent)_14%,white),white_62%)] p-3",
          heightClassName,
        )}
      >
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-full w-full overflow-visible">
          {ticks.map((tick) => {
            const y = baselineY - (tick / scaleMax) * innerHeight;
            return (
              <g key={tick}>
                <line
                  x1={margin.left}
                  x2={chartWidth - margin.right}
                  y1={y}
                  y2={y}
                  stroke="color-mix(in srgb, var(--color-role-accent) 10%, var(--color-outline))"
                  strokeDasharray={tick === 0 ? undefined : "4 6"}
                />
                <text
                  x={margin.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-muted-foreground text-[11px] font-semibold"
                >
                  {formatTickValue(tick)}
                </text>
              </g>
            );
          })}

          {areaLayers.map((layer, index) => (
            <g key={layer.label}>
              <path
                d={layer.areaPath}
                fill={layer.color}
                opacity={0.16 + index * 0.08}
              />
              <path
                d={layer.linePath}
                fill="none"
                stroke={layer.color}
                strokeOpacity={0.9}
                strokeWidth="2.25"
                strokeLinecap="round"
              strokeLinejoin="round"
              />
            </g>
          ))}

          {areaLayers.map((layer) =>
            layer.points.map((point, index) => (
              <circle
                key={`${layer.label}-${labels[index]}`}
                cx={point.x}
                cy={point.y}
                r="14"
                fill="transparent"
                onMouseEnter={() =>
                  setTooltip({
                    title: labels[index],
                    value: `${layer.values[index] ?? 0}`,
                    meta: layer.label,
                    leftPercent: (point.x / chartWidth) * 100,
                    topPercent: (point.y / chartHeight) * 100,
                    accentColor: layer.color,
                  })
                }
              >
                <title>
                  {layer.label} · {labels[index]}: {layer.values[index] ?? 0}
                </title>
              </circle>
            )),
          )}

          {labels.map((label, index) => (
            <text
              key={label}
              x={margin.left + (labelCount > 1 ? index * stepX : innerWidth / 2)}
              y={chartHeight - 6}
              textAnchor="middle"
              className="fill-muted-foreground text-[11px] font-semibold"
            >
              {label}
            </text>
          ))}
        </svg>
      </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
        {areaLayers.map((layer) => (
          <div key={layer.label} className="min-w-0 rounded-[20px] bg-surface-container-low px-4 py-3">
            <div className="flex items-center gap-2">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: layer.color }}
              />
              <p className="break-words text-sm font-semibold leading-5 text-foreground">{layer.label}</p>
            </div>
            <p className="mt-2 text-lg font-bold tracking-tight text-foreground">{layer.total}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AppAnalyticsDonutChart({
  items,
  summaryLabel = "Total",
}: {
  items: AnalyticsItem[];
  summaryLabel?: string;
}) {
  const size = 196;
  const radius = 58;
  const strokeWidth = 20;
  const circumference = 2 * Math.PI * radius;
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const dominantItem = items.reduce<AnalyticsItem | null>((current, item) => {
    if (!current || item.value > current.value) {
      return item;
    }

    return current;
  }, null);
  const segments = items
    .filter((item) => item.value > 0 && total > 0)
    .reduce<
      Array<{
        label: string;
        color: string;
        segmentLength: number;
        dashOffset: number;
      }>
    >((accumulator, item) => {
      const previousLength = accumulator.reduce((sum, segment) => sum + segment.segmentLength, 0);
      const segmentLength = (item.value / total) * circumference;

      accumulator.push({
        label: item.label,
        color: resolveToneColor(item.tone),
        segmentLength,
        dashOffset: -previousLength,
      });

      return accumulator;
    }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-[28px] border border-border bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--color-role-accent)_10%,white),white_68%)] p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-[196px_minmax(0,1fr)] sm:items-center">
          <div className="mx-auto w-fit">
            <svg viewBox={`0 0 ${size} ${size}`} className="size-[180px] -rotate-90">
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="color-mix(in srgb, var(--color-role-accent) 8%, var(--color-outline))"
                strokeWidth={strokeWidth}
              />
              {segments.map((segment) => (
                <circle
                  key={segment.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${segment.segmentLength} ${circumference - segment.segmentLength}`}
                  strokeDashoffset={segment.dashOffset}
                  strokeLinecap="butt"
                >
                  <title>{segment.label}</title>
                </circle>
              ))}
              <g transform={`rotate(90 ${size / 2} ${size / 2})`}>
                <text
                  x={size / 2}
                  y={size / 2 - 6}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[11px] font-semibold uppercase tracking-[0.12em]"
                >
                  {summaryLabel}
                </text>
                <text
                  x={size / 2}
                  y={size / 2 + 24}
                  textAnchor="middle"
                  className="fill-foreground text-[28px] font-bold tracking-tight"
                >
                  {total}
                </text>
              </g>
            </svg>
          </div>

          <div className="space-y-3">
            <div className="rounded-[20px] bg-surface-container-low px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Status dominan
              </p>
              <p className="mt-1 text-base font-semibold text-foreground">
                {dominantItem?.label || "Belum ada status dominan"}
              </p>
            </div>
            <div className="rounded-[20px] border border-border bg-surface-container-lowest px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Porsi terbesar</span>
                <span className="rounded-full bg-surface-container-low px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                  {dominantItem && total > 0 ? Math.round((dominantItem.value / total) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex min-h-[138px] min-w-0 flex-col rounded-[20px] border border-border bg-surface-container-lowest px-4 py-4"
          >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="flex min-h-[46px] min-w-0 items-start gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: resolveToneColor(item.tone) }}
                />
                <span className="break-words text-sm font-medium leading-5 text-foreground">{item.label}</span>
              </div>
              <span className="shrink-0 rounded-full bg-surface-container-low px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                {total > 0 ? Math.round((item.value / total) * 100) : 0}%
              </span>
            </div>
            <p className="mt-auto pt-4 text-2xl font-bold tracking-tight text-foreground">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AppAnalyticsConcentricChart({
  items,
  summaryLabel = "Komposisi",
}: {
  items: AnalyticsItem[];
  summaryLabel?: string;
}) {
  const size = 220;
  const center = size / 2;
  const baseRadius = 76;
  const ringGap = 22;
  const strokeWidth = 14;
  const total = Math.max(items.reduce((sum, item) => sum + item.value, 0), 1);

  return (
    <div className="space-y-4">
      <div className="rounded-[28px] border border-border bg-[radial-gradient(circle_at_center,color-mix(in_srgb,var(--color-role-accent)_12%,white),white_68%)] p-4 sm:p-5">
        <div className="mx-auto w-fit">
          <svg viewBox={`0 0 ${size} ${size}`} className="size-[220px] -rotate-90">
            {items.map((item, index) => {
              const radius = baseRadius - index * ringGap;
              const circumference = 2 * Math.PI * radius;
              const segmentLength = (item.value / total) * circumference;

              return (
                <g key={item.label}>
                  <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke="color-mix(in srgb, var(--color-role-accent) 8%, var(--color-outline))"
                    strokeWidth={strokeWidth}
                  />
                  <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={resolveToneColor(item.tone)}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                    strokeLinecap="round"
                  >
                    <title>
                      {item.label}: {item.value}
                    </title>
                  </circle>
                </g>
              );
            })}
            <g transform={`rotate(90 ${center} ${center})`}>
              <text
                x={center}
                y={center - 8}
                textAnchor="middle"
                className="fill-muted-foreground text-[11px] font-semibold uppercase tracking-[0.12em]"
              >
                {summaryLabel}
              </text>
              <text
                x={center}
                y={center + 24}
                textAnchor="middle"
                className="fill-foreground text-[30px] font-bold tracking-tight"
              >
                {items.reduce((sum, item) => sum + item.value, 0)}
              </text>
            </g>
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex min-h-[148px] min-w-0 flex-col rounded-[22px] border border-border bg-surface-container-lowest px-4 py-4"
          >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex min-h-[24px] min-w-0 items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: resolveToneColor(item.tone) }}
                  />
                  <p className="break-words text-sm font-semibold leading-5 text-foreground">{item.label}</p>
                </div>
                {item.meta ? (
                  <p className="min-h-[32px] break-words text-sm leading-5 text-muted-foreground">{item.meta}</p>
                ) : null}
              </div>
              <span className="shrink-0 rounded-full bg-surface-container-low px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                {Math.round((item.value / total) * 100)}%
              </span>
            </div>
            <p className="mt-auto pt-4 text-2xl font-bold tracking-tight text-foreground">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AppAnalyticsColumnChart({
  items,
  maxHeightClassName = "h-48",
}: {
  items: AnalyticsItem[];
  maxHeightClassName?: string;
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="space-y-3">
      <div className={cn("flex items-end gap-2", maxHeightClassName)}>
        {items.map((item) => {
          const height = `${Math.max((item.value / maxValue) * 100, item.value > 0 ? 8 : 0)}%`;
          return (
            <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">{item.value}</span>
              <div className="flex h-full w-full items-end rounded-[18px] bg-surface-container-low px-1.5 pb-1.5">
                <div
                  className={cn("w-full rounded-[14px]", resolveToneClass(item.tone))}
                  style={{ height }}
                />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AppAnalyticsWeekStrip({
  items,
}: {
  items: AnalyticsItem[];
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="grid grid-cols-7 gap-2">
      {items.map((item) => {
        const intensity = item.value / maxValue;
        return (
          <div
            key={item.label}
            className="rounded-[20px] border border-border bg-surface-container-low px-3 py-4 text-center"
            style={{
              backgroundColor:
                item.value > 0
                  ? `color-mix(in srgb, var(--color-role-accent) ${Math.max(
                      12,
                      Math.round(intensity * 70),
                    )}%, white)`
                  : undefined,
            }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-2 text-xl font-bold tracking-tight text-foreground">{item.value}</p>
          </div>
        );
      })}
    </div>
  );
}
