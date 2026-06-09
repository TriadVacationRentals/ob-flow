"use client";

import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const APPEARANCE = {
  theme: "stripe" as const,
  variables: {
    colorPrimary:      "#2679f6",
    colorBackground:   "#ffffff",
    colorText:         "#2c3858",
    colorDanger:       "#ef4444",
    fontFamily:        "Manrope, sans-serif",
    borderRadius:      "10px",
    fontSizeBase:      "13px",
    spacingUnit:       "4px",
  },
  rules: {
    ".Input": {
      border:     "1px solid rgba(64, 140, 255, 0.22)",
      background: "rgba(181, 201, 255, 0.14)",
      padding:    "10px 16px",
      boxShadow:  "none",
    },
    ".Input:focus": {
      border:    "1px solid #2679f6",
      boxShadow: "none",
    },
    ".Label": {
      color:      "#2679f6",
      fontWeight: "500",
    },
    ".Error": {
      fontSize: "12px",
    },
  },
};

const FONTS = [{ cssSrc: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500&display=swap" }];

type Props = {
  leadEmail?: string;
  onComplete: () => void;
};

function PayForm({ leadEmail, onComplete }: { leadEmail?: string; onComplete: () => void }) {
  const stripe   = useStripe();
  const elements = useElements();
  const [email,   setEmail]   = useState(leadEmail ?? "");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError("");

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? "Something went wrong.");
      setLoading(false);
      return;
    }

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
        payment_method_data: { billing_details: { email } },
      },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message ?? "Payment failed.");
      setLoading(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      onComplete();
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="ob-field" style={{ marginBottom: 16 }}>
        <label className="ob-label">Email</label>
        <input
          type="email"
          className="ob-input"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </div>

      <PaymentElement
        options={{
          fields:  { billingDetails: { email: "never" } },
          wallets: { link: "never" },
        }}
      />

      {error && (
        <p style={{ fontSize: 12, color: "#ef4444", marginTop: 10, letterSpacing: "-0.2px" }}>
          {error}
        </p>
      )}

      <button
        className="btn-primary"
        type="submit"
        disabled={!stripe || loading || !email}
        style={{ marginTop: 20 }}
      >
        {loading ? "Processing…" : "Complete Payment — $600"}
      </button>
    </form>
  );
}

export default function StepPay({ leadEmail, onComplete }: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/payment/intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: leadEmail }),
    })
      .then(r => r.json())
      .then(d => setClientSecret(d.clientSecret));
  }, [leadEmail]);

  return (
    <>
      <p className="ob-eyebrow">Step 2 of 3</p>
      <h1 className="ob-title">Professional Setup Fee</h1>
      <p className="ob-desc">
        This one-time fee covers your listing setup, photography coordination,
        and full channel optimization across Airbnb, VRBO, and direct booking.
      </p>

      <div className="ob-amount">
        <span className="ob-amount-currency">$</span>
        <span className="ob-amount-value">600</span>
        <span className="ob-amount-label">one-time</span>
      </div>

      {clientSecret ? (
        <Elements stripe={stripePromise} options={{ clientSecret, appearance: APPEARANCE, fonts: FONTS }}>
          <PayForm leadEmail={leadEmail} onComplete={onComplete} />
        </Elements>
      ) : (
        <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
          <div className="ob-spinner" />
        </div>
      )}
    </>
  );
}
