import { NextRequest, NextResponse } from "next/server";

const backendUrl = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL;

function normalizeBackendUrl() {
  if (!backendUrl) {
    return null;
  }

  const url = new URL(backendUrl.endsWith("/") ? backendUrl : `${backendUrl}/`);
  const pathname = url.pathname.replace(/\/+$/, "");

  if (!pathname.endsWith("/api")) {
    url.pathname = `${pathname}/api/`.replace(/\/{2,}/g, "/");
  }

  return url.toString();
}

function buildBackendUrl(path: string) {
  const apiUrl = normalizeBackendUrl();
  if (!apiUrl) {
    return null;
  }

  return new URL(
    path.replace(/^\/+/, ""),
    apiUrl.endsWith("/") ? apiUrl : `${apiUrl}/`,
  );
}

export async function GET(request: NextRequest) {
  const targetUrl = buildBackendUrl("/meals");

  if (!targetUrl) {
    return NextResponse.json({ message: "API URL manquante" }, { status: 500 });
  }

  request.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  try {
    const response = await fetch(targetUrl.toString(), {
      cache: "no-store",
    });
    const body = await response.text();

    return new NextResponse(body, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Impossible de joindre le backend" },
      { status: 502 },
    );
  }
}
