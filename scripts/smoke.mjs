import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'app.css'),'utf8');
const checks=[
  ['Version 4.2',"const VERSION = '4.2.0'"],
  ['Schema 23','const SCHEMA_VERSION = 23'],
  ['Legacy 4.1 migration',"'questline-v4-1'"],
  ['Task destination category','v42TaskCategory'],
  ['Task schedule-state filter','v42TaskScheduleState'],
  ['Category and scheduling separated','v42TaskFilters'],
  ['Change destination flow','v42OpenDestination'],
  ['Project destination selection','v42ChooseParent'],
  ['Workstream/thread placement','v42ChooseDestinationDetail'],
  ['Destination history preservation','destinationHistory'],
  ['Compact Task row','v42-activity-row'],
  ['Fixed compact Rank','v42-rank-pill'],
  ['Review canonical events','v42ReviewEvents'],
  ['Review canonical analytics','v42ReviewData'],
  ['Life-area summaries','v42AreaSummary'],
  ['Unified weekly trend','v42TrendChart'],
  ['Automatic Review snapshots','v42EnsureReviewSnapshots'],
  ['Automatic Review history','v42RenderHistory'],
  ['Recovery asset registry','recognition_recovery_hero'],
  ['Review opens Areas','state.ui.reviewTab=\'areas\''],
  ['Task category tabs','.v42-task-tabs'],
  ['Task scheduling filter','.v42-task-filterbar'],
  ['Task destination selector','.v42-destination-grid'],
  ['Compact Review area card','.v42-area-card'],
  ['Recovery list layout','.v42-recovery-list'],
  ['Trend chart layout','.v42-chart'],
  ['History layout','.v42-history-list'],
  ['Mobile safe bottom padding','env(safe-area-inset-bottom'],
  ['Reduced motion','prefers-reduced-motion']
];
let failed=0;
for(const [name,marker] of checks){const ok=app.includes(marker)||css.includes(marker);console.log(`${ok?'PASS':'FAIL'}: ${name}`);if(!ok)failed++;}
if(failed){console.error(`Questline 4.2 smoke checks failed: ${failed}`);process.exit(1)}
console.log(`Questline 4.2 smoke checks complete: ${checks.length}/${checks.length}.`);
