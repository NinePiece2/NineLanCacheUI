"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import NextImage from "next/image";
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
import { formatBytes } from "../../../lib/Utilities";
import { getSignalRConnection, startConnection } from "../../../lib/SignalR";
import { imageCache } from "../../../lib/ImageCache";
import { AnimatedPage, AnimatedCard } from "@/components/animations";
import { DateRangeFilter } from "@/components/DateRangeFilter";

interface SteamDepot {
  id: number;
  steamAppId: number;
  steamApp: {
    name: string;
  };
}

interface DownloadEvent {
  id: number;
  cacheIdentifier: string;
  downloadIdentifier?: number;
  downloadIdentifierString?: string;
  clientIp: string;
  createdAt: string;
  lastUpdatedAt: string;
  cacheHitBytes: number;
  cacheMissBytes: number;
  totalBytes?: number;
  steamDepot?: SteamDepot | null;
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

const PreloadableImage = ({ appId }: { appId: number }) => {
  const imageUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
  const fallbackUrl = "https://steamdb.info/static/img/applogo.svg";

  const [currentSrc, setCurrentSrc] = useState(imageUrl);
  const hasErrored = useRef(false);

  const handleError = () => {
    console.log("Image error for appId:", appId, "hasErrored:", hasErrored.current);
    if (!hasErrored.current) {
      hasErrored.current = true;
      setCurrentSrc(fallbackUrl);
      console.log("Switched to fallback for appId:", appId);
      imageCache.setStatus(imageUrl, "missing");
    }
  };

  const handleLoad = () => {
    if (currentSrc === imageUrl) {
      imageCache.setStatus(imageUrl, "exists");
    }
  };

  return (
    <div className="flex items-center justify-center">
      <a href={`https://steamdb.info/app/${appId}/`} target="_blank" rel="noopener noreferrer">
        {currentSrc === fallbackUrl ? (
          <object
            data={fallbackUrl}
            type="image/svg+xml"
            width={184}
            height={69}
            className="object-cover rounded shadow bg-muted"
          >
            <div
              className="flex items-center justify-center"
              style={{ width: "184px", height: "69px" }}
            >
              Steam App
            </div>
          </object>
        ) : (
          <NextImage
            src={imageUrl}
            alt={`App ${appId}`}
            width={184}
            height={69}
            className="object-cover rounded shadow bg-muted"
            loading="lazy"
            onError={handleError}
            onLoad={handleLoad}
            quality={75}
            priority={false}
          />
        )}
      </a>
    </div>
  );
};

export default function RecentDownloads() {
  const [data, setData] = useState<DownloadEvent[]>([]);
  const [selectedRange, setSelectedRange] = useState(
    () => getStoredFilters()?.selectedRange || "0",
  );
  const [customDays, setCustomDays] = useState(() => getStoredFilters()?.customDays || "");
  const [excludeIPs, setExcludeIPs] = useState(() => getStoredFilters()?.excludeIPs ?? true);
  const [filterText, setFilterText] = useState("");
  const [sortField, setSortField] = useState<keyof DownloadEvent | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    setStoredFilters({ selectedRange, customDays, excludeIPs });
  }, [selectedRange, customDays, excludeIPs]);

  const days = selectedRange === "custom" ? parseInt(customDays) || 0 : parseInt(selectedRange);

  const filteredData = data.filter((item) => {
    if (!filterText) return true;
    const searchLower = filterText.toLowerCase();
    return (
      item.cacheIdentifier.toLowerCase().includes(searchLower) ||
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

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (days > 0) params.append("days", days.toString());
      params.append("excludeIPs", excludeIPs.toString());
      params.append("limit", "100");

      const res = await fetch(`/api/proxy/RecentDownloads/GetRecentDownloads?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch data");

      const newData: DownloadEvent[] = await res.json();

      setData((prevData) => {
        const dataMap = new Map<number, DownloadEvent>();
        prevData.forEach((item) => dataMap.set(item.id, item));
        newData.forEach((item) => dataMap.set(item.id, item));

        return Array.from(dataMap.values())
          .sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime())
          .slice(0, 100);
      });
    } catch (error) {
      console.error(error);
    }
  }, [days, excludeIPs]);

  const fetchAndMergeNewData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (days > 0) params.append("days", days.toString());
      params.append("excludeIPs", excludeIPs.toString());
      params.append("limit", "20");

      const res = await fetch(`/api/proxy/RecentDownloads/GetRecentDownloads?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch new data");

      const newData: DownloadEvent[] = await res.json();

      setData((prevData) => {
        const dataMap = new Map<number, DownloadEvent>();
        prevData.forEach((item) => dataMap.set(item.id, item));
        newData.forEach((item) => dataMap.set(item.id, item));

        return Array.from(dataMap.values())
          .sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime())
          .slice(0, 100);
      });
    } catch (error) {
      console.error("Failed to fetch and merge new data", error);
    }
  }, [days, excludeIPs]);

  useEffect(() => {
    setData([]);
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const connection = getSignalRConnection();
    connection.on("UpdateDownloadEvents", fetchAndMergeNewData);

    startConnection();

    return () => {
      connection.off("UpdateDownloadEvents", fetchAndMergeNewData);
    };
  }, [fetchAndMergeNewData]);

  return (
    <AnimatedPage>
      <div
        className="p-4 mx-auto rounded-3xl bg-background"
        style={{ width: "98%", maxWidth: "1600px" }}
      >
        <h1 className="text-3xl font-bold mb-4 text-center text-foreground">Recent Downloads</h1>

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
                <CardTitle className="text-foreground">Recent Downloads</CardTitle>
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
                        className="text-foreground cursor-pointer hover:text-muted-foreground"
                        onClick={() => handleSort("cacheIdentifier")}
                      >
                        Service{" "}
                        {sortField === "cacheIdentifier" && (sortDirection === "asc" ? "↑" : "↓")}
                      </TableHead>
                      <TableHead
                        className="text-foreground cursor-pointer hover:text-muted-foreground"
                        onClick={() => handleSort("createdAt")}
                      >
                        Timestamp{" "}
                        {sortField === "createdAt" && (sortDirection === "asc" ? "↑" : "↓")}
                      </TableHead>
                      <TableHead className="text-foreground">App</TableHead>
                      <TableHead className="text-foreground">Depot</TableHead>
                      <TableHead
                        className="text-foreground cursor-pointer hover:text-muted-foreground"
                        onClick={() => handleSort("clientIp")}
                      >
                        Client IP{" "}
                        {sortField === "clientIp" && (sortDirection === "asc" ? "↑" : "↓")}
                      </TableHead>
                      <TableHead className="text-foreground">Hit %</TableHead>
                      <TableHead className="text-foreground">Miss %</TableHead>
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

                      return (
                        <TableRow key={row.id} className="border-border hover:bg-secondary">
                          <TableCell className="text-foreground">{row.cacheIdentifier}</TableCell>
                          <TableCell className="text-foreground text-sm whitespace-nowrap">
                            <div>
                              {formatDateTime(created)} → {formatDateTime(updated)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {row.cacheIdentifier === "steam" && appId ? (
                              <PreloadableImage key={appId} appId={appId} />
                            ) : (
                              <div className="w-[184px] h-[69px] flex items-center justify-center">
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
                            <div className="w-full min-w-[120px]">
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
                            <div className="w-full min-w-[120px]">
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
