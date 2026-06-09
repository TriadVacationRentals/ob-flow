type Props = {
  leadName: string;
  slot: { date: string; time: string };
};

export default function StepDone({ leadName, slot }: Props) {
  const dateLabel = new Date(slot.date + "T12:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <div className="done-wrap">
      <div className="done-icon">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M4 10L8 14L16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <h1 className="done-title">You&apos;re all set, {leadName.split(" ")[0]}.</h1>

      <p className="done-sub">
        Your onboarding is complete. Our team will be in touch before your call
        with a short property questionnaire.
      </p>

      <div className="done-detail">
        {dateLabel} · {slot.time}
      </div>

      <div className="ob-divider" style={{ width: "100%" }} />

      <p style={{ fontSize: 13, color: "#62748e", letterSpacing: "-0.2px", lineHeight: 1.6 }}>
        Management agreement signed · Setup fee paid · Call scheduled
      </p>
    </div>
  );
}
