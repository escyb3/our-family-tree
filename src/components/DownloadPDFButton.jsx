// File: src/components/DownloadPDFButton.jsx

import React from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function DownloadPDFButton({ people }) {
  const generatePDF = () => {
    const doc = new jsPDF({ orientation: "portrait" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(16);
    doc.text("משפחתנו - אילן יוחסין", 105, 20, { align: "center" });

    const tableData = people.map((person, index) => [
      index + 1,
      person.name,
      person.gender === "M" ? "זכר" : "נקבה",
      person.birthDate || "",
      person.deathDate || "",
      person.spouse?.name || "",
      (person.children || []).map(c => c.name).join(", ")
    ]);

    autoTable(doc, {
      head: [["#", "שם", "מין", "לידה", "פטירה", "בן/בת זוג", "ילדים"]],
      body: tableData,
      styles: { font: "helvetica" },
      startY: 30,
      theme: "grid",
      margin: { top: 10 },
    });

    doc.save("family_tree.pdf");
  };

  return (
    <button
      onClick={generatePDF}
      className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
    >
      הורד PDF משפחתי
    </button>
  );
}
