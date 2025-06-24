import { NextResponse } from "next/server";
import clientPromise from "../mongodb";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  try {
    const client = await clientPromise;
    const db = client.db("availgram");
    const collection = db.collection("usernames");

    // Create TTL index to expire after 1 day
    await collection.createIndex({ checkedAt: 1 }, { expireAfterSeconds: 86400 });

    // Check cache
    const existing = await collection.findOne({ username });
    if (existing) {
      return NextResponse.json({ isAvailable: existing.isAvailable });
    }

    // Use Instagram's lightweight GET endpoint
    const response = await fetch(`https://www.instagram.com/web/accounts/username_info/?username=${username}`, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Referer": "https://www.instagram.com/accounts/emailsignup/",
      },
    });

    const data = await response.json();
    console.log("API Response:",data)
    const isAvailable = data.available === true;

    await collection.updateOne(
      { username },
      {
        $set: {
          username,
          isAvailable,
          length: username.length,
          checkedAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ isAvailable });
  } catch (error) {
    console.error("Error checking username:", error);
    return NextResponse.json({ error: "Failed to check username" }, { status: 500 });
  }
}
