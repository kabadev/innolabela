import { NextResponse } from "next/server";

// Seed endpoint disabled and disconnected
export async function GET() {
  return NextResponse.json({ message: "Seed endpoint is disabled." }, { status: 404 });
}

export async function POST() {
  return NextResponse.json({ message: "Seed endpoint is disabled." }, { status: 404 });
}
