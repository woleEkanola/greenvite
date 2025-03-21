import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated and is a superadmin
    if (!session?.user || session.user.role !== "superadmin") {
      return NextResponse.json(
        { error: "Unauthorized. Superadmin access required." },
        { status: 403 }
      );
    }

    // Fetch all users with role "lead"
    const leads = await prisma.user.findMany({
      where: {
        role: "lead"
      },
      orderBy: {
        createdAt: "desc"
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json({ leads });
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      { error: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}
