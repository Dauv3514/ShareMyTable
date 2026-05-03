import { NextRequest, NextResponse } from "next/server";

const backendUrl = process.env.NEXT_PUBLIC_API_URL;

export async function GET(request: NextRequest) {
  if (!backendUrl) {
    return NextResponse.json({ message: "API URL manquante" }, { status: 500 });
  }

  const targetUrl = new URL("/meals", backendUrl);
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
