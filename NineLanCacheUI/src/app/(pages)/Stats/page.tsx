"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
// import { Legend } from "recharts";
import { formatBytes, chartPalette } from "@/lib/Utilities";
import React, { useEffect, useState, useCallback } from "react";
import { getSignalRConnection, startConnection } from "@/lib/SignalR";
import { AnimatedPage, AnimatedCard } from "@/components/animations";
import { DateRangeFilter } from "@/components/DateRangeFilter";

type PieTooltipItem = {
  payload?: { x?: string; y?: number } | undefined;
  name?: string | undefined;
  value?: number | undefined;
};
interface ClientData {
  ipAddress: string;
  totalBytes: number;
}

interface HitMissData {
  ipAddress: string;
  totalHits: number;
  totalMisses: number;
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

export default function Stats() {
  const [missBytesByClient, setMissBytesByClient] = useState<{ x: string; y: number }[]>([]);
  const [hitBytesByClient, setHitBytesByClient] = useState<{ x: string; y: number }[]>([]);
  const [selectedRange, setSelectedRange] = useState(
    () => getStoredFilters()?.selectedRange || "0",
  );
  const [customDays, setCustomDays] = useState(() => getStoredFilters()?.customDays || "");
  const [excludeIPs, setExcludeIPs] = useState(() => getStoredFilters()?.excludeIPs ?? true);
  const [hitMissGridData, setHitMissGridData] = useState<HitMissData[]>([]);
  const [filterText, setFilterText] = useState("");
  const [sortField, setSortField] = useState<keyof HitMissData | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

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
      const base = `/api/proxy/Stats`;
      const qs = `?days=${debouncedDays}&excludeIPs=${excludeIPs}`;

      const [hitMissRes, clientHits, clientMisses] = await Promise.all([
        fetch(`${base}/GetClientHitMissGrid${qs}`),
        fetch(`${base}/GetClientHits${qs}`),
        fetch(`${base}/GetClientMisses${qs}`),
      ]);

      const hitMissGrid = await hitMissRes.json();
      setHitMissGridData(hitMissGrid);

      const service = await clientHits.json();
      setHitBytesByClient(service.map((s: ClientData) => ({ x: s.ipAddress, y: s.totalBytes })));

      const miss = await clientMisses.json();
      setMissBytesByClient(miss.map((s: ClientData) => ({ x: s.ipAddress, y: s.totalBytes })));
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

  // const renderLabel = (entry: { name?: string; x?: string; value?: number; y?: number }) => {
  //   return `${entry.name || entry.x}: ${formatBytes(entry.value ?? entry.y ?? 0)}`;
  // };

  const filteredData = hitMissGridData.filter(
    (item) => !filterText || item.ipAddress.toLowerCase().includes(filterText.toLowerCase()),
  );

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortField) return 0;
    const aVal = a[sortField];
    const bVal = b[sortField];
    const modifier = sortDirection === "asc" ? 1 : -1;
    return aVal > bVal ? modifier : aVal < bVal ? -modifier : 0;
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedData = sortedData.slice(startIdx, startIdx + itemsPerPage);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterText]);

  const handleSort = (field: keyof HitMissData) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  return (
    <AnimatedPage>
      <AnimatedCard delay={0.1}>
        <div
          className="p-4 mx-auto rounded-3xl bg-background h-[calc(100vh-200px)] flex flex-col"
          style={{ width: "95%" }}
        >
          <div className="flex flex-col p-4 h-full gap-4">
            <div className="flex gap-4 h-full">
              {/* Left side: Table */}
              <div className="w-1/2 flex flex-col">
                <Card className="bg-card border-border flex flex-col h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-foreground">Client Hit/Miss Stats</CardTitle>
                      <Input
                        placeholder="Filter by IP..."
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        className="max-w-xs bg-secondary text-foreground border-border"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col flex-1 overflow-hidden pb-3">
                    <div className="flex-1 overflow-y-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-card z-10">
                          <TableRow className="border-border hover:bg-transparent">
                            <TableHead
                              className="text-foreground cursor-pointer hover:text-muted-foreground text-center"
                              onClick={() => handleSort("ipAddress")}
                            >
                              Client IPs{" "}
                              {sortField === "ipAddress" && (sortDirection === "asc" ? "↑" : "↓")}
                            </TableHead>
                            <TableHead
                              className="text-foreground cursor-pointer hover:text-muted-foreground text-center"
                              onClick={() => handleSort("totalHits")}
                            >
                              Hit Bytes{" "}
                              {sortField === "totalHits" && (sortDirection === "asc" ? "↑" : "↓")}
                            </TableHead>
                            <TableHead
                              className="text-foreground cursor-pointer hover:text-muted-foreground text-center"
                              onClick={() => handleSort("totalMisses")}
                            >
                              Miss Bytes{" "}
                              {sortField === "totalMisses" && (sortDirection === "asc" ? "↑" : "↓")}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedData.map((row, idx) => (
                            <TableRow key={idx} className="border-border hover:bg-secondary">
                              <TableCell className="text-foreground">{row.ipAddress}</TableCell>
                              <TableCell className="text-foreground">
                                {formatBytes(row.totalHits)}
                              </TableCell>
                              <TableCell className="text-foreground">
                                {formatBytes(row.totalMisses)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {/* Pagination Controls */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                      <span className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages} ({sortedData.length} total)
                      </span>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          variant="outline"
                          size="sm"
                        >
                          Previous
                        </Button>
                        <Button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          variant="outline"
                          size="sm"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right side: Two pie charts stacked vertically */}
              <div className="w-1/2 flex flex-col gap-4 h-full">
                <Card className="bg-card border-border flex flex-col flex-1">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-center text-foreground font-semibold text-lg">
                      Client Cache Hit
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1">
                    {hitBytesByClient.length > 0 && (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={hitBytesByClient}
                            dataKey="y"
                            nameKey="x"
                            cx="50%"
                            cy="50%"
                            outerRadius={"100%"}
                            // label={renderLabel}
                          >
                            {hitBytesByClient.map((entry, index) => (
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

                <Card className="bg-card border-border flex flex-col flex-1">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-center text-foreground font-semibold text-lg">
                      Client Cache Miss
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1">
                    {missBytesByClient.length > 0 && (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={missBytesByClient}
                            dataKey="y"
                            nameKey="x"
                            cx="50%"
                            cy="50%"
                            outerRadius={"100%"}
                            // label={renderLabel}
                          >
                            {missBytesByClient.map((entry, index) => (
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
              </div>
            </div>
          </div>
        </div>
      </AnimatedCard>
      <DateRangeFilter
        selectedRange={selectedRange}
        customDays={customDays}
        excludeIPs={excludeIPs}
        onRangeChange={setSelectedRange}
        onCustomDaysChange={setCustomDays}
        onExcludeIPsChange={setExcludeIPs}
        delay={0.2}
      />
    </AnimatedPage>
  );
}
