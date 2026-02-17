import { NextRequest, NextResponse } from "next/server";
import { verifyAdminPassword, COOKIE_NAME, COOKIE_VALUE } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { password } = body;

  if (!verifyAdminPassword(password)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, COOKIE_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return response;
}
