import React, { useState } from "react";

export default function SearchBar({ onSearch }) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-2">
      <input
        type="text"
        placeholder="חיפוש לפי שם, שנה או מקום"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="p-2 border rounded w-full"
      />
      <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
        חפש
      </button>
    </form>
  );
}
