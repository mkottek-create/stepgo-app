// Web-App-Dateien für den iPhone-Container bereitstellen.
import { mkdirSync, copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const out = join(root, 'www');
mkdirSync(out, { recursive: true });
for (const name of ['index.html', 'styles.css', 'app.js', 'manifest.webmanifest', 'icon.png']) {
  copyFileSync(join(root, name), join(out, name));
  console.log('Bereit für iOS:', name);
}

