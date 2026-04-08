import React from "react";
import { useNavigate } from "react-router-dom";
import DesignLibrary from "@/components/studio/DesignLibrary";

export default function DesignLibraryPage({ language: propLanguage }) {
  const navigate = useNavigate();
  const language = propLanguage || localStorage.getItem("appLanguage") || "ar";

  const handleOpen = (design) => {
    // Store design in sessionStorage then navigate to studio
    sessionStorage.setItem("studio_load_design", JSON.stringify(design));
    navigate("/DesignStudio");
  };

  const handleNew = () => {
    sessionStorage.removeItem("studio_load_design");
    navigate("/DesignStudio?new=1");
  };

  return <DesignLibrary language={language} onOpen={handleOpen} onNew={handleNew} />;
}