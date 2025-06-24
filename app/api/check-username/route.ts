import { NextResponse } from "next/server";
import clientPromise from "../mongodb";

const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
];

async function getCsrfAndCookie() {
  const response = await fetch("https://www.instagram.com/accounts/emailsignup/", {
    method: "GET",
    headers: {
      "User-Agent": userAgents[Math.floor(Math.random() * userAgents.length)],
      "Accept": "text/html,application/xhtml+xml",
    },
  });

  const cookies = response.headers.get("set-cookie") || "";
  const csrfToken = cookies.match(/csrftoken=([^;]+)/)?.[1] || "";
  const mid = cookies.match(/mid=([^;]+)/)?.[1] || "";

  if (!csrfToken) throw new Error("Could not extract CSRF token");

  return {
    csrfToken,
    cookie: `csrftoken=${csrfToken}; mid=${mid}`
  };
}

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

    await collection.createIndex({ checkedAt: 1 }, { expireAfterSeconds: 86400 });

    const existing = await collection.findOne({ username });
    if (existing) {
      return NextResponse.json({ isAvailable: existing.isAvailable });
    }

    const { csrfToken, cookie } = await getCsrfAndCookie();
    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

    const payload = new URLSearchParams({
      username,
      email: `fake${Date.now()}@example.com`,
      first_name: `User${Math.floor(Math.random() * 999)}`,
      opt_into_one_tap: "false",
      use_new_suggested_user_name: "true",
      jazoest: "22470" // optional: dynamic generation if needed
    });

    const res = await fetch("https://www.instagram.com/api/v1/web/accounts/web_create_ajax/attempt/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": userAgent,
        "X-Requested-With": "XMLHttpRequest",
        "Referer": "https://www.instagram.com/accounts/emailsignup/",
        "X-CSRFToken": csrfToken,
        "Cookie": cookie
      },
      body: payload.toString()
    });

    const data = await res.json();
    console.log("Instagram API Response:",data);
    let isAvailable = false;

    if (!data.errors || !data.errors.username) {
      isAvailable = true;
    }

    await collection.updateOne(
      { username },
      { $set: { username, isAvailable, length: username.length, checkedAt: new Date() } },
      { upsert: true }
    );

    return NextResponse.json({ isAvailable });
  } catch (err) {
    console.error("Error checking username:", err);
    return NextResponse.json({ error: "Failed to check username" }, { status: 500 });
  }
}
