// /app/api/proxy-audio/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fileUrl = searchParams.get("url");
  const response = await fetch(fileUrl!);
  const buffer = await response.arrayBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
