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
import { formatBytes, chartPalette } from "../../lib/Utilities";
import React, { useEffect, useState } from 'react';
import { getSignalRConnection, stopConnection, startConnection } from "../../lib/SignalR";

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

export default function Home() {
  const [hitMissData, setHitMissData] = useState([
    { x: 'Hit Bytes', y: 0 },
    { x: 'Miss Bytes', y: 0 },
  ]);

  const [serviceSplitData, setServiceSplitData] = useState<{ x: string; y: number }[]>([]);
  const [missBytesByService, setMissBytesByService] = useState<{ x: string; y: number }[]>([]);
  const [hitBytesByService, setHitBytesByService] = useState<{ x: string; y: number }[]>([]);
  const [selectedRange, setSelectedRange] = useState(() => getStoredFilters()?.selectedRange || "0");
  const [customDays, setCustomDays] = useState(() => getStoredFilters()?.customDays || "");
  const [excludeIPs, setExcludeIPs] = useState(() => getStoredFilters()?.excludeIPs ?? true);

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

  const fetchAll = async () => {
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
          { x: 'Hit Bytes', y: hitMiss.totalHitBytes },
          { x: 'Miss Bytes', y: hitMiss.totalMissBytes },
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
    };

  useEffect(() => {
    fetchAll();
  }, [debouncedDays, excludeIPs]);

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
    }, []);

  const commonProps = {
    legendSettings: {
      visible: true,
      textStyle: {
        size: '16px',
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
      <div className="grid grid-cols-2 gap-8 p-6">
        {/* Charts */}
        <div className="w-full h-96">
          <h2 className="text-lg font-semibold mb-2 text-center text-white">Cache Hit vs Miss (Bytes)</h2>
          {hitMissData[0].y > 0 && (
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
                  dataSource={hitMissData}
                  xName="x"
                  yName="y"
                  type="Pie"
                  dataLabel={{ visible: true, name: 'x' }}
                  palettes={['#4CAF50', '#ff3131ff']}
                />
              </AccumulationSeriesCollectionDirective>
            </AccumulationChartComponent>
          )}
        </div>

        <div className="w-full h-96">
          <h2 className="text-lg font-semibold mb-2 text-center text-white">Download Requests by Service</h2>
          {serviceSplitData.length > 0 && (
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
                  dataSource={serviceSplitData}
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

        <div className="w-full h-96">
          <h2 className="text-lg font-semibold mb-2 text-center text-white">Miss Bytes by Service</h2>
          {missBytesByService.length > 0 && (
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
                  dataSource={missBytesByService}
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

        <div className="w-full h-96">
          <h2 className="text-lg font-semibold mb-2 text-center text-white">Hit Bytes by Service</h2>
          {hitBytesByService.length > 0 && (
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
                  dataSource={hitBytesByService}
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
      <div className="container flex flex-wrap items-center gap-4 px-8 py-4 bg-gray-900 rounded-md shadow-md" style={{ width: '100%', marginTop: '0.25rem', padding: '15px', marginBottom: '2rem'}}>
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
