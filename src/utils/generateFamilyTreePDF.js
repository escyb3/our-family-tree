// 📄 generateFamilyTreePDF.js
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default async function generateFamilyTreePDF(elementId = "family-tree") {
  const element = document.getElementById(elementId);
  if (!element) throw new Error("Element not found");

  const canvas = await html2canvas(element);
  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF({ orientation: "landscape" });
  const width = pdf.internal.pageSize.getWidth();
  const height = pdf.internal.pageSize.getHeight();
  pdf.addImage(imgData, "PNG", 0, 0, width, height);
  pdf.save("family-tree.pdf");
}
