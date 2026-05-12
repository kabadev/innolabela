// /app/api/proxy-audio/route.ts
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get("url");

    if (!fileUrl) {
      return new Response("Missing URL parameter", { status: 400 });
    }

    const response = await fetch(fileUrl);
    
    if (!response.ok) {
      return new Response(`Failed to fetch source audio: ${response.status}`, { status: response.status });
    }

    const contentType = response.headers.get("Content-Type") || "audio/mpeg";
    const buffer = await response.arrayBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    console.error("[Proxy] Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
