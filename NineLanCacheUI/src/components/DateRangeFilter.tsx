"use client";

import { AnimatedCard } from "@/components/animations";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface DateRangeFilterProps {
  selectedRange: string;
  customDays: string | number;
  excludeIPs: boolean;
  onRangeChange: (range: string) => void;
  onCustomDaysChange: (days: string) => void;
  onExcludeIPsChange: (exclude: boolean) => void;
  delay?: number;
}

export function DateRangeFilter({
  selectedRange,
  customDays,
  excludeIPs,
  onRangeChange,
  onCustomDaysChange,
  onExcludeIPsChange,
  delay = 0.5,
}: DateRangeFilterProps) {
  return (
    <AnimatedCard delay={delay}>
      <div
        className="container flex flex-wrap items-center gap-4 px-8 py-4 bg-card rounded-md shadow-md border border-border"
        style={{ width: "100%", marginTop: "0.25rem", padding: "15px", marginBottom: "2rem" }}
      >
        <label htmlFor="range" className="text-foreground font-semibold whitespace-nowrap">
          Date Range:
        </label>

        <div className="flex items-center gap-2">
          <Select value={selectedRange} onValueChange={(v) => onRangeChange(v)}>
            <SelectTrigger className="text-foreground px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition bg-secondary">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">All time</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="1">Last 1 day</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>

          {selectedRange === "custom" && (
            <input
              type="number"
              min={1}
              max={365}
              placeholder="Days"
              className="text-foreground px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition bg-secondary"
              style={{ margin: "0", width: "5rem" }}
              value={customDays}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d{0,3}$/.test(val)) {
                  onCustomDaysChange(val);
                }
              }}
            />
          )}
        </div>

        <button
          className={`ml-auto px-5 py-2 rounded-md font-semibold transition-colors duration-300 ${
            excludeIPs ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
          } text-white shadow-md whitespace-nowrap`}
          onClick={() => onExcludeIPsChange(!excludeIPs)}
          type="button"
        >
          {excludeIPs ? "Exclude IPs" : "Include All IPs"}
        </button>
      </div>
    </AnimatedCard>
  );
}
