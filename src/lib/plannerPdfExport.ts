import jspdf from "jspdf";

type PlannerProject = {
  id: string;
  userId: string;
  title: string;
  description: string;
  createdAt: string;
  isPlanGenerated: boolean;
};

type PlannerMilestone = {
  title: string;
  timeline: string;
};

type PlannerTask = {
  title: string;
  description: string;
  subTasks?: {
    title: string;
    description: string;
    estimatedHours: number;
  }[];
};

type PlannerPlan = {
  id: string;
  summary: string;
  milestones: PlannerMilestone[];
  tasks: PlannerTask[];
  createdAt: string;
  updatedAt: string;
  usedFallback?: boolean;
};

const COLORS = {
  text: "#111827",
  textLight: "#6b7280",
  border: "#e5e7eb",
  accentBlue: "#3b82f6",
  accentBlueLite: "#eff6ff",
};

const FONTS = {
  normal: "Helvetica",
  bold: "Helvetica-Bold",
};

export async function exportPlanToPdf(
  project: PlannerProject,
  plan: PlannerPlan,
  filename: string = "project-plan.pdf",
) {
  const pdf = new jspdf({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  let yPosition = 20;
  const pageHeight = pdf.internal.pageSize.getHeight();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // Helper function to add new page with consistent formatting
  const addNewPage = () => {
    pdf.addPage();
    yPosition = 20;
  };

  // Helper function to check if we need a new page
  const checkPageBreak = (spaceNeeded: number) => {
    if (yPosition + spaceNeeded > pageHeight - 20) {
      addNewPage();
    }
  };

  // Helper function to add text with word wrapping
  const addTextWrapped = (
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    fontSize: number = 11,
    fontType: "normal" | "bold" = "normal",
  ) => {
    pdf.setFont(FONTS.normal, fontType === "bold" ? "bold" : "normal");
    pdf.setFontSize(fontSize);
    pdf.setTextColor(COLORS.text);

    const lines = pdf.splitTextToSize(text, maxWidth);
    pdf.text(lines, x, y);
    // Improved line height calculation with better spacing
    return y + lines.length * (fontSize * 0.4) + 2;
  };

  // 1. HEADER
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, 40, "F");
  pdf.setDrawColor(COLORS.accentBlue);
  pdf.setLineWidth(1);
  pdf.line(0, 40, pageWidth, 40);

  pdf.setFont(FONTS.bold, "bold");
  pdf.setFontSize(24);
  pdf.setTextColor(COLORS.accentBlue);
  pdf.text("Kiyo", margin, 15);

  pdf.setFont(FONTS.normal, "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(COLORS.textLight);
  pdf.text("AI-Powered Project Manager", margin, 23);
  pdf.text("https://kiyoai.in", margin, 29);

  yPosition = 50;

  // 2. PROJECT DETAILS SECTION
  checkPageBreak(25);

  pdf.setFont(FONTS.bold, "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(COLORS.accentBlue);
  pdf.text("Project Details", margin, yPosition);
  yPosition += 8;

  pdf.setDrawColor(COLORS.border);
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  // Project title
  pdf.setFont(FONTS.bold, "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(COLORS.text);
  pdf.text("Title:", margin, yPosition);
  yPosition = addTextWrapped(
    project.title,
    margin + 30,
    yPosition,
    contentWidth - 25,
    11,
    "normal",
  );
  yPosition += 8;

  // Project description
  pdf.setFont(FONTS.bold, "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(COLORS.text);
  pdf.text("Description:", margin, yPosition);
  yPosition += 5;
  yPosition = addTextWrapped(
    project.description,
    margin + 5,
    yPosition,
    contentWidth - 5,
    10,
    "normal",
  );
  yPosition += 8;

  // Created date and status
  checkPageBreak(15);
  pdf.setFont(FONTS.normal, "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(COLORS.textLight);

  const createdDate = new Date(project.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  pdf.text(`Created: ${createdDate}`, margin, yPosition);
  pdf.text(
    `Status: ${project.isPlanGenerated ? "Plan Generated" : "Pending"}`,
    margin + 70,
    yPosition,
  );
  yPosition += 10;

  // 3. PLAN SUMMARY SECTION
  checkPageBreak(25);

  pdf.setFont(FONTS.bold, "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(COLORS.accentBlue);
  pdf.text("Plan Summary", margin, yPosition);
  yPosition += 8;

  pdf.setDrawColor(COLORS.border);
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  yPosition = addTextWrapped(
    plan.summary,
    margin + 5,
    yPosition,
    contentWidth - 5,
    11,
    "normal",
  );
  yPosition += 8;

  // 4. MILESTONES SECTION
  checkPageBreak(20);

  pdf.setFont(FONTS.bold, "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(COLORS.accentBlue);
  pdf.text("Project Milestones", margin, yPosition);
  yPosition += 8;

  pdf.setDrawColor(COLORS.border);
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  plan.milestones.forEach((milestone, index) => {
    checkPageBreak(14);

    pdf.setFont(FONTS.bold, "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(COLORS.text);
    pdf.text(`${index + 1}. ${milestone.title}`, margin + 5, yPosition);
    yPosition += 6;

    pdf.setFont(FONTS.normal, "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(COLORS.textLight);
    pdf.text(`Timeline: ${milestone.timeline}`, margin + 10, yPosition);
    yPosition += 8;
  });

  yPosition += 4;

  // 5. TASKS & SUBTASKS SECTION
  checkPageBreak(20);

  pdf.setFont(FONTS.bold, "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(COLORS.accentBlue);
  pdf.text("Tasks & Subtasks", margin, yPosition);
  yPosition += 8;

  pdf.setDrawColor(COLORS.border);
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  plan.tasks.forEach((task, taskIndex) => {
    checkPageBreak(18);

    // Task title
    pdf.setFont(FONTS.bold, "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(COLORS.text);
    pdf.text(`Task ${taskIndex + 1}: ${task.title}`, margin + 5, yPosition);
    yPosition += 6;

    // Task description
    pdf.setFont(FONTS.normal, "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(COLORS.text);
    yPosition = addTextWrapped(
      task.description,
      margin + 10,
      yPosition,
      contentWidth - 15,
      10,
      "normal",
    );
    yPosition += 6;

    // Subtasks
    if (task.subTasks && task.subTasks.length > 0) {
      pdf.setFont(FONTS.bold, "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(COLORS.accentBlue);
      pdf.text("Subtasks:", margin + 15, yPosition);
      yPosition += 5;

      task.subTasks.forEach((subTask, subTaskIndex) => {
        checkPageBreak(11);

        pdf.setFont(FONTS.normal, "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(COLORS.text);
        pdf.text(
          `${subTaskIndex + 1}. ${subTask.title}`,
          margin + 20,
          yPosition,
        );
        yPosition += 5;

        pdf.setFontSize(8);
        pdf.setTextColor(COLORS.textLight);
        yPosition = addTextWrapped(
          subTask.description,
          margin + 25,
          yPosition,
          contentWidth - 30,
          8,
          "normal",
        );

        pdf.setFont(FONTS.normal, "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(COLORS.textLight);
        pdf.text(`Est. ${subTask.estimatedHours}h`, margin + 25, yPosition);
        yPosition += 5;
      });

      yPosition += 3;
    }

    yPosition += 4;
  });

  // 6. FOOTER
  yPosition = pageHeight - 15;

  pdf.setFont(FONTS.normal, "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(COLORS.textLight);
  pdf.text(
    `Generated on ${new Date(plan.updatedAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`,
    margin,
    yPosition,
  );

  const pageCount = (pdf as any).internal.pages.length - 1;
  const pageCountText = `Page 1 of ${pageCount}`;
  const pageCountWidth = pdf.getTextWidth(pageCountText);
  pdf.text(pageCountText, pageWidth - margin - pageCountWidth, yPosition);

  // Download the PDF
  pdf.save(filename);
}
