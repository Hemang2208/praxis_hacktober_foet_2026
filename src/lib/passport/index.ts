/**
 * Passport.js Configuration
 * Central configuration for all Passport strategies
 */

import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import {
  Strategy as GoogleStrategy,
  Profile as GoogleProfile,
} from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/dbConnect";
import {
  User,
  IUser,
  IStudent,
  College,
  ICollege,
  Company,
  ICompany,
} from "@/models/User";

// GitHub Profile interface (passport-github2 doesn't export Profile type)
interface GitHubProfile {
  id: string;
  displayName: string;
  username?: string;
  profileUrl?: string;
  emails?: Array<{ value: string }>;
  photos?: Array<{ value: string }>;
  provider: string;
  _json: Record<string, unknown>;
}

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || "changeme";

// OAuth Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "";
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

// Types for done callback
type DoneCallback = (
  error: Error | null,
  user?: Express.User | false,
  info?: { message: string },
) => void;

// JWT Strategy Options
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromExtractors([
    // Extract from cookie
    (req: { cookies?: { aipm_token?: string } }) => {
      if (req && req.cookies) {
        return req.cookies.aipm_token || null;
      }
      return null;
    },
    // Also support Authorization header
    ExtractJwt.fromAuthHeaderAsBearerToken(),
  ]),
  secretOrKey: JWT_SECRET,
};

/**
 * JWT Strategy
 * Validates JWT tokens from cookies or Authorization header
 */
passport.use(
  "jwt",
  new JwtStrategy(
    jwtOptions,
    async (
      payload: { id: string; role: string; email: string },
      done: DoneCallback,
    ) => {
      try {
        await dbConnect();

        let user: IUser | ICollege | ICompany | null = null;

        // Find user based on role
        switch (payload.role) {
          case "student":
            user = await User.findById(payload.id);
            break;
          case "college":
            user = await College.findById(payload.id);
            break;
          case "company":
            user = await Company.findById(payload.id);
            break;
          default:
            user = await User.findById(payload.id);
        }

        if (!user) {
          return done(null, false, { message: "User not found" });
        }

        return done(null, user);
      } catch (error) {
        return done(error as Error, false);
      }
    },
  ),
);

/**
 * Local Strategy for Student Login
 */
passport.use(
  "local-student",
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email: string, password: string, done: DoneCallback) => {
      try {
        await dbConnect();

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
          return done(null, false, { message: "Invalid credentials" });
        }

        // Only check isVerified for students
        if (user.role === "student" && !(user as IStudent).isVerified) {
          return done(null, false, {
            message: "Please verify your email before logging in",
          });
        }

        if (!user.password) {
          return done(null, false, {
            message: "Please login with your social account",
          });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Invalid credentials" });
        }

        return done(null, user);
      } catch (error) {
        return done(error as Error, false);
      }
    },
  ),
);

/**
 * Local Strategy for College Login
 */
passport.use(
  "local-college",
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email: string, password: string, done: DoneCallback) => {
      try {
        await dbConnect();

        const cleanEmail = email.trim().toLowerCase();
        const college = await College.findOne({
          email: { $regex: `^${cleanEmail}$`, $options: "i" },
        });
        if (!college) {
          return done(null, false, { message: "Invalid credentials" });
        }
        if (!college.isVerified) {
          return done(null, false, { message: "Please verify your email before logging in" });
        }
        const isMatch = await bcrypt.compare(password, college.password);
        if (!isMatch) {
          return done(null, false, { message: "Invalid credentials" });
        }
        return done(null, college);
      } catch (error) {
        return done(error as Error, false);
      }
    },
  ),
);

/**
 * Local Strategy for Company Login
 */
passport.use(
  "local-company",
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email: string, password: string, done: DoneCallback) => {
      try {
        await dbConnect();

        const cleanEmail = email.trim().toLowerCase();
        const company = await Company.findOne({
          email: { $regex: `^${cleanEmail}$`, $options: "i" },
        });
        if (!company) {
          return done(null, false, { message: "Invalid credentials" });
        }
        if (!company.isVerified) {
          return done(null, false, { message: "Please verify your email before logging in" });
        }
        const isMatch = await bcrypt.compare(password, company.password);
        if (!isMatch) {
          return done(null, false, { message: "Invalid credentials" });
        }
        return done(null, company);
      } catch (error) {
        return done(error as Error, false);
      }
    },
  ),
);

/**
 * Google OAuth Strategy for Students
 */
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(
    "google-student",
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: `${BASE_URL}/api/auth/oauth/google/callback`,
        scope: ["profile", "email"],
      },
      async (
        accessToken: string,
        refreshToken: string,
        profile: GoogleProfile,
        done: (error: Error | null, user?: Express.User | false) => void,
      ) => {
        try {
          await dbConnect();

          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(null, false);
          }

          // Check if user already exists
          let user = await User.findOne({ email: email.toLowerCase() });

          if (user) {
            // Update OAuth info if user exists
            user.googleId = profile.id;
            user.image_url = user.image_url || profile.photos?.[0]?.value;
            // Auto-verify for OAuth users who are students
            if (user.role === "student") {
              (user as IStudent).isVerified = true;
            }
            await user.save();
          } else {
            // Create new user
            user = await User.create({
              full_name:
                profile.displayName ||
                `${profile.name?.givenName} ${profile.name?.familyName}`,
              email: email.toLowerCase(),
              googleId: profile.id,
              image_url: profile.photos?.[0]?.value,
              isVerified: true,
              role: "student",
            });
          }

          return done(null, user);
        } catch (error) {
          return done(error as Error, false);
        }
      },
    ),
  );
}

/**
 * GitHub OAuth Strategy for Students
 */
if (GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET) {
  passport.use(
    "github-student",
    new GitHubStrategy(
      {
        clientID: GITHUB_CLIENT_ID,
        clientSecret: GITHUB_CLIENT_SECRET,
        callbackURL: `${BASE_URL}/api/auth/oauth/github/callback`,
        scope: ["user:email", "read:user"],
      },
      async (
        accessToken: string,
        refreshToken: string,
        profile: GitHubProfile,
        done: (error: Error | null, user?: Express.User | false) => void,
      ) => {
        try {
          await dbConnect();

          // Get primary email from GitHub
          const email =
            profile.emails?.[0]?.value || `${profile.username}@github.local`;

          // Check if user already exists
          let user = await User.findOne({
            $or: [{ email: email.toLowerCase() }, { githubId: profile.id }],
          });

          if (user) {
            // Update OAuth info if user exists
            user.githubId = profile.id;
            user.image_url = user.image_url || profile.photos?.[0]?.value;

            // Only set student-specific properties if user is a student
            if (user.role === "student") {
              const studentUser = user as IStudent;
              studentUser.githubToken = accessToken;
              studentUser.isVerified = true;
              if (!studentUser.socialLinks) {
                studentUser.socialLinks = {};
              }
              studentUser.socialLinks.github =
                profile.profileUrl || `https://github.com/${profile.username}`;
            }
            await user.save();
          } else {
            // Create new user
            user = await User.create({
              full_name:
                profile.displayName || profile.username || "GitHub User",
              email: email.toLowerCase(),
              githubId: profile.id,
              githubToken: accessToken,
              image_url: profile.photos?.[0]?.value,
              isVerified: true,
              role: "student",
              socialLinks: {
                github:
                  profile.profileUrl ||
                  `https://github.com/${profile.username}`,
              },
            });
          }

          return done(null, user);
        } catch (error) {
          return done(error as Error, false);
        }
      },
    ),
  );
}

// Serialization (not used in stateless JWT auth, but required by Passport)
passport.serializeUser((user: Express.User, done) => {
  done(null, (user as IUser | ICollege | ICompany)._id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    await dbConnect();
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
