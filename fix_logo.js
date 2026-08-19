import fs from 'fs';
import { Jimp } from 'jimp';

async function fix() {
  try {
    const img = await Jimp.read('public/logo.png');
    await img.write('public/logo_fixed.png');
    console.log('success');
  } catch (err) {
    console.error(err);
  }
}
fix();
