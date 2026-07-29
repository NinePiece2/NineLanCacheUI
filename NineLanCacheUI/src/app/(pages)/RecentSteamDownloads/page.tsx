"use client";

import { useEffect, useState } from "react";
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
import { formatBytes } from "@/lib/Utilities";
import { getSignalRConnection, startConnection } from "../../../lib/SignalR";
import PreloadableImage from "@/components/PreloadableImage";
import { getStoredFilters, setStoredFilters } from "@/lib/filterStorage";
import { DownloadEvent } from "@/lib/recentDownloadsTypes";
import { AnimatedPage, AnimatedCard } from "@/components/animations";
import { DateRangeFilter } from "@/components/DateRangeFilter";

function mergeDownloadEvents(prevData: DownloadEvent[], newData: DownloadEvent[]) {
  const dataMap = new Map<number, DownloadEvent>();
  prevData.forEach((item) => dataMap.set(item.id, item));
  newData.forEach((item) => dataMap.set(item.id, item));

  return Array.from(dataMap.values())
    .sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime())
    .slice(0, 100);
}

async function fetchRecentSteamDownloads(days: number, excludeIPs: boolean, limit: string) {
  const params = new URLSearchParams();
  if (days > 0) params.append("days", days.toString());
  params.append("excludeIPs", excludeIPs.toString());
  params.append("limit", limit);

  const res = await fetch(
    `/api/proxy/RecentDownloads/GetRecentSteamDownloads?${params.toString()}`,
  );
  if (!res.ok) throw new Error("Failed to fetch data");

  return (await res.json()) as DownloadEvent[];
}

export default function RecentSteamDownloads() {
  const [data, setData] = useState<DownloadEvent[]>([]);
  const [selectedRange, setSelectedRange] = useState(
    () => getStoredFilters()?.selectedRange || "0",
  );
  const [customDays, setCustomDays] = useState<string | number>(
    () => getStoredFilters()?.customDays ?? "",
  );
  const [excludeIPs, setExcludeIPs] = useState(() => getStoredFilters()?.excludeIPs ?? true);
  const [filterText, setFilterText] = useState("");
  const [sortField, setSortField] = useState<keyof DownloadEvent | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    setStoredFilters({ selectedRange, customDays, excludeIPs });
  }, [selectedRange, customDays, excludeIPs]);

  const days =
    selectedRange === "custom" ? parseInt(String(customDays)) || 0 : parseInt(selectedRange);

  const filteredData = data.filter((item) => {
    if (!filterText) return true;
    const searchLower = filterText.toLowerCase();
    return (
      item.clientIp.toLowerCase().includes(searchLower) ||
      (item.steamDepot?.steamApp?.name || "").toLowerCase().includes(searchLower) ||
      (item.downloadIdentifier?.toString() || "").includes(searchLower)
    );
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (sortField) {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const modifier = sortDirection === "asc" ? 1 : -1;
      if (aVal && bVal) {
        return aVal > bVal ? modifier : aVal < bVal ? -modifier : 0;
      }
    }
    return new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime();
  });

  const handleSort = (field: keyof DownloadEvent) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const newData = await fetchRecentSteamDownloads(days, excludeIPs, "100");
        if (!cancelled) {
          setData((prevData) => mergeDownloadEvents(prevData, newData));
        }
      } catch (error) {
        console.error(error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [days, excludeIPs]);

  useEffect(() => {
    const connection = getSignalRConnection();

    const handler = () => {
      void (async () => {
        try {
          const newData = await fetchRecentSteamDownloads(days, excludeIPs, "20");
          setData((prevData) => mergeDownloadEvents(prevData, newData));
        } catch (error) {
          console.error("Failed to fetch and merge new data", error);
        }
      })();
    };

    connection.on("UpdateDownloadEvents", handler);
    startConnection();

    return () => {
      connection.off("UpdateDownloadEvents", handler);
    };
  }, [days, excludeIPs]);

  return (
    <AnimatedPage>
      <div
        className="p-4 mx-auto rounded-3xl bg-background"
        style={{ width: "98%", maxWidth: "1600px" }}
      >
        <h1 className="text-3xl font-bold mb-4 text-center text-foreground">
          Recent Steam Downloads
        </h1>

        <DateRangeFilter
          selectedRange={selectedRange}
          customDays={customDays}
          excludeIPs={excludeIPs}
          onRangeChange={setSelectedRange}
          onCustomDaysChange={setCustomDays}
          onExcludeIPsChange={setExcludeIPs}
          delay={0.1}
        />

        <AnimatedCard delay={0.2}>
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-foreground">Recent Steam Downloads</CardTitle>
                <Input
                  placeholder="Search..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="max-w-xs bg-secondary text-foreground border-border"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[55vh] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead
                        className="text-foreground cursor-pointer hover:text-muted-foreground text-center"
                        onClick={() => handleSort("createdAt")}
                      >
                        Timestamp{" "}
                        {sortField === "createdAt" && (sortDirection === "asc" ? "↑" : "↓")}
                      </TableHead>
                      <TableHead className="text-foreground text-center">App</TableHead>
                      <TableHead className="text-foreground text-center">Depot</TableHead>
                      <TableHead
                        className="text-foreground cursor-pointer hover:text-muted-foreground text-center"
                        onClick={() => handleSort("clientIp")}
                      >
                        Client IP{" "}
                        {sortField === "clientIp" && (sortDirection === "asc" ? "↑" : "↓")}
                      </TableHead>
                      <TableHead className="text-foreground text-center">Hit %</TableHead>
                      <TableHead className="text-foreground text-center">Miss %</TableHead>
                      <TableHead className="text-foreground text-center">
                        Download Progress
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedData.map((row) => {
                      const formatDateTime = (date: Date) =>
                        `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
                      const created = new Date(row.createdAt);
                      const updated = new Date(row.lastUpdatedAt);
                      const total = row.cacheHitBytes + row.cacheMissBytes;
                      const hitPercent = total > 0 ? (row.cacheHitBytes / total) * 100 : 0;
                      const missPercent = total > 0 ? (row.cacheMissBytes / total) * 100 : 0;
                      const appId = row.steamDepot?.steamAppId;
                      const totalBytes = row.totalBytes ?? 0;
                      const downloaded = (row.cacheMissBytes ?? 0) + (row.cacheHitBytes ?? 0);
                      const downloadPercent =
                        totalBytes > 0 ? Math.min((downloaded / totalBytes) * 100, 100) : 0;

                      return (
                        <TableRow key={row.id} className="border-border hover:bg-secondary">
                          <TableCell className="text-foreground text-sm whitespace-nowrap">
                            <div>
                              {formatDateTime(created)} → {formatDateTime(updated)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {row.cacheIdentifier === "steam" && appId ? (
                              <PreloadableImage key={appId} appId={appId} />
                            ) : (
                              <div className="w-46 h-17.25 flex items-center justify-center">
                                <span className="text-sm text-muted-foreground">unknown</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {row.cacheIdentifier === "steam" && row.steamDepot?.id ? (
                              <a
                                href={`https://steamdb.info/depot/${row.steamDepot.id}/`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-400 hover:underline text-sm"
                              >
                                {row.steamDepot.id}
                              </a>
                            ) : (
                              <span className="text-sm text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell className="text-foreground">{row.clientIp}</TableCell>
                          <TableCell>
                            <div className="w-full min-w-30">
                              <div className="h-4 bg-muted rounded overflow-hidden">
                                <div
                                  className="h-full bg-green-500"
                                  style={{ width: `${hitPercent}%` }}
                                ></div>
                              </div>
                              <div className="text-xs mt-1 text-foreground text-center">
                                {formatBytes(row.cacheHitBytes)} • {hitPercent.toFixed(1)}%
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="w-full min-w-30">
                              <div className="h-4 bg-muted rounded overflow-hidden">
                                <div
                                  className="h-full bg-red-500"
                                  style={{ width: `${missPercent}%` }}
                                ></div>
                              </div>
                              <div className="text-xs mt-1 text-foreground text-center">
                                {formatBytes(row.cacheMissBytes)} • {missPercent.toFixed(1)}%
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="w-full min-w-37.5">
                              {totalBytes === 0 ? (
                                <span className="text-red-400 text-sm">
                                  Could not find Steam Manifest
                                </span>
                              ) : (
                                <>
                                  <div className="h-4 bg-muted rounded overflow-hidden">
                                    <div
                                      className="h-full bg-indigo-500"
                                      style={{ width: `${downloadPercent}%` }}
                                    ></div>
                                  </div>
                                  <div className="text-xs mt-1 text-foreground text-center">
                                    {downloadPercent < 100
                                      ? `${formatBytes(downloaded)} / ${formatBytes(totalBytes)} (${downloadPercent.toFixed(1)}%)`
                                      : `${formatBytes(downloaded)} (100%)`}
                                  </div>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </AnimatedCard>
      </div>
    </AnimatedPage>
  );
}
