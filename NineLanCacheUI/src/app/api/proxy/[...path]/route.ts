import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL;

async function ProxyRequest(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  // Avoid automatic redirect-following to prevent redirect loops when backend
  // redirects between HTTP/HTTPS or issues redirects for auth.
  const fetchOptions: RequestInit = { ...options, headers, redirect: "manual" };
  return fetch(url, fetchOptions);
}

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  const { params } = context;
  const resolvedParams = await params;
  return proxyRequest(req, resolvedParams, "GET");
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { params } = context;
  const resolvedParams = await params;
  return proxyRequest(req, resolvedParams, "POST");
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const { params } = context;
  const resolvedParams = await params;
  return proxyRequest(req, resolvedParams, "PUT");
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { params } = context;
  const resolvedParams = await params;
  return proxyRequest(req, resolvedParams, "DELETE");
}

async function proxyRequest(req: NextRequest, params: { path: string[] }, method: string) {
  const pathSegments = params.path;

  if (!pathSegments || pathSegments.length === 0) {
    return NextResponse.json({ error: "Invalid API path" }, { status: 400 });
  }

  try {
    const url = new URL(`${API_BASE_URL}/${pathSegments.join("/")}`);
    if (method === "GET") {
      url.search = req.nextUrl.search;
    }

    const filteredHeaders = filterHeaders(req.headers);

    const options: RequestInit = {
      method,
      headers: filteredHeaders,
      body: method !== "GET" ? await req.text() : undefined,
    };

    const response = await ProxyRequest(url.toString(), options);

    // If backend returned a redirect, forward status and Location header to client
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location") || undefined;
      const body = await response.text();
      const headersToSend: Record<string, string> = {};
      if (location) headersToSend["location"] = location;
      const res = new NextResponse(body, { status: response.status, headers: headersToSend });
      return res;
    }

    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    } else {
      const text = await response.text();
      return new NextResponse(text, { status: response.status });
    }
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

function filterHeaders(headers: Headers): Record<string, string> {
  const disallowed = [
    "connection",
    "host",
    "keep-alive",
    "proxy-connection",
    "transfer-encoding",
    "upgrade",
  ];
  return Object.fromEntries(
    Array.from(headers.entries()).filter(([key]) => !disallowed.includes(key.toLowerCase())),
  );
}
