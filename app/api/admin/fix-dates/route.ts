import { connectDB } from "@/lib/mongodb";
import AudioGroup from "@/lib/models/AudioGroup";
import AudioFile from "@/lib/models/AudioFile";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await connectDB();
    
    const targetDate = new Date("2026-05-10T12:00:00Z");
    
    // Update all AudioGroup documents
    const groupResult = await AudioGroup.updateMany(
      {},
      {
        $set: {
          dateAdded: targetDate,
          createdAt: targetDate,
          updatedAt: targetDate,
        },
      }
    );

    // Update all AudioFile documents
    const fileResult = await AudioFile.updateMany(
      {},
      {
        $set: {
          createdAt: targetDate,
          updatedAt: targetDate,
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: "Successfully updated group and file dates to May 10, 2026",
      groupsModified: groupResult.modifiedCount,
      filesModified: fileResult.modifiedCount,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
