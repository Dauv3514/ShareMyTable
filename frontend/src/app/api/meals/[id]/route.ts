import { NextResponse } from "next/server";

const backendUrl = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL;

function buildBackendUrl(path: string) {
  return new URL(
    path.replace(/^\/+/, ""),
    backendUrl?.endsWith("/") ? backendUrl : `${backendUrl}/`,
  );
}

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  if (!backendUrl) {
    return NextResponse.json({ message: "API URL manquante" }, { status: 500 });
  }

  const { id } = await context.params;
  const targetUrl = buildBackendUrl(`/meals/${id}`);

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
