"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { MetricPoint, MetricSeries } from "@rootline/types";

import { formatTime } from "@/lib/format";

interface ChartTooltipProps {
  active?: boolean;
  payload?: { value: number | string }[];
  label?: string;
  unit?: string;
}

function ChartTooltip({ active, payload, label, unit }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border-border bg-card shadow-sm rounded-md border px-3 py-2 font-mono text-xs">
      <p className="text-muted-foreground mb-1">{formatTime(label)}</p>
      <p className="text-foreground">
        {Number(payload[0]?.value).toFixed(2)}
        <span className="text-muted-foreground ml-1">{unit}</span>
      </p>
    </div>
  );
}

export interface MetricChartProps {
  series: MetricSeries;
  height?: number;
  fill?: string;
  stroke?: string;
  domain?: [number | "auto", number | "auto"];
  showGrid?: boolean;
}

export function MetricChart({
  series,
  height = 180,
  fill = "#3d7eff",
  stroke,
  showGrid = false,
}: MetricChartProps) {
  const strokeColor = stroke ?? fill;

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={series.points as MetricPoint[]}
          margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id={`grad-${series.serviceId}-${series.metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fill} stopOpacity={0.28} />
              <stop offset="100%" stopColor={fill} stopOpacity={0} />
            </linearGradient>
          </defs>
          {showGrid ? (
            <CartesianGrid stroke="#242428" strokeDasharray="3 3" vertical={false} />
          ) : null}
          <XAxis
            dataKey="timestamp"
            tickFormatter={(v: string) => formatTime(v)}
            tick={{ fill: "#8b8b93", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
            tickLine={false}
            axisLine={{ stroke: "#242428" }}
            minTickGap={40}
          />
          <YAxis
            tick={{ fill: "#8b8b93", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
            tickLine={false}
            axisLine={false}
            width={44}
            domain={["auto", "auto"]}
            tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
          />
          <Tooltip
            content={<ChartTooltip unit={series.unit} />}
            cursor={{ stroke: "#242428", strokeDasharray: "4 4" }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={strokeColor}
            strokeWidth={1.5}
            fill={`url(#grad-${series.serviceId}-${series.metric})`}
            isAnimationActive
            animationDuration={500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}