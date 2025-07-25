import React from "react";
import i18n from "i18next";

export default function LanguageSwitcher() {
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex gap-2 items-center justify-end text-sm p-2">
      <button
        onClick={() => changeLanguage("he")}
        className="px-3 py-1 rounded border hover:bg-gray-200 dark:hover:bg-gray-700"
      >
        עברית
      </button>
      <button
        onClick={() => changeLanguage("en")}
        className="px-3 py-1 rounded border hover:bg-gray-200 dark:hover:bg-gray-700"
      >
        English
      </button>
    </div>
  );
}
