import mongoose, { Document, Schema } from "mongoose";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/view-status";

export interface IInternship extends Document {
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
  privacyConsent: boolean;
  status: ApplicationStatus;
}

const InternshipSchema: Schema = new Schema(
  {
    full_name: {
      type: String,
      required: true,
      trim: true,
    },
    college: {
      type: String,
      required: true,
      trim: true,
    },
    contactInfo: {
      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },
      phone: {
        type: String,
        required: true,
        trim: true,
      },
    },
    information: {
      experience: {
        type: String,
        required: false,
        trim: true,
      },
      message: {
        type: String,
        required: true,
        trim: true,
      },
    },
    links: {
      linkedin: {
        type: String,
        required: true,
        trim: true,
      },
      resumeLink: {
        type: String,
        required: true,
        trim: true,
      },
      portfolioLink: {
        type: String,
        required: false,
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

const Internship =
  mongoose.models.Internship ||
  mongoose.model<IInternship>("Internship", InternshipSchema);

export default Internship;
