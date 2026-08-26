"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.5rem" }}>Something went wrong</h1>
        <p style={{ color: "#666", marginTop: "0.5rem" }}>The app hit an unexpected error.</p>
        <button
          onClick={reset}
          style={{ marginTop: "1.25rem", padding: "0.6rem 1rem", borderRadius: "0.75rem", background: "#2F5D50", color: "#fff", border: 0 }}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
