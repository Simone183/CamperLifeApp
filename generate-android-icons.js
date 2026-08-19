import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const publicDir = path.join(process.cwd(), 'public');
const androidResDir = path.join(process.cwd(), 'android', 'app', 'src', 'main', 'res');

const iconSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="112" fill="#3E4A35"/>
  <path d="M140 220H310L360 280H392C405.255 280 416 290.745 416 304V330C416 343.255 405.255 354 392 354H372V340H140V354H120C106.745 354 96 343.255 96 330V304C96 290.745 106.745 280 120 280H140V220Z" fill="#F4F1EA"/>
  <circle cx="170" cy="354" r="28" fill="#2C3525"/>
  <circle cx="342" cy="354" r="28" fill="#2C3525"/>
  <path d="M160 238H220V280H160V238Z" fill="#3E4A35"/>
  <path d="M240 238H300V280H240V238Z" fill="#3E4A35"/>
</svg>
`;

const svgBuffer = Buffer.from(iconSvg);

const mipmaps = [
  { name: 'mipmap-mdpi', size: 48, foreground: 108 },
  { name: 'mipmap-hdpi', size: 72, foreground: 162 },
  { name: 'mipmap-xhdpi', size: 96, foreground: 216 },
  { name: 'mipmap-xxhdpi', size: 144, foreground: 324 },
  { name: 'mipmap-xxxhdpi', size: 192, foreground: 432 }
];

async function generate() {
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Generate web public icons
  await sharp(svgBuffer).resize(192, 192).png().toFile(path.join(publicDir, 'logo-192x192.png'));
  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'logo-512x512.png'));
  await sharp(svgBuffer).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log("Generated web icons in public/");

  for (const m of mipmaps) {
    const targetDir = path.join(androidResDir, m.name);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // 1. ic_launcher.png
    await sharp(svgBuffer)
      .resize(m.size, m.size)
      .png()
      .toFile(path.join(targetDir, 'ic_launcher.png'));

    // 2. ic_launcher_round.png
    const circleSvg = Buffer.from(
      `<svg><circle cx="${m.size / 2}" cy="${m.size / 2}" r="${m.size / 2}" fill="black"/></svg>`
    );
    await sharp(svgBuffer)
      .resize(m.size, m.size)
      .composite([{ input: circleSvg, blend: 'dest-in' }])
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_round.png'));

    // 3. ic_launcher_foreground.png
    const fgSize = Math.round(m.foreground * 0.75);
    const resizedFg = await sharp(svgBuffer)
      .resize(fgSize, fgSize, { fit: 'inside' })
      .toBuffer();

    await sharp({
      create: {
        width: m.foreground,
        height: m.foreground,
        channels: 4,
        background: { r: 62, g: 74, b: 53, alpha: 1 }
      }
    })
      .composite([{ input: resizedFg, gravity: 'center' }])
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_foreground.png'));

    console.log(`Generated Android launcher icons for ${m.name}`);
  }

  console.log("Success! All icons generated successfully.");
}

generate().catch(err => {
  console.error("Error generating icons:", err);
  process.exit(1);
});
