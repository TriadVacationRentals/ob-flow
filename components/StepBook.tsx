"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";

const TZ_LIST = [
  "Pacific/Honolulu","America/Anchorage","America/Los_Angeles","America/Phoenix",
  "America/Denver","America/Chicago","America/New_York","America/Toronto",
  "America/Vancouver","America/Sao_Paulo","America/Buenos_Aires","America/Bogota",
  "Atlantic/Reykjavik","Europe/London","Europe/Paris","Europe/Berlin",
  "Europe/Madrid","Europe/Rome","Europe/Amsterdam","Europe/Stockholm",
  "Europe/Warsaw","Europe/Prague","Europe/Budapest","Europe/Bucharest",
  "Europe/Athens","Europe/Istanbul","Europe/Moscow","Africa/Cairo",
  "Africa/Johannesburg","Asia/Dubai","Asia/Kolkata","Asia/Bangkok",
  "Asia/Singapore","Asia/Tokyo","Asia/Seoul","Asia/Shanghai",
  "Australia/Sydney","Pacific/Auckland",
];

function tzOffset(zone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "shortOffset" }).formatToParts(new Date());
    return parts.find(p => p.type === "timeZoneName")?.value ?? "";
  } catch { return ""; }
}

function tzLabel(zone: string) {
  const city = zone.split("/").pop()!.replace(/_/g, " ");
  return `(${tzOffset(zone)}) ${city}`;
}

type Slot = { display: string; startIso: string };
type SlotsData = Record<string, Slot[]>;

type CalendarInfo = {
  calendarId: string;
  calendarName: string;
  slotDuration: number;
  slotDurationUnit: string;
  description: string;
  consentLabel: string;
  formId: string | null;
};

type Props = {
  leadName: string;
  leadEmail?: string;
  calendar: CalendarInfo;
  onComplete: (slot: { date: string; time: string }) => void;
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS   = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function toKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

export default function StepBook({ leadName, leadEmail, calendar, onComplete }: Props) {
  const { calendarId, calendarName, slotDuration, consentLabel } = calendar;
  const today = useMemo(() => new Date(), []);
  const todayStart = useMemo(
    () => new Date(today.getFullYear(), today.getMonth(), today.getDate()),
    [today]
  );

  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selDate,   setSelDate]   = useState<string | null>(null);
  const [selSlot,   setSelSlot]   = useState<Slot | null>(null);
  const [bookStep,  setBookStep]  = useState<1 | 2>(1);
  const [showSlots, setShowSlots] = useState(false);
  const [sheetSlots, setSheetSlots] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [slotsData,    setSlotsData]    = useState<SlotsData>({});
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError,   setSlotsError]   = useState(false);

  const [firstName, setFirstName] = useState(leadName.split(" ")[0] ?? "");
  const [lastName,  setLastName]  = useState(leadName.split(" ").slice(1).join(" ") ?? "");
  const [email,     setEmail]     = useState(leadEmail ?? "");
  const [phone,     setPhone]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);
  const [consented, setConsented] = useState(!consentLabel);

  const [tz, setTz] = useState(() =>
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "America/New_York"
  );
  const [tzOpen,   setTzOpen]   = useState(false);
  const [tzSearch, setTzSearch] = useState("");
  const [tzPos,    setTzPos]    = useState({ top: 0, left: 0 });
  const tzBarRef = useRef<HTMLDivElement>(null);

  const filteredTz = useMemo(() => {
    const list = TZ_LIST.includes(tz) ? TZ_LIST : [tz, ...TZ_LIST];
    const q = tzSearch.toLowerCase();
    return !q ? list : list.filter(z => z.toLowerCase().includes(q) || tzLabel(z).toLowerCase().includes(q));
  }, [tzSearch, tz]);

  useEffect(() => {
    if (!tzOpen) return;
    const handler = (e: MouseEvent) => {
      if (tzBarRef.current && !tzBarRef.current.contains(e.target as Node)) setTzOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [tzOpen]);

  function openTzPicker(e: React.MouseEvent) {
    e.stopPropagation();
    if (tzOpen) { setTzOpen(false); return; }
    if (tzBarRef.current) {
      const rect = tzBarRef.current.getBoundingClientRect();
      setTzPos({ top: Math.max(8, rect.top - 252), left: rect.left });
    }
    setTzSearch("");
    setTzOpen(true);
  }

  useEffect(() => {
    if (!calendarId) return;
    setSlotsLoading(true);
    setSlotsError(false);
    setSelDate(null);
    setSelSlot(null);
    setShowSlots(false);
    setSheetSlots(false);

    fetch(`/api/booking/availability?calendarId=${calendarId}&year=${viewYear}&month=${viewMonth}&timezone=${encodeURIComponent(tz)}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: SlotsData) => { setSlotsData(data); setSlotsLoading(false); })
      .catch(() => { setSlotsError(true); setSlotsLoading(false); });
  }, [calendarId, viewYear, viewMonth, tz]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow    = new Date(viewYear, viewMonth, 1).getDay();
  const availDates  = Object.keys(slotsData);

  const selectedDateLabel = selDate
    ? new Date(selDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    : null;

  const sidebarDate = selDate && selSlot
    ? `${selectedDateLabel} · ${selSlot.display}`
    : "Select a date & time";

  const isPrevDisabled =
    viewYear < today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth <= today.getMonth());

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
    setBookStep(1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
    setBookStep(1);
  }

  async function handleBook() {
    if (!selSlot || !selDate || !firstName || !email) return;
    setLoading(true);
    setBookError(null);
    try {
      const res = await fetch("/api/booking/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendarId,
          firstName,
          lastName,
          email,
          phone,
          startIso:     selSlot.startIso,
          slotDuration,
          timezone:     tz,
          formId:       calendar.formId ?? undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setBookError(err.error ?? "Booking failed. Please try again.");
        setLoading(false);
        return;
      }
      onComplete({ date: selDate, time: selSlot.display });
    } catch {
      setBookError("Booking failed. Please try again.");
      setLoading(false);
    }
  }

  const canBook = !!selSlot && !!selDate && !!firstName && !!email && consented;

  // ── Shared calendar grid ─────────────────────────────────────────────────
  function CalGrid({ onSelectDate }: { onSelectDate: (key: string) => void }) {
    return (
      <>
        <div className="cal-header">
          <span className="cal-month-label">{MONTHS[viewMonth]} {viewYear}</span>
          <div className="cal-nav">
            <button type="button" className="cal-nav-btn" onClick={prevMonth} disabled={isPrevDisabled} aria-label="Previous month">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 11L5 7L9 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button type="button" className="cal-nav-btn" onClick={nextMonth} aria-label="Next month">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        {slotsLoading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="ob-spinner" style={{ borderColor: "rgba(64,140,255,0.2)", borderTopColor: "#2679F6" }} />
          </div>
        ) : slotsError ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#62748e" }}>
            Could not load availability. Try again.
          </div>
        ) : (
          <div className="cal-grid">
            {DAYS.map(d => <div className="cal-day-header" key={d}>{d}</div>)}
            {Array.from({ length: firstDow }).map((_, i) => (
              <div className="cal-day cal-day--empty" key={`e${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const key = toKey(viewYear, viewMonth, day);
              const isPast  = new Date(viewYear, viewMonth, day) < todayStart;
              const isAvail = availDates.includes(key);
              const isSel   = key === selDate;
              let cls = "cal-day";
              if (!isAvail || isPast) cls += " cal-day--disabled";
              if (isSel) cls += " cal-day--selected";
              return (
                <div key={key} className={cls} onClick={() => { if (!isPast && isAvail) onSelectDate(key); }}>
                  {day}
                </div>
              );
            })}
          </div>
        )}
      </>
    );
  }

  // ── Shared slot list ─────────────────────────────────────────────────────
  function SlotList({ onSelectSlot, onBack }: { onSelectSlot: (slot: Slot) => void; onBack: () => void }) {
    return (
      <>
        <button type="button" className="booking-slots-back" onClick={onBack}>← Change date</button>
        {selDate ? (
          <>
            <p className="booking-slots-title">{selectedDateLabel}</p>
            <div className="slots-list">
              {(slotsData[selDate] ?? []).map(slot => (
                <button
                  key={slot.startIso}
                  type="button"
                  className={`slot-btn${selSlot?.startIso === slot.startIso ? " slot-btn--selected" : ""}`}
                  onClick={() => onSelectSlot(slot)}
                >
                  {slot.display}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="booking-slots-empty">Select a date to see available times</div>
        )}
      </>
    );
  }

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════════════
          DESKTOP
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="booking-body">
        <div className="booking-left">
          <div className="booking-left-icon">
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <circle cx="13" cy="13" r="10" stroke="#2679F6" strokeWidth="1.5"/>
              <path d="M13 7.5V13L16.5 15.5" stroke="#2679F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="booking-left-info">
            <h2 className="booking-left-title">{calendarName}</h2>
          </div>
          <div className="booking-left-meta">
            <div className="booking-meta-row">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5.5" stroke="#62748E" strokeWidth="1.2"/>
                <path d="M7 4V7L9 8.5" stroke="#62748E" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>{slotDuration} minutes</span>
            </div>
            <div className="booking-meta-row">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1.5" y="2.5" width="11" height="10" rx="1.5" stroke="#62748E" strokeWidth="1.2"/>
                <path d="M4.5 1.5V4M9.5 1.5V4M1.5 6H12.5" stroke="#62748E" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              <span>{sidebarDate}</span>
            </div>
          </div>
          <div className="tz-picker">
            <div
              ref={tzBarRef}
              className={`booking-tz-bar${tzOpen ? " is-open" : ""}`}
              onClick={openTzPicker}
            >
              <div className="booking-tz-inner">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <circle cx="6.5" cy="6.5" r="5" stroke="#2679F6" strokeWidth="1.1"/>
                  <ellipse cx="6.5" cy="6.5" rx="2.2" ry="5" stroke="#2679F6" strokeWidth="1.1"/>
                  <path d="M1.5 6.5H11.5M2 4.5H11M2 8.5H11" stroke="#2679F6" strokeWidth="1" strokeLinecap="round"/>
                </svg>
                <span className="tz-label">{tzLabel(tz)}</span>
                <span className="tz-chevron">
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </div>
            </div>
          </div>

          {tzOpen && typeof document !== "undefined" && createPortal(
            <div
              className="tz-dropdown"
              style={{ top: tzPos.top, left: tzPos.left }}
              onClick={e => e.stopPropagation()}
            >
              <input
                className="tz-search"
                type="text"
                placeholder="Search timezone..."
                value={tzSearch}
                onChange={e => setTzSearch(e.target.value)}
                autoFocus
              />
              <div className="tz-list">
                {filteredTz.length === 0 ? (
                  <div className="tz-empty">No results</div>
                ) : filteredTz.map(z => (
                  <div
                    key={z}
                    className={`tz-option${z === tz ? " is-selected" : ""}`}
                    onClick={() => { setTz(z); setTzOpen(false); }}
                  >
                    {tzLabel(z)}
                  </div>
                ))}
              </div>
            </div>,
            document.body
          )}
        </div>

        <div className="booking-divider" />

        <div className="booking-right">
          {bookStep === 1 && (
            <div className="booking-step">
              <div className={`booking-cal-wrap${showSlots ? " show-slots" : ""}`}>
                <div className="booking-cal">
                  <CalGrid onSelectDate={(key) => { setSelDate(key); setSelSlot(null); setShowSlots(true); }} />
                </div>
                <div className="booking-slots">
                  <SlotList
                    onSelectSlot={(slot) => { setSelSlot(slot); setBookStep(2); }}
                    onBack={() => setShowSlots(false)}
                  />
                </div>
              </div>
            </div>
          )}

          {bookStep === 2 && (
            <div className="booking-step">
              <h3 className="booking-form-title">Enter Details</h3>
              <div className="booking-fields">
                <div className="booking-row">
                  <div className="booking-field">
                    <label htmlFor="bFN">First Name *</label>
                    <input id="bFN" type="text" className="booking-input" placeholder="First Name" autoComplete="given-name" value={firstName} onChange={e => setFirstName(e.target.value)} />
                  </div>
                  <div className="booking-field">
                    <label htmlFor="bLN">Last Name</label>
                    <input id="bLN" type="text" className="booking-input" placeholder="Last Name" autoComplete="family-name" value={lastName} onChange={e => setLastName(e.target.value)} />
                  </div>
                </div>
                <div className="booking-row">
                  <div className="booking-field">
                    <label htmlFor="bPh">Phone</label>
                    <input id="bPh" type="tel" className="booking-input" placeholder="Phone" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} />
                  </div>
                  <div className="booking-field">
                    <label htmlFor="bEm">Email *</label>
                    <input id="bEm" type="email" className="booking-input" placeholder="Email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                </div>
              </div>
              {consentLabel && (
                <label className="booking-consent">
                  <input type="checkbox" checked={consented} onChange={e => setConsented(e.target.checked)} />
                  <span>{consentLabel}</span>
                </label>
              )}
              {bookError && (
                <p style={{ fontSize: 13, color: "var(--error)", marginBottom: 8 }}>{bookError}</p>
              )}
              <div className="booking-actions">
                <button type="button" className="booking-back-btn" onClick={() => setBookStep(1)}>← Back</button>
                <button type="button" className="btn-primary booking-submit-btn" onClick={handleBook} disabled={!canBook || loading}>
                  {loading ? "Booking…" : "Book My Call"}
                  {!loading && (
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M3.75 9H14.25M14.25 9L9 3.75M14.25 9L9 14.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MOBILE
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="booking-mob">
        <div className="booking-mob-top">
          <div className="booking-left-icon" style={{ width: 42, height: 42, borderRadius: 10, flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 26 26" fill="none">
              <circle cx="13" cy="13" r="10" stroke="#2679F6" strokeWidth="1.5"/>
              <path d="M13 7.5V13L16.5 15.5" stroke="#2679F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="booking-mob-meta">
            <h2 className="booking-left-title" style={{ fontSize: 17 }}>{calendarName}</h2>
            <div className="booking-meta-row" style={{ marginTop: 2 }}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5.5" stroke="#62748E" strokeWidth="1.2"/>
                <path d="M7 4V7L9 8.5" stroke="#62748E" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>{slotDuration} minutes</span>
            </div>
          </div>
        </div>

        {selDate && selSlot ? (
          <div className="booking-mob-selected">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1.5" y="2.5" width="11" height="10" rx="1.5" stroke="#2679F6" strokeWidth="1.2"/>
              <path d="M4.5 1.5V4M9.5 1.5V4M1.5 6H12.5" stroke="#2679F6" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <span>{selectedDateLabel} · {selSlot.display}</span>
          </div>
        ) : (
          <p className="booking-mob-hint">Pick a date and time for your {slotDuration}-minute onboarding call.</p>
        )}

        <button type="button" className="btn-primary" onClick={() => setSheetOpen(true)}>
          {selDate && selSlot ? "Change time" : "Select a time"}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {selDate && selSlot && (
          <>
            <div className="ob-divider" style={{ margin: "4px 0" }} />
            <div className="booking-fields">
              <div className="booking-row" style={{ flexDirection: "column", gap: 12 }}>
                <div className="booking-field">
                  <label htmlFor="mbFN">First Name *</label>
                  <input id="mbFN" type="text" className="booking-input" placeholder="First Name" autoComplete="given-name" value={firstName} onChange={e => setFirstName(e.target.value)} />
                </div>
                <div className="booking-field">
                  <label htmlFor="mbLN">Last Name</label>
                  <input id="mbLN" type="text" className="booking-input" placeholder="Last Name" autoComplete="family-name" value={lastName} onChange={e => setLastName(e.target.value)} />
                </div>
              </div>
              <div className="booking-row" style={{ flexDirection: "column", gap: 12 }}>
                <div className="booking-field">
                  <label htmlFor="mbPh">Phone</label>
                  <input id="mbPh" type="tel" className="booking-input" placeholder="Phone" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
                <div className="booking-field">
                  <label htmlFor="mbEm">Email *</label>
                  <input id="mbEm" type="email" className="booking-input" placeholder="Email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
              </div>
            </div>
            {consentLabel && (
              <label className="booking-consent">
                <input type="checkbox" checked={consented} onChange={e => setConsented(e.target.checked)} />
                <span>{consentLabel}</span>
              </label>
            )}
            {bookError && (
              <p style={{ fontSize: 13, color: "var(--error)" }}>{bookError}</p>
            )}
            <button type="button" className="btn-primary" onClick={handleBook} disabled={!canBook || loading}>
              {loading ? "Booking…" : "Book My Call"}
              {!loading && (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MOBILE — bottom sheet
      ════════════════════════════════════════════════════════════════════════ */}
      <div
        className={`bsheet-overlay${sheetOpen ? " is-open" : ""}`}
        onClick={() => { setSheetOpen(false); setSheetSlots(false); }}
      />
      <div className={`bsheet${sheetOpen ? " is-open" : ""}`}>
        <div className="bsheet-drag" />
        <div className="bsheet-head">
          <span className="bsheet-title">Choose a time</span>
          <button type="button" className="bsheet-close" onClick={() => { setSheetOpen(false); setSheetSlots(false); }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 11L11 3M3 3L11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="bsheet-body">
          <div className={`bsheet-area${sheetSlots ? " show-slots" : ""}`}>
            <div className="bsheet-cal-panel">
              <CalGrid
                onSelectDate={(key) => {
                  setSelDate(key);
                  setSelSlot(null);
                  setSheetSlots(true);
                }}
              />
            </div>
            <div className="bsheet-slots-panel">
              <button
                type="button"
                className="booking-slots-back"
                style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, fontSize: 13, color: "#62748e", letterSpacing: "-0.3px", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                onClick={() => setSheetSlots(false)}
              >
                ← Change date
              </button>
              {selDate && (
                <>
                  <p className="booking-slots-title" style={{ marginBottom: 10 }}>{selectedDateLabel}</p>
                  <div className="slots-list" style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
                    {(slotsData[selDate] ?? []).map(slot => (
                      <button
                        key={slot.startIso}
                        type="button"
                        className={`slot-btn${selSlot?.startIso === slot.startIso ? " slot-btn--selected" : ""}`}
                        onClick={() => {
                          setSelSlot(slot);
                          setSheetOpen(false);
                          setSheetSlots(false);
                        }}
                      >
                        {slot.display}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
