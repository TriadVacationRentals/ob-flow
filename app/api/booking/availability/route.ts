import { NextRequest, NextResponse } from "next/server";

const GHL_BASE = "https://services.leadconnectorhq.com";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const calendarId = searchParams.get("calendarId");
  const year       = parseInt(searchParams.get("year")  ?? "");
  const month      = parseInt(searchParams.get("month") ?? ""); // 0-indexed
  const timezone   = searchParams.get("timezone") ?? "America/New_York";

  if (!calendarId || isNaN(year) || isNaN(month)) {
    return NextResponse.json({ error: "calendarId, year, month required" }, { status: 400 });
  }

  const startDate = new Date(year, month, 1).getTime();
  const endDate   = new Date(year, month + 1, 0, 23, 59, 59).getTime();

  const res = await fetch(
    `${GHL_BASE}/calendars/${calendarId}/free-slots?startDate=${startDate}&endDate=${endDate}&timezone=${encodeURIComponent(timezone)}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GHL_API_KEY}`,
        Version: "2021-04-15",
      },
      cache: "no-store",
    }
  );

  const data = await res.json();

  const result: Record<string, { display: string; startIso: string }[]> = {};

  for (const [dateKey, dayData] of Object.entries(data)) {
    if (dateKey === "traceId") continue;
    const slots = (dayData as { slots?: string[] }).slots;
    if (!slots?.length) continue;
    result[dateKey] = slots.map((iso) => ({
      startIso: iso,
      display: new Date(iso).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: timezone,
      }),
    }));
  }

  return NextResponse.json(result);
}
