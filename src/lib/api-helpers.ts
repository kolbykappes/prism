import { NextResponse } from "next/server";

export function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status = 400, detail?: string) {
  const body: Record<string, string> = { error: message };
  if (detail) {
    body.detail = detail;
  }
  return NextResponse.json(body, { status });
}
