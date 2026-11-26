// Sky Courier: Alpine Run — the hand-in program.
//
// Node 22, standard library only. The game itself is the plain static
// files under game/ (index.html plus its ES modules, no library, nothing
// fetched over the network), and the screenshots are the renders the game
// stages for itself. This program gathers both into /output and writes the
// dossier the judge reads, using the vendored make.fun library.
//
// Play it locally first: `node serve.ts` serves game/ on localhost:8080.
// Hand it in outside the grader with MAKEFUN_OUTPUT_DIR set:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate's own limits, from the kit's reference/gate.json: at most 4
// screenshots of 256 KiB, game/ at most 993 files and 48 MiB, every path
// under 1000 bytes, and the dossier text at most 160 KiB. The dossier
// builder enforces them here so a bad hand-in fails loudly, locally.
const GATE = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function copyInto(name) {
  const from = join(repoRoot, name);
  if (!existsSync(from)) return;
  cpSync(from, join(outDir, name), { recursive: true });
}

mkdirSync(outDir, { recursive: true });
copyInto('game');
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
copyInto('screenshots');
writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, GATE));
console.log(`handed in game/ + screenshots/ + dossier.json to ${outDir}`);
