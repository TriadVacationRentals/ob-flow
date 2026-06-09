import { NextRequest, NextResponse } from "next/server";

const NOTION_TOKEN   = process.env.NOTION_TOKEN!;
const NOTION_VERSION = "2022-06-28";
const GHL_BASE       = "https://services.leadconnectorhq.com";

const ghlHeaders = () => ({
  Authorization: `Bearer ${process.env.GHL_API_KEY}`,
  Version: "2021-04-15",
});

async function resolveGhlCalendar(calendarUrl: string) {
  if (!calendarUrl) return null;

  const slug = calendarUrl.split("/").pop() ?? "";
  if (!slug) return null;

  try {
    const listRes  = await fetch(
      `${GHL_BASE}/calendars/?locationId=${process.env.GHL_LOCATION_ID}`,
      { headers: ghlHeaders(), cache: "no-store" }
    );
    const listData = await listRes.json();

    const found = (listData.calendars ?? []).find(
      (c: { widgetSlug: string }) => c.widgetSlug === slug
    ) as { id: string } | undefined;

    if (!found) return null;

    const calRes  = await fetch(
      `${GHL_BASE}/calendars/${found.id}`,
      { headers: ghlHeaders(), cache: "no-store" }
    );
    const calData = await calRes.json();
    const c       = calData.calendar;

    return {
      calendarId:       c.id as string,
      calendarName:     (c.name as string) ?? "Onboarding Call",
      slotDuration:     (c.slotDuration as number) ?? 60,
      slotDurationUnit: (c.slotDurationUnit as string) ?? "mins",
      description:      ((c.description as string) ?? "").replace(/<[^>]*>/g, "").trim(),
      consentLabel:     (c.consentLabel as string) ?? "",
      formId:           (c.formId as string) || null,
    };
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const { leadId } = await params;

  const res = await fetch(`https://api.notion.com/v1/pages/${leadId}`, {
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Notion-Version": NOTION_VERSION,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const page = await res.json();
  const p    = page.properties;

  const name        = p["Lead Name"]?.title?.[0]?.plain_text ?? "there";
  const email       = p["Email"]?.email ?? "";
  const contractUrl = p["Mgmt Agreement"]?.formula?.string ?? "";
  const paymentLink = p["Payment Link"]?.formula?.string ?? "";
  const calendarUrl = p["OB Calendar"]?.url ?? "";

  const calendar = await resolveGhlCalendar(calendarUrl);

  return NextResponse.json({
    name,
    email,
    contractUrl,
    paymentLink,
    calendar,
  });
}
