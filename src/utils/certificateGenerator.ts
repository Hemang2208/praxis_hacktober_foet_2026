import jspdf from "jspdf";

interface UserData {
  full_name: string;
  email: string;
}

interface ProjectData {
  title: string;
  description: string;
  completionDate: Date;
  progress: number;
  technologies: string[];
}

export const generateCertificate = (
  userData: UserData,
  projectData: ProjectData,
) => {
  // Create new PDF instance in landscape orientation
  const pdf = new jspdf({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  // Set background color
  pdf.setFillColor(240, 248, 255); // Light blue background
  pdf.rect(0, 0, 297, 210, "F");

  // Add decorative border
  pdf.setDrawColor(30, 144, 255); // Dodger blue
  pdf.setLineWidth(2);
  pdf.rect(10, 10, 277, 190);

  pdf.setDrawColor(70, 130, 180); // Steel blue
  pdf.setLineWidth(1);
  pdf.rect(15, 15, 267, 180);

  // Title section
  pdf.setFontSize(36);
  pdf.setTextColor(25, 25, 112); // Midnight blue
  pdf.setFont("helvetica", "bold");
  pdf.text("CERTIFICATE OF COMPLETION", 148.5, 50, { align: "center" });

  // Subtitle
  pdf.setFontSize(16);
  pdf.setTextColor(70, 130, 180);
  pdf.setFont("helvetica", "normal");
  pdf.text("This is to certify that", 148.5, 65, { align: "center" });

  // User name
  pdf.setFontSize(28);
  pdf.setTextColor(220, 20, 60); // Crimson
  pdf.setFont("helvetica", "bold");
  pdf.text(userData.full_name.toUpperCase(), 148.5, 85, { align: "center" });

  // Has successfully completed
  pdf.setFontSize(16);
  pdf.setTextColor(70, 130, 180);
  pdf.setFont("helvetica", "normal");
  pdf.text("has successfully completed the project", 148.5, 100, {
    align: "center",
  });

  // Project title
  pdf.setFontSize(22);
  pdf.setTextColor(25, 25, 112);
  pdf.setFont("helvetica", "bold");
  const projectTitle =
    projectData.title.length > 40
      ? projectData.title.substring(0, 37) + "..."
      : projectData.title;
  pdf.text(`"${projectTitle}"`, 148.5, 120, { align: "center" });

  // Completion details
  // pdf.setFontSize(14);
  // pdf.setTextColor(70, 130, 180);
  // pdf.setFont('helvetica', 'normal');
  // pdf.text(`with ${projectData.progress}% completion rate`, 148.5, 135, { align: 'center' });

  const completionDate = projectData.completionDate.toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  );
  pdf.text(`Completed on: ${completionDate}`, 148.5, 150, { align: "center" });

  // Technologies used (if any)
  if (projectData.technologies && projectData.technologies.length > 0) {
    const techList = projectData.technologies.slice(0, 5).join(", ");
    pdf.setFontSize(12);
    pdf.text(`Technologies: ${techList}`, 148.5, 165, { align: "center" });
  }

  // Footer section
  pdf.setFontSize(12);
  pdf.setTextColor(105, 105, 105);
  pdf.setFont("helvetica", "italic");
  pdf.text("Kiyo Project Management System", 50, 185);
  pdf.text(`Certificate ID: ${generateCertificateId()}`, 50, 195);

  // Date of issue
  const issueDate = new Date().toLocaleDateString();
  pdf.text(`Date of Issue: ${issueDate}`, 220, 185);

  // Add decorative elements
  // Stars in corners
  pdf.setFillColor(255, 215, 0); // Gold
  drawStar(pdf, 30, 30, 8);
  drawStar(pdf, 267, 30, 8);
  drawStar(pdf, 30, 180, 8);
  drawStar(pdf, 267, 180, 8);

  // Save the PDF
  const fileName = `${userData.full_name.replace(/\s+/g, "_")}_Certificate_${projectData.title.replace(/\s+/g, "_")}.pdf`;
  pdf.save(fileName);
};

// Helper function to draw a star
const drawStar = (pdf: jspdf, x: number, y: number, size: number) => {
  const spikes = 5;
  const outerRadius = size;
  const innerRadius = size * 0.5;

  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;

  const points: number[] = [];

  for (let i = 0; i < spikes; i++) {
    points.push(x + Math.cos(rot) * outerRadius);
    points.push(y + Math.sin(rot) * outerRadius);
    rot += step;

    points.push(x + Math.cos(rot) * innerRadius);
    points.push(y + Math.sin(rot) * innerRadius);
    rot += step;
  }

  // Draw the star
  pdf.setFillColor(255, 215, 0); // Gold
  pdf.setDrawColor(255, 215, 0);

  // Create path for star
  for (let i = 0; i < points.length; i += 2) {
    if (i === 0) {
      pdf.lines([[0, 0]], points[i], points[i + 1]);
    }
  }

  // Simple circle as fallback for star
  pdf.circle(x, y, size / 2, "F");
};

// Generate unique certificate ID
const generateCertificateId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `KIYO-${timestamp}-${randomStr}`.toUpperCase();
};

export default generateCertificate;
