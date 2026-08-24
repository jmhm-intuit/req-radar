import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const fail = message => { failures.push(message); console.error(`ERROR: ${message}`); };
const pass = message => console.log(`PASS: ${message}`);
const required = [
  'index.html','app.js','app.css','manifest.webmanifest','service-worker.js','version.json',
  'icon-192.png','icon-512.png','.nojekyll','vendor/jszip.min.js','vendor/questline-xlsx.js',
  'assets/asset-manifest.json','.github/workflows/pages.yml','deploy.sh',
  'assets/recognition_recovery_hero.webp','assets/recognition_big_move.webp','assets/recognition_area_flourishing.webp',
  'assets/area_status_needs_focus.webp','assets/scene_priority.webp','assets/scene_campfire.webp',
  ...Array.from({length:10},(_,i)=>`assets/rank_${i+1}.webp`)
];
for (const rel of required) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) fail(`missing ${rel}`);
  else if (rel !== '.nojekyll' && fs.statSync(full).size === 0) fail(`empty ${rel}`);
  else pass(rel);
}

try {
  const version = JSON.parse(fs.readFileSync(path.join(root,'version.json'),'utf8'));
  version.version === '4.2.0' ? pass('version 4.2.0') : fail(`version is ${version.version}`);
  Number(version.schemaVersion) === 23 ? pass('schema 23') : fail(`schema is ${version.schemaVersion}`);
  version.storageKey === 'questline-v4-2' ? pass('storage key questline-v4-2') : fail(`storage key is ${version.storageKey}`);
} catch (error) { fail(`invalid version.json: ${error.message}`); }

try {
  const manifest = JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
  String(manifest.name||'').includes('4.2') ? pass('manifest version label') : fail('manifest does not identify 4.2');
  manifest.display === 'standalone' ? pass('manifest standalone') : fail('manifest display is not standalone');
  Array.isArray(manifest.icons) && manifest.icons.length >= 2 ? pass('manifest icons') : fail('manifest icons missing');
} catch (error) { fail(`invalid manifest: ${error.message}`); }

try {
  const records = JSON.parse(fs.readFileSync(path.join(root,'assets/asset-manifest.json'),'utf8'));
  const list = Array.isArray(records) ? records : records.assets || [];
  const files = new Set(list.map(r=>r.file));
  for (const rel of required.filter(x=>x.startsWith('assets/') && x !== 'assets/asset-manifest.json')) {
    files.has(rel) ? pass(`manifest includes ${rel}`) : fail(`manifest missing ${rel}`);
  }
  for (const record of list) {
    const full = path.join(root,record.file);
    if (!fs.existsSync(full)) fail(`manifest points to missing ${record.file}`);
    else if (fs.statSync(full).size !== Number(record.bytes)) fail(`byte count mismatch ${record.file}`);
  }
  pass(`${list.length} asset records`);
} catch (error) { fail(`invalid asset manifest: ${error.message}`); }

const index = fs.readFileSync(path.join(root,'index.html'),'utf8');
for (const marker of ['Questline v4.2.0','app.css','app.js','manifest.webmanifest']) {
  index.includes(marker) ? pass(`index includes ${marker}`) : fail(`index missing ${marker}`);
}

const app = fs.readFileSync(path.join(root,'app.js'),'utf8');
const appMarkers = [
  "const VERSION = '4.2.0'",'const SCHEMA_VERSION = 23',"const STORAGE_KEY = 'questline-v4-2'","'questline-v4-1'",
  'v42TaskCategory','v42TaskScheduleState','v42TaskFilters','v42-change-destination','v42DestinationLabel',
  'v42ApplyDestination','destinationHistory','v42-activity-row','v42-rank-pill',
  'v42ReviewEvents','v42ReviewData','v42AreaSummary','v42TrendChart','v42ReviewAreas',
  'v42EnsureReviewSnapshots','v42RenderHistory','recognition_recovery_hero','taskScheduleFilter'
];
for (const marker of appMarkers) app.includes(marker) ? pass(`app includes ${marker}`) : fail(`app missing ${marker}`);

const css = fs.readFileSync(path.join(root,'app.css'),'utf8');
for (const marker of ['.v42-task-filterbar','.v42-activity-row','.v42-destination-grid','.v42-review-hero','.v42-area-card','.v42-chart','.v42-history-list']) {
  css.includes(marker) ? pass(`css includes ${marker}`) : fail(`css missing ${marker}`);
}

try {
  const sw = fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
  sw.includes('questline-v4-2-cache-v1') ? pass('service-worker cache key') : fail('service-worker cache key mismatch');
  const prefix = sw.split("self.addEventListener('install'")[0];
  const core = vm.runInNewContext(`${prefix}; CORE`);
  let missing=0;
  for (const ref of core) {
    if (ref === './') continue;
    const rel = ref.replace(/^\.\//,'');
    const full = path.join(root,rel);
    if (!fs.existsSync(full)) { fail(`service-worker missing ${rel}`); missing++; }
    else if (fs.statSync(full).size===0) { fail(`service-worker empty ${rel}`); missing++; }
  }
  if (!missing) pass(`${core.length} service-worker references`);
} catch (error) { fail(`service worker preflight failed: ${error.message}`); }

if (failures.length) {
  console.error(`\nQuestline 4.2 preflight failed with ${failures.length} issue(s).`);
  process.exit(1);
}
console.log('\nQuestline 4.2 preflight complete.');
