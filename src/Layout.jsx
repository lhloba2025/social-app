import React, { useState } from "react";
import Sidebar from "./components/Sidebar";

export default function Layout({ children }) {
  const [language, setLanguage] = useState(
    () => localStorage.getItem("appLanguage") || "ar"
  );

  return (
    <div className={`flex h-screen overflow-hidden bg-slate-950 ${language === "ar" ? "dir-rtl" : ""}`} dir={language === "ar" ? "rtl" : "ltr"}>
      <Sidebar language={language} onLanguageChange={setLanguage} />
      <main className="flex-1 overflow-hidden">
        {React.cloneElement(children, { language, onLanguageChange: setLanguage })}
      </main>
    </div>
  );
}