"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import StepIndicator from "@/components/StepIndicator";
import StepSign      from "@/components/StepSign";
import StepPay       from "@/components/StepPay";
import StepBook      from "@/components/StepBook";
import StepDone      from "@/components/StepDone";

type Calendar = {
  calendarId: string;
  calendarName: string;
  slotDuration: number;
  slotDurationUnit: string;
  description: string;
  consentLabel: string;
  formId: string | null;
};

type Lead = {
  name: string;
  email: string;
  contractUrl: string;
  paymentLink: string;
  calendar: Calendar | null;
};

export default function OnboardPage() {
  const { leadId } = useParams<{ leadId: string }>();
  const [lead, setLead]   = useState<Lead | null>(null);
  const [error, setError] = useState(false);
  const [step, setStep]   = useState(0);
  const [bookedSlot, setBookedSlot] = useState<{ date: string; time: string } | null>(null);

  useEffect(() => {
    fetch(`/api/lead/${leadId}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setLead)
      .catch(() => setError(true));
  }, [leadId]);

  if (error) {
    return (
      <main className="ob-page" style={{ justifyContent: "center" }}>
        <p style={{ color: "rgba(255,255,255,0.5)" }}>Lead not found.</p>
      </main>
    );
  }

  if (!lead) {
    return (
      <main className="ob-page" style={{ justifyContent: "center" }}>
        <div className="ob-spinner" />
      </main>
    );
  }

  const isDone = step === 3;

  return (
    <>
      <header className="ob-header">
        <div className="ob-logo">
          <Image src="/horse-white.svg" alt="Triad" width={46} height={30} priority />
        </div>
      </header>

      <main className="ob-page">
        {!isDone && <StepIndicator current={step} />}

        <div className="ob-stage">
          <div className={`ob-card${step === 2 ? " ob-card--wide" : ""}`}>
            {step === 0 && (
              <StepSign
                leadName={lead.name}
                contractUrl={lead.contractUrl}
                onComplete={() => setStep(1)}
              />
            )}

            {step === 1 && (
              <StepPay leadEmail={lead.email} onComplete={() => setStep(2)} />
            )}

            {step === 2 && lead.calendar && (
              <StepBook
                leadName={lead.name}
                leadEmail={lead.email}
                calendar={lead.calendar}
                onComplete={(slot) => { setBookedSlot(slot); setStep(3); }}
              />
            )}

            {step === 2 && !lead.calendar && (
              <div style={{ padding: "40px 0", textAlign: "center", color: "rgba(255,255,255,0.5)" }}>
                No calendar assigned yet. Please contact your account manager.
              </div>
            )}

            {isDone && bookedSlot && (
              <StepDone leadName={lead.name} slot={bookedSlot} />
            )}
          </div>
        </div>
      </main>
    </>
  );
}
