export interface SteamDepot {
  id: number;
  steamAppId: number;
  steamApp: {
    name: string;
  };
}

export interface DownloadEvent {
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

export type Filters = {
  selectedRange?: string;
  customDays?: number | string;
  excludeIPs?: boolean;
};

export const STEAM_HEADER_URL = (appId: number) =>
  `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;

export const STEAM_FALLBACK_URL = "https://steamdb.info/static/img/applogo.svg";
