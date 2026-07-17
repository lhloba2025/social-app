import React from "react";

// Header shown at the top of the public Privacy Policy and Terms pages.
// TikTok app review requires the app icon to be visible at the top of both
// pages, and the displayed name to match the app name exactly ("Hovera social App").
export default function LegalHeader({ title }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <img
          src="/hovera-icon-192.png"
          alt="Hovera social App"
          width={48}
          height={48}
          style={{ borderRadius: 12, flexShrink: 0 }}
        />
        <span style={{ color: "#fff", fontSize: 22, fontWeight: 800 }}>Hovera social App</span>
      </div>
      {title ? (
        <h1 style={{ color: "#fff", fontSize: 30, fontWeight: 800, marginTop: 16 }}>{title}</h1>
      ) : null}
    </div>
  );
}
