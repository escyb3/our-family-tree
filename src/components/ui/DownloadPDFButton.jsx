import React from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function DownloadPDFButton({ elementId, fileName = "family-tree.pdf" }) {
  const handleDownload = async () => {
    const input = document.getElementById(elementId);
    if (!input) return alert("לא נמצא אילן יוחסין לייצוא");

    const canvas = await html2canvas(input);
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [canvas.width, canvas.height] });
    pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
    pdf.save(fileName);
  };

  return (
    <button
      onClick={handleDownload}
      className="bg-blue-600 text-white font-semibold px-4 py-2 rounded-xl shadow hover:bg-blue-700"
    >
      הורד כ-PDF
    </button>
  );
}
