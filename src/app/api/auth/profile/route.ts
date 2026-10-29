import { NextResponse } from "next/server";
import { User, College, Company, Student } from "@/models/User";
import dbConnect from "@/lib/dbConnect";
import { getCurrentUser } from "@/lib/auth";
import { verifyJwt } from "@/lib/jwt";
import { cookies } from "next/headers";
import { normalizeCompanySubrole } from "@/lib/company-rbac";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type AnyUser = Record<string, unknown>;
function serializeUserForResponse(user: AnyUser, role?: string) {
  const obj = JSON.parse(JSON.stringify(user));
  // Always provide a full_name field for dashboard UI
  if (!obj.full_name) {
    if (role === "college" && obj.contactPersonName) {
      obj.full_name = obj.contactPersonName;
    } else if (role === "company" && obj.contactPersonName) {
      obj.full_name = obj.contactPersonName;
    } else if (obj.collegeName) {
      obj.full_name = obj.collegeName;
    } else if (obj.companyName) {
      obj.full_name = obj.companyName;
    } else {
      obj.full_name = "User";
    }
  }
  if (obj.experience?.projects && Array.isArray(obj.experience.projects)) {
    obj.experience.projects = obj.experience.projects.map(
      (project: Record<string, unknown>) => ({
        ...project,
        addedDate: project.addedDate
          ? new Date(project.addedDate as string | number | Date).toISOString()
          : null,
      }),
    );
  }
  if (
    obj.experience?.previousInternships &&
    Array.isArray(obj.experience.previousInternships)
  ) {
    obj.experience.previousInternships = obj.experience.previousInternships.map(
      (internship: Record<string, unknown>) => ({
        ...internship,
        addedDate: internship.addedDate
          ? new Date(
              internship.addedDate as string | number | Date,
            ).toISOString()
          : null,
      }),
    );
  }
  return obj;
}

export async function GET() {
  try {
    // Try JWT auth first (for dashboard/college/company)
    const cookieStore = await cookies();
    const token = cookieStore.get("aipm_token")?.value;

    if (token) {
      try {
        const payload = await verifyJwt(token);
        if (payload && payload.id && payload.role) {
          await dbConnect();

          let user = null;
          if (payload.role === "college") {
            user = await College.findById(payload.id)
              .select("-password")
              .lean();
          } else if (payload.role === "company") {
            user = await Company.findById(payload.id)
              .select("-password")
              .lean();
          } else {
            user = await User.findById(payload.id).select("-password").lean();
          }

          if (!user) {
            return NextResponse.json(
              { error: "User not found" },
              { status: 404 },
            );
          }

          // Ensure role is a string for type safety
          const roleStr =
            typeof payload.role === "string"
              ? payload.role
              : String(payload.role);

          const responseUser = serializeUserForResponse(
            user as unknown as AnyUser,
            roleStr,
          );

          const currentEmail = String(responseUser.email ?? "")
            .trim()
            .toLowerCase();

          if (currentEmail) {
            // If user IS a company, they are automatically the owner
            if (roleStr === "company") {
              responseUser.subrole = "owner";
              responseUser.activeCompanyMembership = {
                companyId: String(responseUser._id),
                companyName: String(responseUser.companyName ?? ""),
                subrole: "owner",
                status: "active",
              };
            } else {
              // For non-company users, look up their membership in any company
              let membershipCompany = null as {
                _id: unknown;
                companyName?: string;
                members?: Array<Record<string, unknown>>;
              } | null;

              membershipCompany = await Company.findOne({
                members: {
                  $elemMatch: {
                    email: {
                      $regex: `^${escapeRegex(currentEmail)}$`,
                      $options: "i",
                    },
                    status: "active",
                  },
                },
              })
                .select(
                  "_id companyName members.email members.status members.subrole",
                )
                .lean();

              const activeMember = Array.isArray(membershipCompany?.members)
                ? membershipCompany!.members!.find(
                    (member: Record<string, unknown>) =>
                      String(member.email ?? "")
                        .trim()
                        .toLowerCase() === currentEmail &&
                      String(member.status ?? "")
                        .trim()
                        .toLowerCase() === "active",
                  )
                : null;

              if (activeMember?.subrole && membershipCompany?._id) {
                const normalizedSubrole = normalizeCompanySubrole(
                  activeMember.subrole,
                );
                responseUser.subrole = normalizedSubrole;
                responseUser.activeCompanyMembership = {
                  companyId: String(membershipCompany._id),
                  companyName: String(membershipCompany.companyName ?? ""),
                  subrole: normalizedSubrole,
                  status: "active",
                };
              } else {
                // Fallback: if no active membership found in current query, try case-insensitive exact match
                // This handles edge cases where the regex might not match due to encoding or special chars
                if (!activeMember && membershipCompany?.members) {
                  const fallbackMember = membershipCompany.members.find(
                    (member: Record<string, unknown>) => {
                      const memberEmail = String(member.email ?? "")
                        .trim()
                        .toLowerCase();
                      const memberStatus = String(member.status ?? "")
                        .trim()
                        .toLowerCase();
                      return (
                        memberEmail === currentEmail &&
                        memberStatus === "active" &&
                        member.subrole
                      );
                    },
                  );

                  if (fallbackMember?.subrole && membershipCompany._id) {
                    const normalizedSubrole = normalizeCompanySubrole(
                      fallbackMember.subrole,
                    );
                    responseUser.subrole = normalizedSubrole;
                    responseUser.activeCompanyMembership = {
                      companyId: String(membershipCompany._id),
                      companyName: String(membershipCompany.companyName ?? ""),
                      subrole: normalizedSubrole,
                      status: "active",
                    };
                  }
                }
              }
            }
          }

          return NextResponse.json({
            user: responseUser,
          });
        }
      } catch (jwtError) {
        console.error("JWT verification error:", jwtError);
        // Continue to fallback auth
      }
    }

    // Fallback to JWT-based student auth
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({
      user: serializeUserForResponse(user as unknown as AnyUser, "student"),
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT - Update user profile (JWT only)
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    const updated_ata = await request.json();
    // Process experience data if it exists
    if (updated_ata.experience) {
      // Handle projects array if it exists
      if (updated_ata.experience.projects) {
        if (typeof updated_ata.experience.projects === "string") {
          try {
            updated_ata.experience.projects = JSON.parse(
              updated_ata.experience.projects,
            );
          } catch (e) {
            console.error("Failed to parse projects string:", e);
            updated_ata.experience.projects = [];
          }
        }
        if (
          updated_ata.experience.projects &&
          !Array.isArray(updated_ata.experience.projects) &&
          typeof updated_ata.experience.projects === "object"
        ) {
          updated_ata.experience.projects = [updated_ata.experience.projects];
        }
        updated_ata.experience.projects = updated_ata.experience.projects.map(
          (project: Record<string, unknown>) => ({
            id: String(project.id || ""),
            title: String(project.title || ""),
            description: String(project.description || ""),
            technologies: Array.isArray(project.technologies)
              ? project.technologies
              : [],
            link: String(project.link || ""),
            githubLink: String(project.githubLink || ""),
            status: String(project.status || "completed"),
            addedDate: project.addedDate
              ? new Date(String(project.addedDate))
              : new Date(),
          }),
        );
      }
      if (updated_ata.experience.previousInternships) {
        if (typeof updated_ata.experience.previousInternships === "string") {
          try {
            updated_ata.experience.previousInternships = JSON.parse(
              updated_ata.experience.previousInternships,
            );
          } catch (e) {
            console.error("Failed to parse internships string:", e);
            updated_ata.experience.previousInternships = [];
          }
        }
        updated_ata.experience.previousInternships =
          updated_ata.experience.previousInternships.map(
            (internship: Record<string, unknown>) => ({
              id: String(internship.id || ""),
              companyName: String(internship.companyName || ""),
              position: String(internship.position || ""),
              duration: String(internship.duration || ""),
              description: String(internship.description || ""),
              skills: Array.isArray(internship.skills) ? internship.skills : [],
              addedDate: internship.addedDate
                ? new Date(String(internship.addedDate))
                : new Date(),
            }),
          );
      }
    }
    let updatedUser;
    if (user.role === "student") {
      updatedUser = await Student.findByIdAndUpdate(
        user._id as unknown as string,
        { $set: updated_ata },
        { new: true, select: "-password", lean: true },
      );
    } else {
      updatedUser = await User.findByIdAndUpdate(
        user._id as unknown as string,
        { $set: updated_ata },
        { new: true, select: "-password", lean: true },
      );
    }
    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({
      user: serializeUserForResponse(updatedUser as unknown as AnyUser),
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PATCH - Alias for PUT
export async function PATCH(request: Request) {
  return PUT(request);
}

// Handle other methods
export async function POST() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
