import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ searchCount: null });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json({ searchCount: null });
  }

  const today = new Date().toDateString();
  const lastReset = user.lastSearchReset
    ? new Date(user.lastSearchReset).toDateString()
    : null;

  // 🔁 RESET IF NEW DAY
  if (!lastReset || today !== lastReset) {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        searchCount: 0,
        lastSearchReset: new Date(),
      },
    });

    return NextResponse.json({ searchCount: updated.searchCount });
  }

  return NextResponse.json({ searchCount: user.searchCount });
}
