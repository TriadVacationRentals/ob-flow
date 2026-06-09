import { NextRequest, NextResponse } from "next/server";

const GHL_BASE = "https://services.leadconnectorhq.com";

export async function POST(req: NextRequest) {
  let body: {
    calendarId: string;
    firstName: string;
    lastName?: string;
    email: string;
    phone?: string;
    startIso: string;
    slotDuration?: number;
    timezone?: string;
  };

  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { calendarId, firstName, email, startIso } = body;

  if (!calendarId || !firstName || !email || !startIso) {
    return NextResponse.json({ error: "calendarId, firstName, email, startIso required" }, { status: 400 });
  }

  // TEST MODE — remove before go-live
  if (process.env.BOOKING_TEST_MODE === "true") {
    return NextResponse.json({ success: true, appointmentId: "test-mode", startTime: startIso, endTime: startIso });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const ghlHeaders = {
    Authorization: `Bearer ${process.env.GHL_API_KEY}`,
    Version: "2021-04-15",
    "Content-Type": "application/json",
  };

  const tz           = body.timezone ?? "America/New_York";
  const duration     = body.slotDuration ?? 60;
  const slotMs       = new Date(startIso).getTime();
  const endIso       = new Date(slotMs + duration * 60000).toISOString();

  // Re-validate slot is still available
  const dayStart = new Date(startIso.slice(0, 10) + "T00:00:00").getTime();
  const dayEnd   = dayStart + 86400000;

  const availRes = await fetch(
    `${GHL_BASE}/calendars/${calendarId}/free-slots?startDate=${dayStart}&endDate=${dayEnd}&timezone=${encodeURIComponent(tz)}`,
    { headers: ghlHeaders }
  );
  const avail = await availRes.json();
  const dateKey = startIso.slice(0, 10);
  const slots   = (avail[dateKey]?.slots ?? []) as string[];
  const isAvail = slots.some(s => new Date(s).getTime() === slotMs);

  if (!isAvail) {
    return NextResponse.json(
      { error: "This slot is no longer available. Please pick another time." },
      { status: 409 }
    );
  }

  // Upsert contact
  const contactRes = await fetch(`${GHL_BASE}/contacts/upsert`, {
    method: "POST",
    headers: ghlHeaders,
    body: JSON.stringify({
      locationId: process.env.GHL_LOCATION_ID,
      firstName:  firstName.trim(),
      lastName:   (body.lastName ?? "").trim(),
      email:      email.trim().toLowerCase(),
      phone:      body.phone ?? "",
    }),
  });

  const contactData = await contactRes.json();
  if (!contactData.contact?.id) {
    return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
  }

  // Create appointment
  const apptRes = await fetch(`${GHL_BASE}/calendars/events/appointments`, {
    method: "POST",
    headers: ghlHeaders,
    body: JSON.stringify({
      calendarId,
      locationId: process.env.GHL_LOCATION_ID,
      contactId:  contactData.contact.id,
      startTime:  startIso,
      endTime:    endIso,
      selectedTimezone: tz,
    }),
  });

  const appt = await apptRes.json();
  if (!appt.id) {
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
  }

  return NextResponse.json({
    success:       true,
    appointmentId: appt.id,
    startTime:     appt.startTime ?? startIso,
    endTime:       appt.endTime   ?? endIso,
  });
}
