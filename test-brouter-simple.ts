import fetch from "node-fetch";

async function test() {
  const url = "https://brouter.de/brouter?lonlats=12.67,41.72|12.68,41.73&profile=car-fast&format=geojson";

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    console.log("Status:", response.status);
    const rawText = await response.text();
    console.log("Response starts with:", rawText.substring(0, 500));
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
