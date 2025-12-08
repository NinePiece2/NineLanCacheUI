"use client";

import React, { useEffect, useState, useCallback } from "react";
import NextImage from "next/image";
import {
  GridComponent,
  ColumnsDirective,
  ColumnDirective,
  Inject,
  Filter,
  Sort,
  Toolbar,
  VirtualScroll 
} from "@syncfusion/ej2-react-grids";

import { formatBytes } from "../../../lib/Utilities";
import { getSignalRConnection, startConnection } from "../../../lib/SignalR";
import { useRef } from "react";
import { imageCache } from "../../../lib/ImageCache";

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
    console.log('Image error for appId:', appId, 'hasErrored:', hasErrored.current);
    if (!hasErrored.current) {
      hasErrored.current = true;
      setCurrentSrc(fallbackUrl);
      console.log('Switched to fallback for appId:', appId);
      imageCache.setStatus(imageUrl, 'missing');
    }
  };

  const handleLoad = () => {
    if (currentSrc === imageUrl) {
      imageCache.setStatus(imageUrl, 'exists');
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
            className="object-cover rounded shadow bg-gray-900"
          >
            <div className="flex items-center justify-center" style={{width: '184px', height: '69px'}}>Steam App</div>
          </object>
        ) : (
          <NextImage
            src={imageUrl}
            alt={`App ${appId}`}
            width={184}
            height={69}
            className="object-cover rounded shadow bg-gray-900"
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
  const gridRef = useRef<GridComponent | null>(null);
  const [selectedRange, setSelectedRange] = useState(() => getStoredFilters()?.selectedRange || "0");
  const [customDays, setCustomDays] = useState(() => getStoredFilters()?.customDays || "");
  const [excludeIPs, setExcludeIPs] = useState(() => getStoredFilters()?.excludeIPs ?? true);

  useEffect(() => {
    setStoredFilters({ selectedRange, customDays, excludeIPs });
  }, [selectedRange, customDays, excludeIPs]);

  const days =
    selectedRange === "custom" ? parseInt(customDays) || 0 : parseInt(selectedRange);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (days > 0) params.append("days", days.toString());
      params.append("excludeIPs", excludeIPs.toString());
      params.append("limit", "100");

      const res = await fetch(`/api/proxy/RecentDownloads/GetRecentDownloads?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch data");

      const newData: DownloadEvent[] = await res.json();

      if (gridRef.current) {
        const dataMap = new Map<number, DownloadEvent>();
        
        const currentData = gridRef.current.dataSource as DownloadEvent[] || [];
        currentData.forEach(item => dataMap.set(item.id, item));
        
        newData.forEach(item => dataMap.set(item.id, item));
        
        gridRef.current.dataSource = Array.from(dataMap.values())
          .sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime())
          .slice(0, 100);
      }

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

      if (gridRef.current) {
        const dataMap = new Map<number, DownloadEvent>();
        
        const currentData = gridRef.current.dataSource as DownloadEvent[] || [];
        currentData.forEach(item => dataMap.set(item.id, item));
        
        newData.forEach(item => dataMap.set(item.id, item));
        
        gridRef.current.dataSource = Array.from(dataMap.values())
          .sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime())
          .slice(0, 100);
      }

    } catch (error) {
      console.error("Failed to fetch and merge new data", error);
    }
  }, [days, excludeIPs]);

  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.dataSource = [];
    }
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
    <div className="p-6 mx-auto rounded-3xl" style={{ backgroundColor: "#1a1a1a", color: "#eee", width: "95%" }}>
      <h1 className="text-4xl font-bold mb-6 text-center">Recent Downloads</h1>

      {/* Filter Panel */}
      <div
        className="flex flex-wrap items-center gap-4 p-4 rounded-md shadow-md mb-6"
        style={{ backgroundColor: "#2a2a2a" }}
      >
        <label htmlFor="range" className="text-white font-semibold whitespace-nowrap">
          Date Range:
        </label>

        <select
          id="range"
          className="text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          style={{ color: "#ffffff", backgroundColor: "#1a1a1a" }}
          value={selectedRange}
          onChange={(e) => setSelectedRange(e.target.value)}
        >
          <option value="0">All time</option>
          <option value="30">Last 30 days</option>
          <option value="7">Last 7 days</option>
          <option value="1">Last 1 day</option>
          <option value="custom">Custom</option>
        </select>

        {selectedRange === "custom" && (
          <input
            type="number"
            min={1}
            max={365}
            placeholder="Days"
            className="text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            style={{ margin: "0", width: "5rem", color: "#ffffff", backgroundColor: "#1a1a1a" }}
            value={customDays}
            onChange={(e) => {
              const val = e.target.value;
              if (/^\d{0,3}$/.test(val)) {
                setCustomDays(val);
              }
            }}
          />
        )}

        <button
          className={`ml-auto px-5 py-2 rounded-md font-semibold transition-colors duration-300 ${
            excludeIPs ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
          } text-white shadow-md whitespace-nowrap`}
          onClick={() => setExcludeIPs(!excludeIPs)}
          type="button"
        >
          {excludeIPs ? "Exclude IPs" : "Include All IPs"}
        </button>
      </div>

      <div>
        {/* Grid */}
        <GridComponent
            ref={gridRef}
            allowPaging={false}
            allowSorting={true}
            allowFiltering={true}
            filterSettings={{ type: "Menu" }}
            height={"60vh"}
            rowSelected={() => {}}
            style={{ minHeight: "500px" }}
        >
            <ColumnsDirective>
            <ColumnDirective field="id" headerText="ID" width={80} visible={false} />
            <ColumnDirective field="cacheIdentifier" headerText="Service" width={100} textAlign="Left" />
            <ColumnDirective
                headerText="Timestamp"
                width={180}
                template={(props: DownloadEvent) => {
                const created = new Date(props.createdAt);
                const updated = new Date(props.lastUpdatedAt);
                const formatDateTime = (date: Date) =>
                    `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;

                return (
                    <div className="text-sm text-white text-center whitespace-normal wrap-break-word">
                     <div>{formatDateTime(created)} → {formatDateTime(updated)}</div>
                    </div>
                );
                }}
            />
            <ColumnDirective
              headerText="App"
              width={140}
              template={(props: DownloadEvent) => {
                const appId = props.steamDepot?.steamAppId;
                return props.cacheIdentifier === "steam" && appId
                  ? <PreloadableImage key={appId} appId={appId} />
                  : <div className="w-[184px] h-[69px] flex items-center justify-center" style={{padding: 0, margin: 0}}><span className="text-sm text-gray-300">unknown</span></div>;
              }}
            />
            <ColumnDirective
                headerText="Depot"
                width={120}
                template={(props: DownloadEvent) => {
                if (props.cacheIdentifier === "steam") {
                    const depotLink = `https://steamdb.info/depot/${props.steamDepot?.id}/`;
                    return (
                    <a
                        href={depotLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline text-sm"
                    >
                        {props.steamDepot?.id}
                    </a>
                    );
                }
                return <span className="text-sm text-gray-300">N/A</span>;
                }}
            />
            <ColumnDirective field="clientIp" headerText="Client IP" width={130} textAlign="Left" />
            <ColumnDirective
                headerText="Hit %"
                width={150}
                template={(props: DownloadEvent) => {
                const total = props.cacheHitBytes + props.cacheMissBytes;
                const hitPercent = total > 0 ? (props.cacheHitBytes / total) * 100 : 0;

                return (
                    <div className="w-full">
                    <div className="h-4 bg-gray-700 rounded overflow-hidden">
                        <div className="h-full bg-green-500" style={{ width: `${hitPercent}%` }}></div>
                    </div>
                    <div className="text-xs mt-1 text-white text-center">
                        {formatBytes(props.cacheHitBytes)} • {hitPercent.toFixed(1)}%
                    </div>
                    </div>
                );
                }}
            />
            <ColumnDirective
                headerText="Miss %"
                width={150}
                template={(props: DownloadEvent) => {
                const total = props.cacheHitBytes + props.cacheMissBytes;
                const missPercent = total > 0 ? (props.cacheMissBytes / total) * 100 : 0;

                return (
                    <div className="w-full">
                    <div className="h-4 bg-gray-700 rounded overflow-hidden">
                        <div className="h-full bg-red-500" style={{ width: `${missPercent}%` }}></div>
                    </div>
                    <div className="text-xs mt-1 text-white text-center">
                        {formatBytes(props.cacheMissBytes)} • {missPercent.toFixed(1)}%
                    </div>
                    </div>
                );
                }}
            />
            </ColumnsDirective>
            <Inject services={[Toolbar, VirtualScroll, Filter, Sort ]} />
        </GridComponent>
      </div>
    </div>
  );
}
