"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          padding: "2rem",
          textAlign: "center",
          background: "#FBFAF7",
          color: "#1C1B19",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        <h1 style={{ fontSize: "1.4rem", margin: 0, fontWeight: 600 }}>Something went wrong</h1>
        <p style={{ color: "#6A6862", margin: 0, fontSize: "0.9rem", maxWidth: "20rem" }}>
          The app hit an unexpected error. Reloading usually fixes it — your data is safe.
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: "1rem",
            padding: "0.65rem 1.25rem",
            borderRadius: "0.7rem",
            background: "#2B584C",
            color: "#fff",
            border: 0,
            fontSize: "0.9rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
