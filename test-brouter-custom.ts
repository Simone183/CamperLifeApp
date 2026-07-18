import fs from "fs";
import fetch from "node-fetch";

async function test() {
  const profileText = fs.readFileSync("src/data/Car-Eco.brf", "utf8");
  let modifiedProfile = profileText;

  console.log("Profile snippet:\n", modifiedProfile.substring(500, 1000));

  const body = new URLSearchParams();
  body.append("lonlats", "12.67,41.72|12.68,41.73");
  body.append("profile", "custom_profile");
  body.append("customprofile", modifiedProfile);
  body.append("format", "geojson");

  try {
    const response = await fetch("https://brouter.de/brouter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0"
      },
      body: body.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[BRouter Proxy] BRouter error ${response.status}: ${errorText}`);
      throw new Error(`Failed to fetch from Brouter: status ${response.status}`);
    }
    const rawText = await response.text();
    try {
      const data = JSON.parse(rawText);
      console.log("Success:", JSON.stringify(data).substring(0, 100));
    } catch (e) {
      console.error("Failed to parse response as JSON. Raw response:", rawText.substring(0, 500));
      throw e;
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
