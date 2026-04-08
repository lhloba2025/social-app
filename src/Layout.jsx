import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";

// Pages where the sidebar should be hidden (they have their own full-screen UI)
const SIDEBAR_HIDDEN_PATHS = [];

export default function Layout({ children }) {
  const [language, setLanguage] = useState(
    () => localStorage.getItem("appLanguage") || "ar"
  );
  const location = useLocation();
  const hideSidebar = SIDEBAR_HIDDEN_PATHS.includes(location.pathname);

  return (
    <div className={`flex h-screen overflow-hidden bg-slate-950 ${language === "ar" ? "dir-rtl" : ""}`} dir={language === "ar" ? "rtl" : "ltr"}>
      {!hideSidebar && <Sidebar language={language} onLanguageChange={setLanguage} />}
      <main className="flex-1 overflow-hidden">
        {React.cloneElement(children, { language, onLanguageChange: setLanguage })}
      </main>
    </div>
  );
}