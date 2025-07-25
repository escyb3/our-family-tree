import React from "react";

export default function SearchResults({ results }) {
  if (!results || results.length === 0) return <p className="p-4">לא נמצאו תוצאות</p>;

  return (
    <div className="p-4">
      <h3 className="text-xl font-semibold mb-2">תוצאות:</h3>
      <ul className="space-y-1">
        {results.map((person) => (
          <li key={person.id}>
            <a href={`/profile.html?id=${person.id}`} className="text-blue-600 hover:underline">
              {person.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
