import https from "https";
https.get("https://brouter.de/brouter?lonlats=10.0,45.0|10.1,45.1&profile=car-test&format=geojson", (res) => {
  let data = "";
  res.on("data", chunk => data += chunk);
  res.on("end", () => console.log(data.substring(0, 500)));
});
