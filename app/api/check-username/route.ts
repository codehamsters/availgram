import { NextResponse } from "next/server";
import clientPromise from "../mongodb";


async function getCsrfToken() {

  const signupResponse = await fetch("https://www.instagram.com/accounts/emailsignup/", {
    method: "GET",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    },
  });

  const cookies = signupResponse.headers.get("set-cookie") || "";
  const csrfTokenMatch = cookies.match(/csrftoken=([^;]+)/);
  const csrfToken = csrfTokenMatch ? csrfTokenMatch[1] : "";

  if (!csrfToken) {
    throw new Error("Failed to obtain CSRF token");
  }

  return csrfToken;
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

    // Create TTL index on checkedAt field to expire documents after 1 day (86400 seconds)
    await collection.createIndex({ checkedAt: 1 }, { expireAfterSeconds: 86400 });

    // Check if username exists in DB
    const existing = await collection.findOne({ username });

    if (existing) {
      if (existing.isAvailable === false) {
        // Return stored availability
        return NextResponse.json({ isAvailable: existing.isAvailable });
      }
    }

    const csrfToken = await getCsrfToken();

    // Instagram internal API endpoint for username availability check
    const apiUrl = "https://www.instagram.com/api/v1/web/accounts/web_create_ajax/attempt/";

    // Prepare POST payload
    const payload = new URLSearchParams();
    payload.append("username", username);
    payload.append("email", ""); // Required field, empty string
    payload.append("first_name", ""); // Required field, empty string
    payload.append("opt_into_one_tap", "false");
    payload.append("use_new_suggested_user_name", "true");
    payload.append("jazoest", "22035"); // This value may need to be dynamic or updated

    // Make POST request to Instagram internal API with CSRF token
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
        "Accept": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": "https://www.instagram.com/accounts/emailsignup/",
        "X-CSRFToken": csrfToken,
        "Cookie": `csrftoken=${csrfToken}`,
      },
      body: payload.toString(),
    });

    const data = await response.json();
    console.log("Response from Instagram API:", data);

    let isAvailable = false;

    // If there is no username error in the response, username is available
    if (!data.errors || !data.errors.username) {
      isAvailable = true;
    } else {
      // Username is taken if error code username_is_taken exists
      const usernameErrors = data.errors.username;
      if (usernameErrors.some((e: any) => e.code === "username_is_taken")) {
        isAvailable = false;
      }
    }

    // Store the result in DB with username length
    await collection.updateOne(
      { username },
      { $set: { username, isAvailable, length: username.length, checkedAt: new Date() } },
      { upsert: true }
    );

    return NextResponse.json({ isAvailable });
  } catch (error) {
    return NextResponse.json({ error: "Failed to check username" }, { status: 500 });
  }
}
