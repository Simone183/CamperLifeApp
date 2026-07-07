import fs from 'fs';

async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/public-places');
    console.log(res.status);
    console.log(await res.text());
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}
run();
