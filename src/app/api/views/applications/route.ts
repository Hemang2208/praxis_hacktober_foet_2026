import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import {
  APPLICATION_STATUSES,
  CONTACT_STATUSES,
  type ApplicationStatus,
  type ContactStatus,
  type ViewEntityType,
} from "@/lib/view-status";
import Application from "@/models/Application";
import Internship from "@/models/Internship";
import Contact from "@/models/Contact";

interface JobApplication {
  _id: string;
  full_name: string;
  position: string;
  expectedPackage: string;
  area: string;
  contactInfo: {
    email: string;
    phone: string;
  };
  information: {
    position: string;
    experienceLevel: string;
    yearsOfExperience: string;
    expectedPackage: string;
    currentEmploymentStatus?: string;
    noticePeriod?: string;
  };
  links: {
    resumeURL: string;
    linkedinURL: string;
    githubURL?: string;
    portfolioURL?: string;
    showcaseURL?: string;
  };
  job: {
    skills: string[];
    coverLetter: string;
    achievements?: string;
    message?: string;
  };
  status: ApplicationStatus;
  created_at: string;
}

interface InternApplication {
  _id: string;
  full_name: string;
  college: string;
  contactInfo: {
    email: string;
    phone: string;
  };
  information: {
    experience?: string;
    message: string;
  };
  links: {
    linkedin: string;
    resumeLink: string;
    portfolioLink?: string;
  };
  status: ApplicationStatus;
  created_at: string;
}

interface ContactSubmission {
  _id: string;
  full_name: string;
  email: string;
  message: string;
  status: ContactStatus;
  created_at: string;
}

interface ApplicationsData {
  jobApplications: JobApplication[];
  internApplications: InternApplication[];
  contacts: ContactSubmission[];
  totalJobs: number;
  totalInterns: number;
  totalContacts: number;
  total: number;
}

export async function GET() {
  try {
    await dbConnect();

    // Fetch both job applications and internship applications
    // @ts-expect-error - Mongoose model union type issue
    const jobApplications = await Application.find({}).sort({ created_at: -1 });
    // @ts-expect-error - Mongoose model union type issue
    const internApplications = await Internship.find({}).sort({
      created_at: -1,
    });
    // @ts-expect-error - Mongoose model union type issue
    const contacts = await Contact.find({}).sort({ created_at: -1 });

    const responseData: ApplicationsData = {
      jobApplications,
      internApplications,
      contacts,
      totalJobs: jobApplications.length,
      totalInterns: internApplications.length,
      totalContacts: contacts.length,
      total:
        jobApplications.length + internApplications.length + contacts.length,
    };

    return NextResponse.json(
      {
        success: true,
        data: responseData,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching applications:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch applications",
      },
      { status: 500 },
    );
  }
}

interface UpdateStatusBody {
  id?: string;
  entityType?: ViewEntityType;
  status?: string;
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as UpdateStatusBody;
    const { id, entityType, status } = body;

    if (!id || !entityType || !status) {
      return NextResponse.json(
        {
          success: false,
          error: "id, entityType, and status are required",
        },
        { status: 400 },
      );
    }

    await dbConnect();

    if (entityType === "contact") {
      if (!CONTACT_STATUSES.includes(status as ContactStatus)) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid contact status",
          },
          { status: 400 },
        );
      }

      // @ts-expect-error - Mongoose model union type issue
      const updatedContact = await Contact.findByIdAndUpdate(
        id,
        { status },
        { new: true, runValidators: true },
      );

      if (!updatedContact) {
        return NextResponse.json(
          {
            success: false,
            error: "Contact not found",
          },
          { status: 404 },
        );
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            id,
            entityType,
            status: updatedContact.status,
          },
        },
        { status: 200 },
      );
    }

    if (!APPLICATION_STATUSES.includes(status as ApplicationStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid application status",
        },
        { status: 400 },
      );
    }

    const model = entityType === "job" ? Application : Internship;

    // @ts-expect-error - Mongoose model union type issue
    const updatedApplication = await model.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true },
    );

    if (!updatedApplication) {
      return NextResponse.json(
        {
          success: false,
          error: `${entityType === "job" ? "Job" : "Intern"} application not found`,
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id,
          entityType,
          status: updatedApplication.status,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating status:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update status",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    let password: string | undefined;

    try {
      const body = (await request.json()) as { password?: string };
      password = body?.password;
    } catch {
      console.log(
        "No JSON body or invalid JSON, falling back to query parameters",
      );
    }

    if (!password) {
      const { searchParams } = new URL(request.url);
      password = searchParams.get("pass") ?? undefined;
    }

    const correctPassword = process.env.ADMIN_VIEW_PASSWORD;

    if (password === correctPassword) {
      return NextResponse.json({ success: true, authorized: true });
    } else {
      return NextResponse.json({ success: true, authorized: false });
    }
  } catch (error) {
    console.error("Auth verification error:", error);
    return NextResponse.json({ success: false, authorized: false });
  }
}
