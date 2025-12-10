import * as signalR from "@microsoft/signalr";

let connection: signalR.HubConnection | null = null;
let NGINX_URL: string = "";
if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_API_BASE_URL) {
  NGINX_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
}
let usageCount = 0;

export function getSignalRConnection(): signalR.HubConnection {
  if (!connection) {
    connection = new signalR.HubConnectionBuilder()
      .withUrl(`${NGINX_URL}/uirefreshhub`, {
        withCredentials: true,
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();
  }
  return connection;
}

export async function startConnection() {
  if (connection && connection.state === signalR.HubConnectionState.Disconnected) {
    await connection.start();
    console.log("SignalR started.");
  }
  usageCount++;
}

export async function stopConnection() {
  usageCount--;
  if (usageCount <= 0 && connection && connection.state === signalR.HubConnectionState.Connected) {
    await connection.stop();
    console.log("SignalR stopped.");
  }
}
