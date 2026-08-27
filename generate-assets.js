import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const publicDir = path.join(process.cwd(), 'public');
const androidResDir = path.join(process.cwd(), 'android', 'app', 'src', 'main', 'res');
const logoBase64File = path.join(process.cwd(), 'src', 'assets', 'logoBase64.ts');

function getOriginalLogoBuffer() {
  if (fs.existsSync(logoBase64File)) {
    const fileContent = fs.readFileSync(logoBase64File, 'utf-8');
    const match = fileContent.match(/data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/);
    if (match && match[1]) {
      return Buffer.from(match[1], 'base64');
    }
  }
  return null;
}

// Splash generator that embeds the authentic logo buffer on brand background (#3E4A35)
async function createSplashPng(logoBuffer, width, height) {
  const minDim = Math.min(width, height);
  const logoSize = Math.round(minDim * 0.45);

  const resizedLogo = await sharp(logoBuffer)
    .resize(logoSize, logoSize, { fit: 'inside' })
    .toBuffer();

  const brandBackground = await sharp({
    create: {
      width: width,
      height: height,
      channels: 4,
      background: { r: 62, g: 74, b: 53, alpha: 1 } // #3E4A35
    }
  }).png().toBuffer();

  const topOffset = Math.max(0, Math.round((height - logoSize) / 2));
  const leftOffset = Math.max(0, Math.round((width - logoSize) / 2));

  return sharp(brandBackground)
    .composite([
      {
        input: resizedLogo,
        top: topOffset,
        left: leftOffset
      }
    ])
    .png()
    .toBuffer();
}

async function run() {
  console.log("Loading original ViaCamper logo from src/assets/logoBase64.ts...");
  const logoBuffer = getOriginalLogoBuffer();

  if (!logoBuffer) {
    console.error("Could not find or extract LOGO_BASE64 from src/assets/logoBase64.ts");
    process.exit(1);
  }

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // 1. Generate all public PNG icons directly from original LOGO_BASE64
  const publicIcons = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'logo-192x192.png', size: 192 },
    { name: 'logo-512x512.png', size: 512 },
    { name: 'maskable-icon-192x192.png', size: 192 },
    { name: 'maskable-icon-512x512.png', size: 512 },
    { name: 'logo.png', size: 512 }
  ];

  for (const icon of publicIcons) {
    await sharp(logoBuffer)
      .resize(icon.size, icon.size)
      .png()
      .toFile(path.join(publicDir, icon.name));
    console.log(`Generated public/${icon.name}`);
  }

  // 2. Generate Android mipmap launcher icons directly from original LOGO_BASE64
  const mipmaps = [
    { name: 'mipmap-mdpi', size: 48, fg: 108 },
    { name: 'mipmap-hdpi', size: 72, fg: 162 },
    { name: 'mipmap-xhdpi', size: 96, fg: 216 },
    { name: 'mipmap-xxhdpi', size: 144, fg: 324 },
    { name: 'mipmap-xxxhdpi', size: 192, fg: 432 }
  ];

  for (const m of mipmaps) {
    const targetDir = path.join(androidResDir, m.name);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // ic_launcher.png
    await sharp(logoBuffer)
      .resize(m.size, m.size)
      .png()
      .toFile(path.join(targetDir, 'ic_launcher.png'));

    // ic_launcher_round.png
    const circleMask = Buffer.from(
      `<svg><circle cx="${m.size / 2}" cy="${m.size / 2}" r="${m.size / 2}" fill="black"/></svg>`
    );
    await sharp(logoBuffer)
      .resize(m.size, m.size)
      .composite([{ input: circleMask, blend: 'dest-in' }])
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_round.png'));

    // ic_launcher_foreground.png
    const fgInner = Math.round(m.fg * 0.72);
    const resizedInner = await sharp(logoBuffer)
      .resize(fgInner, fgInner, { fit: 'inside' })
      .toBuffer();

    await sharp({
      create: {
        width: m.fg,
        height: m.fg,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([{ input: resizedInner, gravity: 'center' }])
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_foreground.png'));

    console.log(`Generated Android ${m.name} icons`);
  }

  // 3. Generate Android splash screens with exact original logo on #3E4A35
  const splashConfigs = [
    { dir: 'drawable-land-mdpi', width: 480, height: 320 },
    { dir: 'drawable-land-hdpi', width: 800, height: 480 },
    { dir: 'drawable-land-xhdpi', width: 1280, height: 720 },
    { dir: 'drawable-land-xxhdpi', width: 1600, height: 960 },
    { dir: 'drawable-land-xxxhdpi', width: 1920, height: 1280 },
    { dir: 'drawable-port-mdpi', width: 320, height: 480 },
    { dir: 'drawable-port-hdpi', width: 480, height: 800 },
    { dir: 'drawable-port-xhdpi', width: 720, height: 1280 },
    { dir: 'drawable-port-xxhdpi', width: 960, height: 1600 },
    { dir: 'drawable-port-xxxhdpi', width: 1280, height: 1920 },
    { dir: 'drawable', width: 480, height: 800 }
  ];

  for (const s of splashConfigs) {
    const targetDir = path.join(androidResDir, s.dir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const splashBuf = await createSplashPng(logoBuffer, s.width, s.height);
    fs.writeFileSync(path.join(targetDir, 'splash.png'), splashBuf);
    console.log(`Generated splash: ${s.dir}/splash.png`);
  }

  console.log("All icons and splash screens successfully generated from original LOGO_BASE64!");
}

run().catch(err => {
  console.error("Asset generation error:", err);
  process.exit(1);
});
