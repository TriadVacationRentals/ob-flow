import Image from "next/image";

export default function Home() {
  return (
    <main className="ob-page" style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <Image src="/horse-white.svg" alt="Triad" width={48} height={32} priority />
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, letterSpacing: "-0.2px", maxWidth: 320 }}>
          Please use the personalized link sent to you by your account manager.
        </p>
      </div>
    </main>
  );
}
