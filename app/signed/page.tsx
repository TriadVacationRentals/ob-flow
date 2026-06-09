"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function SignedPage() {
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    // Broadcast to parent tab (BroadcastChannel — works cross-tab, same origin)
    try {
      const ch = new BroadcastChannel("ghl-contract");
      ch.postMessage({ signed: true });
      ch.close();
    } catch {}

    // Also try postMessage to opener (desktop popup case)
    try { window.opener?.postMessage({ signed: true }, "*"); } catch {}

    // Attempt self-close after brief delay
    setTimeout(() => {
      try {
        window.close();
        setClosed(true);
      } catch {}
    }, 400);
  }, []);

  return (
    <div className="signed-page">
      <div className="signed-card">
        <Image src="/horse-white.svg" alt="Triad" width={40} height={26} priority />

        <div className="signed-check">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="13" stroke="#22c55e" strokeWidth="1.5"/>
            <path d="M8.5 14l4 4 7-8" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h1 className="signed-title">Contract Signed</h1>
        <p className="signed-desc">
          {closed
            ? "You're all set."
            : "You can close this tab and continue your onboarding."}
        </p>
      </div>
    </div>
  );
}
