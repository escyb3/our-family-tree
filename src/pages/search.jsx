import React, { useState } from "react";
import SearchBar from "@/components/SearchBar";
import SearchResults from "@/components/SearchResults";
import familyData from "@/data/ben_abou.json"; // החלף לפי הצד

export default function SearchPage() {
  const [results, setResults] = useState([]);

  const handleSearch = (query) => {
    const lower = query.toLowerCase();
    const filtered = familyData.filter((person) =>
      person.name?.toLowerCase().includes(lower) ||
      (person.birthDate && person.birthDate.includes(query)) ||
      (person.birthPlace && person.birthPlace.toLowerCase().includes(lower))
    );
    setResults(filtered);
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">🔎 חיפוש קרוב משפחה</h1>
      <SearchBar onSearch={handleSearch} />
      <SearchResults results={results} />
    </div>
  );
}
