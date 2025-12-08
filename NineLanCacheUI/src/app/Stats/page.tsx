'use client';
import {
  AccumulationChartComponent,
  AccumulationSeriesCollectionDirective,
  AccumulationSeriesDirective,
  Inject,
  PieSeries,
  AccumulationTooltip,
  AccumulationLegend
} from '@syncfusion/ej2-react-charts';
import { formatBytes, chartPalette } from "../../../lib/Utilities";
import React, { useEffect, useState, useCallback } from 'react';
import { getSignalRConnection, startConnection } from "../../../lib/SignalR";
import {
  GridComponent,
  ColumnsDirective,
  ColumnDirective,
  Filter,
  Sort,
  Toolbar
} from "@syncfusion/ej2-react-grids";
import { useRef } from "react";

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
  const [selectedRange, setSelectedRange] = useState(() => getStoredFilters()?.selectedRange || "0");
  const [customDays, setCustomDays] = useState(() => getStoredFilters()?.customDays || "");
  const [excludeIPs, setExcludeIPs] = useState(() => getStoredFilters()?.excludeIPs ?? true);
  const gridRef = useRef<GridComponent | null>(null);
  const [hitMissGridData, setHitMissGridData] = useState([]);

  useEffect(() => {
    setStoredFilters({ selectedRange, customDays, excludeIPs });
  }, [selectedRange, customDays, excludeIPs]);

  // Compute effective days param
  const daysToUse =
    selectedRange === 'custom'
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
        fetch(`${base}/GetClientMisses${qs}`)
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

  const commonProps = {
    legendSettings: {
      visible: true,
      textStyle: {
        size: '14px',
        color: '#ededed',
        fontFamily: 'Poppins, sans-serif',
        fontWeight: '600',
      },
    },
    tooltip: {
      enable: true,
      textStyle: {
        fontFamily: 'Poppins, sans-serif',
        size: '14px',
        fontWeight: '500',
        color: '#ffffff'
      },
      fill: '#0a0a0a',
    },
  };

  return (
    <div>
      <div className="p-6 mx-auto rounded-3xl" style={{ backgroundColor: "#1a1a1a", color: "#eee", width: "90%" }}>
        <div className="flex flex-col p-6">
          <div className="flex gap-6">
            {/* Left side: Syncfusion Grid */}
            <div className="w-2/4 overflow-x-auto">
              <GridComponent 
                ref={gridRef}
                dataSource={hitMissGridData}
                allowPaging={true}
                pageSettings={{ pageSize: 15 }}
                allowSorting={true}
                allowFiltering={true}
                filterSettings={{
                  type: 'FilterBar',
                  mode: 'Immediate',
                  immediateModeDelay: 150
                }}
                height={ '55vh'}
                
              >
                <ColumnsDirective>
                  <ColumnDirective field="ipAddress" headerText="Client IPs" width="150" />
                  <ColumnDirective field="totalHits" headerText="Hit Bytes" width="150"
                    template={(props: HitMissData) => formatBytes(props.totalHits)} />
                  <ColumnDirective field="totalMisses" headerText="Miss Bytes" width="150"
                    template={(props: HitMissData) => formatBytes(props.totalMisses)} />
                </ColumnsDirective>
                <Inject services={[Sort, Filter, Toolbar]} />
              </GridComponent>
            </div>

            {/* Right side: Two pie charts stacked vertically */}
            <div className="w-2/4 flex flex-col gap-6">
              <div className="h-80 rounded p-2">
                <h2 className="text-center text-white font-semibold text-lg mb-2">Client Cache Hit</h2>
                {hitBytesByClient.length > 0 && (
                <AccumulationChartComponent
                  {...commonProps}
                  tooltipRender={(args) => {
                    if (args.point?.y) {
                      args.text = `${args.point.x}: ${formatBytes(args.point.y)}`;
                    }
                  }}
                >
                  <Inject services={[PieSeries, AccumulationTooltip, AccumulationLegend]} />
                  <AccumulationSeriesCollectionDirective>
                    <AccumulationSeriesDirective
                      dataSource={hitBytesByClient}
                      xName="x"
                      yName="y"
                      type="Pie"
                      dataLabel={{ visible: true, name: 'x' }}
                      palettes={chartPalette}
                    />
                  </AccumulationSeriesCollectionDirective>
                </AccumulationChartComponent>
                )}
              </div>
              <div className="h-80 rounded p-2">
                <h2 className="text-center text-white font-semibold text-lg mb-2">Client Cache Miss</h2>
                {missBytesByClient.length > 0 && (
                <AccumulationChartComponent
                  {...commonProps}
                  tooltipRender={(args) => {
                    if (args.point?.y) {
                      args.text = `${args.point.x}: ${formatBytes(args.point.y)}`;
                    }
                  }}
                >
                  <Inject services={[PieSeries, AccumulationTooltip, AccumulationLegend]} />
                  <AccumulationSeriesCollectionDirective>
                    <AccumulationSeriesDirective
                      dataSource={missBytesByClient}
                      xName="x"
                      yName="y"
                      type="Pie"
                      dataLabel={{ visible: true, name: 'x' }}
                      palettes={chartPalette}
                    />
                  </AccumulationSeriesCollectionDirective>
                </AccumulationChartComponent>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="container flex flex-wrap items-center gap-4 px-8 py-4 rounded-md shadow-md" style={{ width: '100%', marginTop: '1rem', padding: '15px', marginBottom: '2rem'}}>
          <label htmlFor="range" className="text-white font-semibold whitespace-nowrap">
            Date Range:
          </label>

          <div className="flex items-center gap-2">
            <select
              id="range"
              className="text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              style={{color: '#ffffff', backgroundColor: '#1a1a1a'}}
              value={selectedRange}
              onChange={(e) => setSelectedRange(e.target.value)}
            >
              <option value="0">All time</option>
              <option value="30">Last 30 days</option>
              <option value="7">Last 7 days</option>
              <option value="1">Last 1 day</option>
              <option value="custom">Custom</option>
            </select>

            {selectedRange === 'custom' && (
              <input
                type="number"
                min={1}
                max={365}
                placeholder="Days"
                className="text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                style={{ margin: '0', width: '5rem', color: '#ffffff', backgroundColor: '#1a1a1a' }}
                value={customDays}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d{0,3}$/.test(val)) {
                    setCustomDays(val);
                  }
                }}
              />
            )}
          </div>

          <button
            className={`ml-auto px-5 py-2 rounded-md font-semibold transition-colors duration-300 ${
              excludeIPs ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
            } text-white shadow-md whitespace-nowrap`}
            onClick={() => setExcludeIPs(!excludeIPs)}
            type="button"
          >
            {excludeIPs ? 'Exclude IPs' : 'Include All IPs'}
          </button>
        </div>
    </div>
  );
}
