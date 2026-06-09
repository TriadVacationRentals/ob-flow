type Props = {
  current: number; // 0-indexed
};

const STEPS = ["Sign Agreement", "Pay Fee", "Book Call"];

export default function StepIndicator({ current }: Props) {
  return (
    <div className="stepper">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div
            key={i}
            className={`stepper-item${active ? " active" : ""}${done ? " done" : ""}`}
          >
            <div className="stepper-dot">
              {done ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span className="stepper-label">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
