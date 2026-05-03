import { NextResponse } from "next/server";

const backendUrl = process.env.NEXT_PUBLIC_API_URL;

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  if (!backendUrl) {
    return NextResponse.json({ message: "API URL manquante" }, { status: 500 });
  }

  const { userId } = await context.params;
  const targetUrl = new URL(`/host-profiles/public/user/${userId}`, backendUrl);

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
