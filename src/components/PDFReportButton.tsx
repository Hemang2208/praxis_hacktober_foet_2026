import React from "react";
import { Button } from "@/components/ui/button";
import jspdf from "jspdf";

interface CohortData {
  name: string;
  totalStudents: number;
  avgScore: number;
  completionRate: number;
  selectedPct: number;
}

interface StudentData {
  name?: string;
  email?: string;
  avgScore: number;
  completionRate: number;
  selectedPct: number;
  skills?: { skill: string; strength: number }[];
}

interface PDFReportButtonProps {
  type: "cohort" | "student";
  data: CohortData | StudentData;
  label?: string;
}

export function PDFReportButton({ type, data, label }: PDFReportButtonProps) {
  const handleDownload = () => {
    const doc = new jspdf();
    if (type === "cohort" && isCohortData(data)) {
      doc.text(`Cohort Report: ${data.name}`, 10, 10);
      doc.text(`Total Students: ${data.totalStudents}`, 10, 20);
      doc.text(`Avg Score: ${data.avgScore}`, 10, 30);
      doc.text(`Completion Rate: ${data.completionRate}%`, 10, 40);
      doc.text(`Selected in Projects: ${data.selectedPct}%`, 10, 50);
      // Add more cohort details as needed
    } else if (type === "student" && isStudentData(data)) {
      doc.text(`Student Report: ${data.name || data.email || ""}`, 10, 10);
      doc.text(`Avg Score: ${data.avgScore}`, 10, 20);
      doc.text(`Completion Rate: ${data.completionRate}%`, 10, 30);
      doc.text(`Selected in Projects: ${data.selectedPct}%`, 10, 40);
      doc.text(
        `Skills: ${
          data.skills && data.skills.length > 0
            ? data.skills
                .map((s) => `${s.skill}: ${Math.round(s.strength)}`)
                .join(", ")
            : "None"
        }`,
        10,
        50,
      );
      // Add more student details as needed
    }
    doc.save(`${type}-report.pdf`);
  };

  function isCohortData(d: CohortData | StudentData): d is CohortData {
    return (d as CohortData).totalStudents !== undefined;
  }

  function isStudentData(d: CohortData | StudentData): d is StudentData {
    return (
      (d as StudentData).skills !== undefined ||
      (d as StudentData).email !== undefined
    );
  }

  return (
    <Button size="sm" variant="outline" onClick={handleDownload}>
      {label || `Download ${type === "cohort" ? "Cohort" : "Student"} PDF`}
    </Button>
  );
}
