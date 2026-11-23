"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AnimatedPage, AnimatedCard } from "@/components/animations";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

type ClientName = {
  ipAddress: string;
  name: string | null;
  isManuallySet: boolean;
};

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
  const [uiVersion, setUiVersion] = useState("Loading...");
  const [apiVersion, setApiVersion] = useState("Loading...");
  const [clientNames, setClientNames] = useState<ClientName[]>([]);
  const [clientNameLookupEnabled, setClientNameLookupEnabled] = useState(false);
  const [clientNamesLoading, setClientNamesLoading] = useState(true);
  const [clientNameSearch, setClientNameSearch] = useState("");

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

  useEffect(() => {
    async function fetchVersions() {
      try {
        const uiRes = await fetch("/api/version");
        if (!uiRes.ok) throw new Error("Failed to load UI version");
        const uiData = await uiRes.json();
        setUiVersion(uiData.version || "dev");
      } catch {
        setUiVersion("Unavailable");
      }

      try {
        const apiRes = await fetch("/api/proxy/Settings/GetVersion");
        if (!apiRes.ok) throw new Error("Failed to load API version");
        const apiData = await apiRes.json();
        setApiVersion(apiData.version || "dev");
      } catch {
        setApiVersion("Unavailable");
      }
    }

    fetchVersions();
  }, []);

  const fetchClientNames = async () => {
    try {
      const [namesRes, settingRes] = await Promise.all([
        fetch("/api/proxy/Settings/GetClientNames"),
        fetch("/api/proxy/Settings/GetClientNameLookupSetting"),
      ]);

      if (!namesRes.ok) throw new Error("Failed to load client names");
      if (!settingRes.ok) throw new Error("Failed to load hostname lookup setting");

      const names = await namesRes.json();
      const setting = await settingRes.json();
      setClientNames(names || []);
      setClientNameLookupEnabled(Boolean(setting.enabled));
    } catch (err) {
      console.error("Error loading client names:", err);
      setError("Failed to load client names.");
    } finally {
      setClientNamesLoading(false);
    }
  };

  useEffect(() => {
    async function initializeClientNames() {
      try {
        const [namesRes, settingRes] = await Promise.all([
          fetch("/api/proxy/Settings/GetClientNames"),
          fetch("/api/proxy/Settings/GetClientNameLookupSetting"),
        ]);

        if (!namesRes.ok) throw new Error("Failed to load client names");
        if (!settingRes.ok) throw new Error("Failed to load hostname lookup setting");

        const names = await namesRes.json();
        const setting = await settingRes.json();
        setClientNames(names || []);
        setClientNameLookupEnabled(Boolean(setting.enabled));
      } catch (err) {
        console.error("Error loading client names:", err);
        setError("Failed to load client names.");
      } finally {
        setClientNamesLoading(false);
      }
    }

    void initializeClientNames();
  }, []);

  const saveClientName = async (ipAddress: string, name: string) => {
    try {
      const res = await fetch("/api/proxy/Settings/SetClientName", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ipAddress, name }),
      });
      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.message || "Failed to save client name");
      }
      await fetchClientNames();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save client name.");
      return false;
    }
  };

  const filteredClientNames = useMemo(() => {
    const query = clientNameSearch.trim().toLowerCase();
    if (!query) return clientNames;

    return clientNames.filter((client) => {
      const source = client.isManuallySet ? "manual" : "automatic";
      return (
        client.ipAddress.toLowerCase().includes(query) ||
        (client.name?.toLowerCase().includes(query) ?? false) ||
        source.includes(query)
      );
    });
  }, [clientNames, clientNameSearch]);

  return (
    <AnimatedPage>
      <div
        className="min-h-[calc(90vh-80px)] flex items-center justify-center p-6"
        style={{ fontFamily: "Poppins, sans-serif" }}
      >
        <div className="w-full max-w-xl bg-background border border-border rounded-lg p-6">
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
                        ? "bg-[#74d678] cursor-not-allowed"
                        : "bg-[#4caf50] hover:bg-[#368f39]"
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
              <h2 className="text-xl font-semibold mb-4 text-foreground">
                Network Graph Interface
              </h2>

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

          <AnimatedCard delay={0.4}>
            <Card className="border-border bg-card py-0">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-lg text-foreground">Client Names</CardTitle>
                <CardDescription>
                  Map client IP addresses to friendly or automatically discovered names
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3">
                  <div>
                    <p className="font-medium text-foreground">Hostname lookup</p>
                    <p className="text-sm text-muted-foreground">
                      Look up hostnames for network client IP addresses
                    </p>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span tabIndex={0} className="inline-flex rounded-full">
                        <Switch
                          checked={clientNameLookupEnabled}
                          disabled
                          aria-label="Hostname lookup enabled from server configuration"
                        />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      To edit this setting, update <code>ClientNameLookupEnabled</code> in the API environment variables and restart the API.
                    </TooltipContent>
                  </Tooltip>
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="mt-4 w-full">Manage client names</Button>
                  </DialogTrigger>
                  <DialogContent className="flex h-[85vh] w-[calc(100%-2rem)] flex-col overflow-hidden sm:w-[900px] sm:max-w-[900px]">
                    <DialogHeader>
                      <DialogTitle>Client names</DialogTitle>
                      <DialogDescription>
                        Enter a custom name for an IP address. Manual names are not overwritten by
                        hostname lookup.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="shrink-0">
                      <Input
                        value={clientNameSearch}
                        onChange={(event) => setClientNameSearch(event.target.value)}
                        placeholder="Search by IP address, name, or source"
                        aria-label="Search client names"
                      />
                    </div>

                    {clientNamesLoading ? (
                      <p className="text-sm text-muted-foreground">Loading client names...</p>
                    ) : (
                      <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-border">
                        <Table>
                          <TableHeader className="sticky top-0 z-10 bg-background">
                            <TableRow>
                              <TableHead>IP Address</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Source</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredClientNames.map((client) => (
                              <TableRow key={client.ipAddress}>
                                <TableCell className="font-mono">{client.ipAddress}</TableCell>
                                <TableCell>
                                  <Input
                                    key={`${client.ipAddress}-${client.name ?? ""}`}
                                    defaultValue={client.name ?? ""}
                                    placeholder="Custom name"
                                    onBlur={(event) => {
                                      const nextName = event.target.value.trim();
                                      const currentName = client.name?.trim() ?? "";
                                      if (nextName !== currentName) {
                                        void saveClientName(client.ipAddress, nextName);
                                      }
                                    }}
                                    aria-label={`Name for ${client.ipAddress}`}
                                  />
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {client.isManuallySet ? "Manual" : "Automatic"}
                                </TableCell>
                              </TableRow>
                            ))}
                            {filteredClientNames.length === 0 && (
                              <TableRow>
                                <TableCell
                                  colSpan={3}
                                  className="text-center text-muted-foreground"
                                >
                                  {clientNames.length === 0
                                    ? "No client IP addresses found yet."
                                    : "No clients match your search."}
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                        <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
                          Showing {filteredClientNames.length} of {clientNames.length} clients
                        </p>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </AnimatedCard>

          <AnimatedCard delay={0.5} className="mt-4">
            <Card className="border-border bg-card py-0">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-lg text-foreground">Application Versions</CardTitle>
                <CardDescription>Versions reported by each application</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 pb-4 sm:grid-cols-2">
                <div className="rounded-md border border-border bg-background px-4 py-3">
                  <p className="text-sm text-muted-foreground">UI Server</p>
                  <p className="mt-1 font-mono font-semibold text-foreground">{uiVersion}</p>
                </div>
                <div className="rounded-md border border-border bg-background px-4 py-3">
                  <p className="text-sm text-muted-foreground">API Server</p>
                  <p className="mt-1 font-mono font-semibold text-foreground">{apiVersion}</p>
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>
        </div>
      </div>
    </AnimatedPage>
  );
}
