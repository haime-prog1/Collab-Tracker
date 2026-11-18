// Renders PWA icons from public/icons/favicon.svg. Run with `npm run icons`; output PNGs are committed.
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

const dir = new URL('../public/icons/', import.meta.url);
const svg = await readFile(new URL('favicon.svg', dir));

const out = (name) => new URL(name, dir).pathname;
await sharp(svg).resize(192, 192).png().toFile(out('pwa-192.png'));
await sharp(svg).resize(512, 512).png().toFile(out('pwa-512.png'));

// Maskable + Apple icons: full-bleed background, artwork inside the safe zone.
const inner = await sharp(svg).resize(360, 360).png().toBuffer();
const bleed = (size, art) =>
  sharp({ create: { width: size, height: size, channels: 4, background: '#09090b' } })
    .composite([{ input: art, gravity: 'center' }])
    .png();
await bleed(512, inner).toFile(out('maskable-512.png'));
await bleed(180, await sharp(svg).resize(150, 150).png().toBuffer()).toFile(out('apple-touch-icon.png'));
console.log('Icons written to public/icons');
