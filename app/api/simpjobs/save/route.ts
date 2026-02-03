import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ jobs: [] });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { savedJobs: true },
  });

  if (!user) {
    return NextResponse.json({ jobs: [] });
  }

  return NextResponse.json({
    jobs: user.savedJobs.map(job => ({
      id: job.jobId,
      title: job.jobTitle,
      company: job.jobCompany,
      location: job.jobLocation,
      source: job.jobSource,
      matchPercentage: job.matchPercentage,
      posted: "",
    })),
  });
}


export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json();
  const job = body.job;

  if (!job?.id) {
    return NextResponse.json({ error: "INVALID_JOB" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
  }

  // 🔁 TOGGLE SAVE / UNSAVE
  const existing = await prisma.savedJob.findUnique({
    where: {
      userId_jobId: {
        userId: user.id,
        jobId: job.id,
      },
    },
  });

  // ❌ If already saved → UNSAVE
  if (existing) {
    await prisma.savedJob.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({ saved: false });
  }

  // ✅ Else → SAVE
  await prisma.savedJob.create({
    data: {
      userId: user.id,
      jobId: job.id,
      jobTitle: job.title,
      jobCompany: job.company,
      jobLocation: job.location,
      jobUrl: "", // apply link is generated on frontend
      jobSource: job.source,
      matchPercentage: job.matchPercentage,
    },
  });

  return NextResponse.json({ saved: true });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { jobId } = await req.json();

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
  }

  await prisma.savedJob.deleteMany({
    where: {
      userId: user.id,
      jobId,
    },
  });

  return NextResponse.json({ success: true });
}
