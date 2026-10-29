import mongoose, { Document, Schema } from "mongoose";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/view-status";

export interface IApplication extends Document {
  full_name: string;
  position: string;
  expectedPackage?: string;
  area: string;
  contactInfo: {
    email: string;
    phone: string;
  };
  information: {
    position: string;
    experienceLevel: string;
    yearsOfExperience: string;
    expectedPackage?: string;
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
  privacyConsent: boolean;
  status: ApplicationStatus;
}

const ApplicationSchema: Schema = new Schema(
  {
    full_name: {
      type: String,
      required: true,
      trim: true,
    },
    position: {
      type: String,
      required: true,
      trim: true,
    },
    expectedPackage: {
      type: String,
      required: false,
      default: "",
      trim: true,
    },
    area: {
      type: String,
      required: true,
      trim: true,
    },
    contactInfo: {
      email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
      },
      phone: {
        type: String,
        required: true,
        trim: true,
      },
    },
    information: {
      position: {
        type: String,
        required: true,
        trim: true,
      },
      experienceLevel: {
        type: String,
        required: true,
        trim: true,
      },
      yearsOfExperience: {
        type: String,
        required: true,
        trim: true,
      },
      expectedPackage: {
        type: String,
        required: false,
        default: "",
        trim: true,
      },
      currentEmploymentStatus: {
        type: String,
        trim: true,
      },
      noticePeriod: {
        type: String,
        trim: true,
      },
    },
    links: {
      resumeURL: {
        type: String,
        required: true,
        trim: true,
      },
      linkedinURL: {
        type: String,
        required: true,
        trim: true,
      },
      githubURL: {
        type: String,
        required: false,
        default: "",
        trim: true,
      },
      portfolioURL: {
        type: String,
        default: "",
        required: false,
        trim: true,
      },
      showcaseURL: {
        type: String,
        required: false,
        default: "",
        trim: true,
      },
    },
    job: {
      skills: [
        {
          type: String,
          required: true,
        },
      ],
      coverLetter: {
        type: String,
        required: true,
        default: "",
        trim: true,
      },
      achievements: {
        type: String,
        required: false,
        default: "",
        trim: true,
      },
      message: {
        type: String,
        required: false,
        default: "",
        trim: true,
      },
    },
    privacyConsent: {
      type: Boolean,
      required: true,
    },
    status: {
      type: String,
      enum: APPLICATION_STATUSES,
      default: "PENDING",
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

const Application =
  mongoose.models.Application ||
  mongoose.model<IApplication>("Application", ApplicationSchema);

export default Application;
