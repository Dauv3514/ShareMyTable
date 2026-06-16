import { NextResponse } from "next/server";

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

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { userId } = await context.params;
  const targetUrl = buildBackendUrl(`/host-profiles/public/user/${userId}`);

  if (!targetUrl) {
    return NextResponse.json({ message: "API URL manquante" }, { status: 500 });
  }

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
