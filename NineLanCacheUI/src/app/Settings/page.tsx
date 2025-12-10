"use client";
import { useEffect, useState } from "react";
import Button from "../../components/Button";
import { AnimatedPage, AnimatedCard } from "@/components/animations";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

function isValidIp(ip: string) {
  return /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/.test(ip);
}

function normalizeIp(ip: string) {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) return ip.trim();
  const nums = parts.map((p) => {
    if (p === "") return NaN;
    const n = Number(p);
    return Number.isFinite(n) ? n : NaN;
  });
  if (nums.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return ip.trim();
  return nums.join(".");
}

export default function SettingsPage() {
  const [excludedIps, setExcludedIps] = useState<string[]>([]);
  const [newIp, setNewIp] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [ipError, setIpError] = useState<string | null>(null);
  const [selectedInterface, setSelectedInterface] = useState("");
  const [interfaceOptions, setInterfaceOptions] = useState<string[]>([]);
  const [interfaceLoading, setInterfaceLoading] = useState(true);

  useEffect(() => {
    async function fetchIps() {
      try {
        setLoading(true);
        const res = await fetch(`/api/proxy/Settings/GetExcludedIps`);
        const data = await res.json();
        setExcludedIps(data || []);
      } catch {
        setError("Failed to load excluded IPs.");
      } finally {
        setLoading(false);
      }
    }
    fetchIps();
  }, []);

  const addIp = async () => {
    const trimmed = newIp.trim();
    const normalized = normalizeIp(trimmed);
    if (!trimmed || !isValidIp(normalized)) {
      setIpError("Please enter a valid IPv4 address.");
      return;
    }
    setIpError(null);
    setError(null);
    setAdding(true);
    try {
      const res = await fetch(`/api/proxy/Settings/AddExcludedIp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: normalized }),
      });

      if (res.ok) {
        setExcludedIps((prev) => [...prev, normalized]);
        setNewIp("");
      } else {
        const result = await res.json();
        setError(result.message || "Failed to add IP.");
      }
    } catch {
      setError("Failed to add IP.");
    } finally {
      setAdding(false);
    }
  };

  const removeIp = async (ipToRemove: string) => {
    try {
      const res = await fetch(`/api/proxy/Settings/DeleteExcludedIp`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: ipToRemove }),
      });

      if (res.ok) {
        setExcludedIps((prev) => prev.filter((ip) => ip !== ipToRemove));
      } else {
        setError("Failed to delete IP.");
      }
    } catch {
      setError("Failed to delete IP.");
    }
  };

  useEffect(() => {
    async function fetchInterfacesAndSetting() {
      try {
        setInterfaceLoading(true);

        const [interfacesRes, selectedRes] = await Promise.all([
          fetch("/api/proxy/Network/GetNetworkInterfaces"),
          fetch("/api/proxy/Settings/GetNetworkGraphInterface"),
        ]);

        const ifaceList = await interfacesRes.json();
        const selectedData = await selectedRes.json();

        setInterfaceOptions(ifaceList);
        setSelectedInterface(selectedData.interfaceName || "");
      } catch (err) {
        console.error("Error loading interface data:", err);
        setError("Failed to load network interface settings.");
      } finally {
        setInterfaceLoading(false);
      }
    }

    fetchInterfacesAndSetting();
  }, []);

  return (
    <AnimatedPage>
      <div
        className="p-6 max-w-xl mx-auto bg-background border border-border rounded-lg"
        style={{ fontFamily: "Poppins, sans-serif" }}
      >
        <h1 className="text-3xl font-bold mb-4 text-foreground">Settings</h1>

        <AnimatedCard delay={0.1}>
          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Excluded IP Addresses</h2>

            {loading ? (
              <p className="text-foreground">Loading...</p>
            ) : (
              <ul className="max-h-60 overflow-y-auto rounded-md p-3 bg-card border border-border">
                {excludedIps.length === 0 && (
                  <li className="text-muted-foreground italic">No excluded IP addresses yet.</li>
                )}
                {excludedIps.map((ip, idx) => (
                  <li
                    key={idx}
                    className="text-foreground flex justify-between items-center mb-1 px-3 py-1 rounded transition hover:bg-secondary"
                  >
                    <span>{ip}</span>
                    <button
                      onClick={() => removeIp(ip)}
                      className="text-red-500 hover:text-red-700 font-semibold text-xl p-0 leading-none bg-transparent border-0 cursor-pointer"
                      aria-label={`Remove ${ip}`}
                      title={`Remove ${ip}`}
                    >
                      &times;
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </AnimatedCard>

        <AnimatedCard delay={0.2}>
          <section className="mb-6">
            <label htmlFor="ip-input" className="block font-semibold mb-2 text-foreground">
              Add new IP address
            </label>
            <div className="flex flex-col gap-2">
              <div className="flex gap-3">
                <Input
                  id="ip-input"
                  type="text"
                  placeholder="e.g. 192.168.1.1"
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  onBlur={() => {
                    const normalized = normalizeIp(newIp);
                    setNewIp(normalized);
                    if (normalized && !isValidIp(normalized)) {
                      setIpError("Please enter a valid IPv4 address.");
                    } else {
                      setIpError(null);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addIp();
                    }
                  }}
                  aria-invalid={!!ipError}
                  className="flex-1 text-foreground"
                  style={{ margin: 0 }}
                />

                <Button
                  disabled={
                    !newIp.trim() || !!ipError || !isValidIp(normalizeIp(newIp.trim())) || adding
                  }
                  onClick={addIp}
                  className={`px-6 py-2 rounded font-semibold text-white transition ${
                    !newIp.trim() || !!ipError || !isValidIp(normalizeIp(newIp.trim())) || adding
                      ? "bg-indigo-400 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  {adding ? "Adding..." : "Add"}
                </Button>
              </div>

              {ipError && <p className="text-red-500 font-semibold">{ipError}</p>}
              {error && <p className="mt-2 text-red-500 font-semibold">{error}</p>}
            </div>
          </section>
        </AnimatedCard>

        <AnimatedCard delay={0.3}>
          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Network Graph Interface</h2>

            {interfaceLoading ? (
              <p className="text-foreground">Loading interfaces...</p>
            ) : (
              <div className="flex justify-center">
                <Select
                  value={selectedInterface}
                  onValueChange={async (val) => {
                    const newInterface = val;
                    setSelectedInterface(newInterface);

                    try {
                      const res = await fetch("/api/proxy/Settings/SetNetworkGraphInterface", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ interface: newInterface }),
                      });

                      if (!res.ok) {
                        const err = await res.json();
                        setError(err.message || "Failed to update network interface.");
                      }
                    } catch {
                      setError("Failed to update network interface.");
                    }
                  }}
                >
                  <SelectTrigger className="text-foreground px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition bg-secondary mx-auto">
                    <SelectValue placeholder="Select interface" />
                  </SelectTrigger>
                  <SelectContent>
                    {interfaceOptions.map((iface) => (
                      <SelectItem key={iface} value={iface}>
                        {iface}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </section>
        </AnimatedCard>
      </div>
    </AnimatedPage>
  );
}
