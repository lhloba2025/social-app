import React, { useState } from "react";
import Sidebar from "./components/Sidebar";

// Embed mode: when Hovera opens this app inside an iframe it passes ?t=<jwt>.
// We remember that (per-tab) and hide the app's own sidebar so the tool blends
// into Hovera's UI. Opening the app directly (no token) keeps the sidebar.
const isEmbedded = (() => {
  try {
    if (new URLSearchParams(window.location.search).get("t")) {
      sessionStorage.setItem("hovera_embed", "1");
    }
    return sessionStorage.getItem("hovera_embed") === "1";
  } catch {
    return false;
  }
})();

export default function Layout({ children }) {
  const [language, setLanguage] = useState(
    () => localStorage.getItem("appLanguage") || "ar"
  );

  return (
    <div className={`hv-app-bg flex h-screen overflow-hidden ${language === "ar" ? "dir-rtl" : ""}`} dir={language === "ar" ? "rtl" : "ltr"}>
      {!isEmbedded && <Sidebar language={language} onLanguageChange={setLanguage} />}
      <main className="flex-1 overflow-hidden">
        {React.cloneElement(children, { language, onLanguageChange: setLanguage })}
      </main>
    </div>
  );
}