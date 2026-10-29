import { model, models, Schema, Model, Document } from "mongoose";
import { normalizeCompanySubrole } from "@/lib/company-rbac";

// Base User Interface
export interface IUserBase extends Document {
  email: string;
  password?: string;
  role: "student" | "company" | "college";
  // OAuth fields (common to all)
  googleId?: string;
  githubId?: string;
  image_url?: string;
  address?: string;
  phoneNumber?: string;
  // Unique API token for external backend authentication
  accessToken?: string;
  accessTokencreated_at?: Date;
  created_at: Date;
  updated_at: Date;
  notificationPreferences?: {
    email: boolean;
    taskEmails: boolean;
    reviewEmails: boolean;
    projectEmails: boolean;
    assessmentEmails: boolean;
  };
}

// Student-specific interface
export interface IStudent extends IUserBase {
  role: "student";
  full_name: string;
  username?: string;
  isVerified?: boolean;
  googleRefreshToken?: string;
  headline?: string;
  bio?: string;
  skills?: string[];
  socialLinks?: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    website?: string;
  };
  profile_picture?: string;
  resume?: string;
  education?: {
    degree?: string;
    fieldOfStudy?: string;
    institution?: string;
    graduationYear?: string;
    gpa?: string;
  };
  experience?: {
    level?: "fresher" | "1-2 years" | "2-5 years" | "5+ years";
    previousInternships?: Array<{
      id: string;
      companyName: string;
      position: string;
      duration: string;
      description?: string;
      skills?: string[];
      addedDate: Date;
    }>;
    projects?: Array<{
      id: string;
      title: string;
      description: string;
      technologies: string[];
      link?: string;
      githubLink?: string;
      status: "completed" | "in-progress" | "planned";
      addedDate: Date;
    }>;
  };
  careerGoals?: {
    preferredRole?: string;
    industries?: string[];
    workMode?: "remote" | "hybrid" | "onsite" | "flexible";
    careerObjective?: string;
  };
  preferences?: {
    internshipDuration?: string;
    availability?: string;
    willingToRelocate?: boolean;
  };
  profileCompleteness?: number;
  githubToken?: string;
}

// Company-specific interface
export interface ICompany extends IUserBase {
  isVerified: boolean;
  role: "company";
  companyName: string;
  industry: string;
  contactPersonName: string;
  designation: "HR" | "Recruiter" | "Founder" | "Manager";
  companyDescription?: string;
  industryType?: string;
  companySize?: "1-10" | "11-50" | "51-200" | "201-500" | "501-1000" | "1000+";
  headquartersLocation?: string;
  officialWebsite?: string;
  linkedinProfile?: string;
  contactPersonEmail?: string;
  contactPersonPhone?: string;
  hiringRolesOffered?: string[];
  internshipAvailable?: boolean;
  placementPartnership?: boolean;
  // Company team members (for invites and subroles)
  socialLinks?: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    website?: string;
  };
  members?: Array<{
    user_id?: string;
    email: string;
    subrole: "owner" | "admin" | "manager" | "trainee";
    status: "invited" | "active";
    invitedAt?: Date;
    joinedAt?: Date;
    inviteToken?: string;
  }>;
}

// College-specific interface
export interface ICollege extends IUserBase {
  isVerified: boolean;
  role: "college";
  collegeName: string;
  collegeType:
    | "Engineering College"
    | "University"
    | "Polytechnic"
    | "School / Other";
  contactPersonName: string;
  designation: "TPO / Placement Officer" | "Faculty" | "Admin";
  collegeDescription?: string;
  affiliatedUniversity?: string;
  accreditation?: string[];
  campusLocation?: string;
  officialWebsite?: string;
  placementCellEmail?: string;
  placementCellPhone?: string;
  coursesOffered?: string[];
  totalStudents?: number;
  averagePlacementRate?: number;
  topRecruiters?: string[];
  internshipSupport?: boolean;
  socialLinks?: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    website?: string;
  };
}

// Union type for all user types
export type IUser = IStudent | ICompany | ICollege;

// Base User Schema with common fields
const UserBaseSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: false,
    },
    role: {
      type: String,
      enum: ["student", "company", "college"],
      required: true,
    },
    // OAuth fields (common to all)
    googleId: {
      type: String,
      required: false,
      sparse: true,
    },
    githubId: {
      type: String,
      required: false,
      sparse: true,
    },
    image_url: {
      type: String,
      default: "",
    },
    address: {
      type: String,
      default: "",
    },
    phoneNumber: {
      type: String,
      default: "",
    },
    notificationPreferences: {
      type: Schema.Types.Mixed,
      default: {
        email: true,
        taskEmails: true,
        reviewEmails: true,
        projectEmails: true,
        assessmentEmails: true,
      },
    },
    // Unique API token for external backend authentication
    accessToken: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    accessTokencreated_at: {
      type: Date,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    discriminatorKey: "role",
  },
);

// Student Schema (extends base)
const StudentSchema = new Schema({
  full_name: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: false,
  },
  githubToken: {
    type: String,
    required: false,
    default: "",
  },
  googleRefreshToken: {
    type: String,
    required: false,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  headline: {
    type: String,
    default: "",
  },
  bio: {
    type: String,
    default: "",
  },
  profile_picture: {
    type: String,
    default: "",
  },
  socialLinks: {
    github: {
      type: String,
      default: "",
    },
    linkedin: {
      type: String,
      default: "",
    },
    twitter: {
      type: String,
      default: "",
    },
    website: {
      type: String,
      default: "",
    },
  },
  skills: {
    type: [String],
    default: [],
  },
  resume: {
    type: String,
    default: "",
  },
  education: {
    degree: {
      type: String,
      default: "",
    },
    fieldOfStudy: {
      type: String,
      default: "",
    },
    institution: {
      type: String,
      default: "",
    },
    graduationYear: {
      type: String,
      default: "",
    },
    gpa: {
      type: String,
      default: "",
    },
  },
  experience: {
    level: {
      type: String,
      enum: ["fresher", "1-2 years", "2-5 years", "5+ years"],
      default: "fresher",
    },
    previousInternships: [
      {
        id: {
          type: String,
          required: true,
        },
        companyName: {
          type: String,
          required: true,
        },
        position: {
          type: String,
          required: true,
        },
        duration: {
          type: String,
          required: true,
        },
        description: {
          type: String,
          default: "",
        },
        skills: {
          type: [String],
          default: [],
        },
        addedDate: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    projects: [
      {
        id: {
          type: String,
          required: true,
        },
        title: {
          type: String,
          required: true,
        },
        description: {
          type: String,
          required: true,
        },
        technologies: {
          type: [String],
          default: [],
        },
        link: {
          type: String,
          default: "",
        },
        githubLink: {
          type: String,
          default: "",
        },
        status: {
          type: String,
          enum: ["completed", "in-progress", "planned"],
          default: "completed",
        },
        addedDate: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  careerGoals: {
    preferredRole: {
      type: String,
      default: "",
    },
    industries: {
      type: [String],
      default: [],
    },
    workMode: {
      type: String,
      enum: ["remote", "hybrid", "onsite", "flexible"],
      default: "flexible",
    },
    careerObjective: {
      type: String,
      default: "",
    },
  },
  preferences: {
    internshipDuration: {
      type: String,
      default: "",
    },
    availability: {
      type: String,
      default: "",
    },
    willingToRelocate: {
      type: Boolean,
      default: false,
    },
  },
  profileCompleteness: {
    type: Number,
    required: false,
    default: function () {
      return 22;
    },
  },
});

// Company Schema (extends base)
const CompanySchema = new Schema({
  members: [
    {
      user_id: { type: Schema.Types.ObjectId, ref: "User" },
      email: { type: String, required: true },
      subrole: {
        type: String,
        enum: ["owner", "admin", "manager", "trainee"],
        default: "trainee",
        set: (value: unknown) => normalizeCompanySubrole(value),
      },
      status: { type: String, enum: ["invited", "active"], default: "invited" },
      invitedAt: { type: Date, default: Date.now },
      joinedAt: { type: Date },
      inviteToken: { type: String },
    },
  ],
  isVerified: {
    type: Boolean,
    default: false,
  },
  companyName: {
    type: String,
    required: true,
  },
  industry: {
    type: String,
    required: true,
  },
  contactPersonName: {
    type: String,
    required: true,
  },
  designation: {
    type: String,
    enum: ["HR", "Recruiter", "Founder", "Manager"],
    required: true,
  },
  companyDescription: {
    type: String,
    default: "",
  },
  industryType: {
    type: String,
    default: "",
  },
  companySize: {
    type: String,
    enum: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"],
    default: "1-10",
    set: function (value: string) {
      return value === "" ? "1-10" : value;
    },
  },
  headquartersLocation: {
    type: String,
    default: "",
  },
  officialWebsite: {
    type: String,
    default: "",
  },
  linkedinProfile: {
    type: String,
    default: "",
  },
  contactPersonEmail: {
    type: String,
    default: "",
  },
  contactPersonPhone: {
    type: String,
    default: "",
  },
  hiringRolesOffered: {
    type: [String],
    default: [],
  },
  internshipAvailable: {
    type: Boolean,
    default: false,
  },
  placementPartnership: {
    type: Boolean,
    default: false,
  },
  socialLinks: {
    github: {
      type: String,
      default: "",
    },
    linkedin: {
      type: String,
      default: "",
    },
    twitter: {
      type: String,
      default: "",
    },
    website: {
      type: String,
      default: "",
    },
  },
});

CompanySchema.pre("validate", function normalizeLegacyMemberRoles(next) {
  const members = (this as { members?: Array<{ subrole?: unknown }> }).members;
  if (Array.isArray(members)) {
    members.forEach((member) => {
      member.subrole = normalizeCompanySubrole(member.subrole);
    });
  }
  next();
});

// College Schema (extends base)
const CollegeSchema = new Schema({
  isVerified: {
    type: Boolean,
    default: false,
  },
  collegeName: {
    type: String,
    required: true,
  },
  collegeType: {
    type: String,
    enum: [
      "Engineering College",
      "University",
      "Polytechnic",
      "School / Other",
    ],
    required: true,
  },
  contactPersonName: {
    type: String,
    required: true,
  },
  designation: {
    type: String,
    enum: ["TPO / Placement Officer", "Faculty", "Admin"],
    required: true,
  },
  collegeDescription: {
    type: String,
    default: "",
  },
  affiliatedUniversity: {
    type: String,
    default: "",
  },
  accreditation: {
    type: [String],
    default: [],
  },
  campusLocation: {
    type: String,
    default: "",
  },
  officialWebsite: {
    type: String,
    default: "",
  },
  placementCellEmail: {
    type: String,
    default: "",
  },
  placementCellPhone: {
    type: String,
    default: "",
  },
  coursesOffered: {
    type: [String],
    default: [],
  },
  totalStudents: {
    type: Number,
    default: 0,
  },
  averagePlacementRate: {
    type: Number,
    default: 0,
  },
  topRecruiters: {
    type: [String],
    default: [],
  },
  internshipSupport: {
    type: Boolean,
    default: false,
  },
  socialLinks: {
    github: {
      type: String,
      default: "",
    },
    linkedin: {
      type: String,
      default: "",
    },
    twitter: {
      type: String,
      default: "",
    },
    website: {
      type: String,
      default: "",
    },
  },
});

// Create base model
const User =
  models && models.User
    ? (models.User as Model<IUser>)
    : model<IUser>("User", UserBaseSchema);

// Create discriminators only if they don't exist
let Student: Model<IStudent>;
let Company: Model<ICompany>;
let College: Model<ICollege>;

// Check if Student discriminator already exists
if (models && models.Student) {
  Student = models.Student as Model<IStudent>;
} else if (User.discriminators && User.discriminators["student"]) {
  Student = User.discriminators["student"] as Model<IStudent>;
} else {
  Student = User.discriminator<IStudent>("student", StudentSchema);
}

// Check if Company discriminator already exists
if (models && models.Company) {
  Company = models.Company as Model<ICompany>;
} else if (User.discriminators && User.discriminators["company"]) {
  Company = User.discriminators["company"] as Model<ICompany>;
} else {
  Company = User.discriminator<ICompany>("company", CompanySchema);
}

// Check if College discriminator already exists
if (models && models.College) {
  College = models.College as Model<ICollege>;
} else if (User.discriminators && User.discriminators["college"]) {
  College = User.discriminators["college"] as Model<ICollege>;
} else {
  College = User.discriminator<ICollege>("college", CollegeSchema);
}

export { User, Student, Company, College };
