import { NextResponse } from "next/server";
import { Company } from "@/models/User";
import dbConnect from "@/lib/dbConnect";
import { verifyJwt } from "@/lib/jwt";
import { cookies } from "next/headers";

// GET /api/student/companies
// Returns active company memberships for the logged-in user.
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("aipm_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyJwt(token);
    const user_id = payload?.id ? String(payload.id) : null;
    const userEmail = payload?.email ? String(payload.email).toLowerCase() : null;

    if (!user_id && !userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const membershipConditions: Array<Record<string, unknown>> = [];

    if (user_id) {
      membershipConditions.push({
        members: {
          $elemMatch: {
            user_id,
            status: "active",
          },
        },
      });
    }

    if (userEmail) {
      membershipConditions.push({
        members: {
          $elemMatch: {
            email: { $regex: `^${userEmail}$`, $options: "i" },
            status: "active",
          },
        },
      });
    }

    const companies = await Company.find({
      $or: membershipConditions,
    })
      .select("companyName industry image_url headquartersLocation companySize members")
      .lean();

    const result = companies.map((company) => {
      const member = company.members?.find((m: { email?: string; user_id?: string; status?: string }) => {
        const memberEmail = m.email?.toLowerCase();
        const memberuser_id = m.user_id ? String(m.user_id) : null;
        const emailMatch = Boolean(userEmail && memberEmail === userEmail);
        const idMatch = Boolean(user_id && memberuser_id === user_id);
        return (emailMatch || idMatch) && m.status === "active";
      });

      return {
        companyId: company._id,
        companyName: company.companyName,
        industry: company.industry || "",
        image_url: company.image_url || "",
        headquartersLocation: company.headquartersLocation || "",
        companySize: company.companySize || "",
        subrole: member?.subrole || "trainee",
        joinedAt: member?.joinedAt || null,
      };
    });

    return NextResponse.json({ companies: result });
  } catch (error) {
    console.error("Error fetching student companies:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
