"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { formatBytes, chartPalette, formatBits } from "@/lib/Utilities";
import React, { useEffect, useState, useCallback } from "react";
import { getSignalRConnection, startConnection } from "@/lib/SignalR";
import { AnimatedPage, AnimatedCard } from "@/components/animations";
import { DateRangeFilter } from "@/components/DateRangeFilter";

type PieTooltipItem = {
  payload?: { x?: string; y?: number } | undefined;
  name?: string | undefined;
  value?: number | undefined;
};
interface ServiceData {
  service: string;
  totalBytes: number;
}

type Filters = {
  selectedRange?: string;
  customDays?: number;
  excludeIPs?: string[];
};

const FILTER_KEY = "globalFilters";

function getStoredFilters() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(FILTER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setStoredFilters(filters: Filters) {
  localStorage.setItem(FILTER_KEY, JSON.stringify(filters));
}

function smoothData(rawData: { x: Date; y: number }[], alpha = 0.2): { x: Date; y: number }[] {
  if (rawData.length < 2) return rawData;

  const smoothed: { x: Date; y: number }[] = [];
  let prevY = rawData[0].y;

  for (let i = 0; i < rawData.length; i++) {
    const current = rawData[i];
    const smoothedY = alpha * current.y + (1 - alpha) * prevY;
    smoothed.push({ x: current.x, y: smoothedY });
    prevY = smoothedY;
  }

  return smoothed;
}

function clampSpike(data: { x: Date; y: number }[], factor = 4) {
  return data.map((point, i, arr) => {
    if (i === 0) return point;
    const prev = arr[i - 1].y;
    const maxAllowed = Math.max(prev * factor, prev + 10_000_000);
    return {
      ...point,
      y: Math.min(point.y, maxAllowed),
    };
  });
}

function deduplicateTimestamps(data: { x: Date; y: number }[]): { x: Date; y: number }[] {
  const seen = new Set();
  return data.filter(({ x }) => {
    const key = x.getTime();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function preprocessGraph(raw: { x: Date; y: number }[]): { x: Date; y: number }[] {
  const sorted = [...raw].sort((a, b) => a.x.getTime() - b.x.getTime());
  const deduped = deduplicateTimestamps(sorted);
  const smoothed = smoothData(deduped, 0.1);
  const clamped = clampSpike(smoothed);
  return clamped;
}

export default function Home() {
  const [hitMissData, setHitMissData] = useState([
    { x: "Hit Bytes", y: 0 },
    { x: "Miss Bytes", y: 0 },
  ]);

  const [serviceSplitData, setServiceSplitData] = useState<{ x: string; y: number }[]>([]);
  const [missBytesByService, setMissBytesByService] = useState<{ x: string; y: number }[]>([]);
  const [hitBytesByService, setHitBytesByService] = useState<{ x: string; y: number }[]>([]);
  const [selectedRange, setSelectedRange] = useState(
    () => getStoredFilters()?.selectedRange || "0",
  );
  const [customDays, setCustomDays] = useState(() => getStoredFilters()?.customDays || "");
  const [excludeIPs, setExcludeIPs] = useState(() => getStoredFilters()?.excludeIPs ?? true);

  const [uploadSeries, setUploadSeries] = useState<{ x: Date; y: number }[]>([]);

  const xTickInterval =
    uploadSeries && uploadSeries.length > 7 ? Math.ceil(uploadSeries.length / 7) : 0;

  useEffect(() => {
    setStoredFilters({ selectedRange, customDays, excludeIPs });
  }, [selectedRange, customDays, excludeIPs]);

  const daysToUse =
    selectedRange === "custom"
      ? customDays && Number(customDays) > 0
        ? Number(customDays)
        : 30
      : Number(selectedRange);

  // Debounce hook to avoid too many fetches when typing custom days
  function useDebounce<T>(value: T, delay: number) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
      const handler = setTimeout(() => setDebouncedValue(value), delay);
      return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
  }
  const debouncedDays = useDebounce(daysToUse, 400);

  const fetchAll = useCallback(async () => {
    try {
      const base = `/api/proxy/Data`;
      const qs = `?days=${debouncedDays}&excludeIPs=${excludeIPs}`;

      const [hitMissRes, serviceRes, missRes, hitRes] = await Promise.all([
        fetch(`${base}/GetHitMiss${qs}`),
        fetch(`${base}/GetBytesByService${qs}`),
        fetch(`${base}/GetMissBytesByService${qs}`),
        fetch(`${base}/GetHitBytesByService${qs}`),
      ]);

      const hitMiss = await hitMissRes.json();
      setHitMissData([
        { x: "Hit Bytes", y: hitMiss.totalHitBytes },
        { x: "Miss Bytes", y: hitMiss.totalMissBytes },
      ]);

      const service = await serviceRes.json();
      setServiceSplitData(service.map((s: ServiceData) => ({ x: s.service, y: s.totalBytes })));

      const miss = await missRes.json();
      setMissBytesByService(miss.map((s: ServiceData) => ({ x: s.service, y: s.totalBytes })));

      const hit = await hitRes.json();
      setHitBytesByService(hit.map((s: ServiceData) => ({ x: s.service, y: s.totalBytes })));
    } catch (err) {
      console.error("Failed to fetch data:", err);
    }
  }, [debouncedDays, excludeIPs]);

  useEffect(() => {
    fetchAll();
  }, [debouncedDays, excludeIPs, fetchAll]);

  useEffect(() => {
    const connection = getSignalRConnection();

    const handler = () => {
      fetchAll();
    };

    connection.on("UpdateDownloadEvents", handler);
    startConnection();

    return () => {
      connection.off("UpdateDownloadEvents", handler);
    };
  }, [fetchAll]);

  const COLORS = ["#4CAF50", "#ff3131ff"];

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: PieTooltipItem[] }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const value = data.payload?.y ?? data.value ?? 0;
      return (
        <div className="bg-card p-2 rounded border border-border">
          <p className="text-foreground font-['Poppins'] text-sm">
            {`${data.payload?.x || data.name || "Unknown"}: ${formatBytes(value)}`}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderLabel = (entry: { name?: string; x?: string; value?: number; y?: number }) => {
    return `${entry.name || entry.x}: ${formatBytes(entry.value ?? entry.y ?? 0)}`;
  };

  useEffect(() => {
    let isMounted = true;

    const fetchGraphData = async () => {
      try {
        const res = await fetch(`/api/proxy/Network/GetNetworkStats?minutes=30`);
        const raw = await res.json();
        if (!isMounted) return;

        const rawPoints = raw.map((d: { timestamp: string; bytesSentPerSec: number }) => ({
          x: new Date(d.timestamp),
          y: d.bytesSentPerSec,
        }));

        setUploadSeries(preprocessGraph(rawPoints));
      } catch (err) {
        console.error("Initial graph fetch failed:", err);
      }
    };

    fetchGraphData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const interval = setInterval(async () => {
      if (cancelled) return;

      try {
        const res = await fetch(`/api/proxy/Network/GetLatestNetworkStat`);
        const data = await res.json();

        if (data?.timestamp && data?.bytesSentPerSec !== undefined) {
          const newRawPoint = {
            x: new Date(data.timestamp),
            y: data.bytesSentPerSec,
          };

          setUploadSeries((prevSeries) => {
            const thirtyMinAgo = new Date(newRawPoint.x.getTime() - 30 * 60 * 1000);
            const filtered = prevSeries.filter((p) => p.x > thirtyMinAgo);

            // Apply smoothing to the new point only
            let smoothedY = newRawPoint.y;
            if (filtered.length > 0) {
              const lastY = filtered[filtered.length - 1].y;
              smoothedY = 0.1 * newRawPoint.y + (1 - 0.1) * lastY;

              // Clamp spike
              const maxAllowed = Math.max(lastY * 4, lastY + 10_000_000);
              smoothedY = Math.min(smoothedY, maxAllowed);
            }

            return [...filtered, { x: newRawPoint.x, y: smoothedY }];
          });
        }
      } catch (err) {
        console.error("Polling failed:", err);
      }
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <AnimatedPage>
      <div className="grid grid-cols-2 gap-6 p-6 max-w-[98%] mx-auto">
        {/* Charts */}
        <AnimatedCard delay={0.1}>
          <Card className="w-full bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-center text-foreground">
                Cache Hit vs Miss (Bytes)
              </CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              {hitMissData[0].y > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={hitMissData}
                      dataKey="y"
                      nameKey="x"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      label={renderLabel}
                    >
                      {hitMissData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    {/* <Legend
                      wrapperStyle={{
                        fontFamily: "Poppins, sans-serif",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "var(--foreground)",
                      }}
                    /> */}
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </AnimatedCard>

        <AnimatedCard delay={0.2}>
          <Card className="w-full bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-center text-foreground">
                Download Requests by Service
              </CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              {serviceSplitData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={serviceSplitData}
                      dataKey="y"
                      nameKey="x"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      label={renderLabel}
                    >
                      {serviceSplitData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={chartPalette[index % chartPalette.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    {/* <Legend
                      wrapperStyle={{
                        fontFamily: "Poppins, sans-serif",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "var(--foreground)",
                      }}
                    /> */}
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </AnimatedCard>

        <AnimatedCard delay={0.3}>
          <Card className="w-full bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-center text-foreground">
                Miss Bytes by Service
              </CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              {missBytesByService.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={missBytesByService}
                      dataKey="y"
                      nameKey="x"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      label={renderLabel}
                    >
                      {missBytesByService.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={chartPalette[index % chartPalette.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    {/* <Legend
                      wrapperStyle={{
                        fontFamily: "Poppins, sans-serif",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "var(--foreground)",
                      }}
                    /> */}
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </AnimatedCard>

        <AnimatedCard delay={0.4}>
          <Card className="w-full bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-center text-foreground">
                Hit Bytes by Service
              </CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              {hitBytesByService.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={hitBytesByService}
                      dataKey="y"
                      nameKey="x"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      label={renderLabel}
                    >
                      {hitBytesByService.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={chartPalette[index % chartPalette.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    {/* <Legend
                      wrapperStyle={{
                        fontFamily: "Poppins, sans-serif",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "var(--foreground)",
                      }}
                    /> */}
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </AnimatedCard>
      </div>
      <DateRangeFilter
        selectedRange={selectedRange}
        customDays={customDays}
        excludeIPs={excludeIPs}
        onRangeChange={setSelectedRange}
        onCustomDaysChange={setCustomDays}
        onExcludeIPsChange={setExcludeIPs}
        delay={0.5}
      />
      <AnimatedCard delay={0.6}>
        <div className="w-full mt-6 px-6 max-w-[98%] mx-auto" style={{ marginBottom: "2rem" }}>
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">
                Cache Usage Speed
              </CardTitle>
            </CardHeader>
            <CardContent>
              {uploadSeries.length > 0 && (
                <div className="w-full h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={uploadSeries}
                      style={{ fontFamily: "Poppins, sans-serif" }}
                      margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis
                        dataKey="x"
                        tickFormatter={(value) =>
                          new Date(value).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        }
                        stroke="var(--foreground)"
                        style={{ fontFamily: "Poppins", fontSize: "12px" }}
                        tick={{ fontSize: 12 }}
                        interval={xTickInterval}
                      />
                      <YAxis
                        tickFormatter={(value) => formatBits(value) + "/s"}
                        stroke="var(--foreground)"
                        style={{ fontFamily: "Poppins", fontSize: "12px" }}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0];
                            return (
                              <div className="bg-card p-2 rounded border border-border">
                                <p className="text-foreground font-['Poppins'] text-sm">
                                  {new Date(data.payload.x).toLocaleTimeString([], {
                                    hour12: false,
                                  })}{" "}
                                  : {formatBits(data.value as number)}/s
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="y"
                        stroke="var(--color-green-500)"
                        strokeWidth={2}
                        dot={false}
                        name="Usage Speed"
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </AnimatedCard>
    </AnimatedPage>
  );
}
