"use client";

import { useState, useEffect, useRef } from "react";

type Props = {
  leadName: string;
  contractUrl: string;
  onComplete: () => void;
};

export default function StepSign({ leadName, contractUrl, onComplete }: Props) {
  const [opened, setOpened] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!opened) return;

    function advance() {
      if (completedRef.current) return;
      completedRef.current = true;
      onComplete();
    }

    let ch: BroadcastChannel | null = null;
    try {
      ch = new BroadcastChannel("ghl-contract");
      ch.onmessage = (e) => { if (e.data?.signed) advance(); };
    } catch {}

    function onMessage(e: MessageEvent) {
      if (e.data?.signed) advance();
    }
    window.addEventListener("message", onMessage);

    return () => {
      ch?.close();
      window.removeEventListener("message", onMessage);
    };
  }, [opened, onComplete]);

  function handleOpen() {
    const w = 960;
    const h = 700;
    const left = Math.round(window.screenX + (window.outerWidth - w) / 2);
    const top  = Math.round(window.screenY + (window.outerHeight - h) / 2);
    window.open(contractUrl, "ghl-contract", `width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes`);
    setOpened(true);
  }

  return (
    <>
      <p className="ob-eyebrow">Step 1 of 3</p>
      <h1 className="ob-title">Welcome, {leadName}</h1>
      <p className="ob-desc">
        To kick things off, please review and sign your management agreement.
        It outlines our responsibilities, fee structure, and what you can expect
        from our team.
      </p>

      <div className="ob-notice">
        <strong>What you&apos;re signing:</strong> A standard property management
        agreement authorizing Triad to list, market, and manage your short-term
        rental property on your behalf.
      </div>

      {opened && (
        <div className="ob-waiting">
          <div className="ob-waiting-dot" />
          <p>Waiting for your signature — this page will advance automatically once signed.</p>
        </div>
      )}

      {!opened ? (
        <button className="btn-primary" onClick={handleOpen}>
          Review &amp; Sign Agreement
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      ) : (
        <button className="btn-ghost" onClick={onComplete}>
          I&apos;ve signed — continue
        </button>
      )}
    </>
  );
}
