import fs from 'fs';
import sharp from 'sharp';

async function testSharp() {
  try {
    const buffer = fs.readFileSync('public/test_logo.png');
    const metadata = await sharp(buffer).metadata();
    console.log("Metadata:", metadata);
  } catch (err) {
    console.error("Error reading with sharp:", err);
  }
}

testSharp();
