import {spawn} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {chromium} from '@playwright/test';

const phase=process.argv[2];
if(!['before','after'].includes(phase))throw Error('Use before or after');
const directory=`test-results/phase3/performance/${phase}`;
mkdirSync(directory,{recursive:true});
const rows=[];
for(const path of ['/updates','/parties','/chat'])for(let run=1;run<=3;run++){
  const output=`${directory}/${path.slice(1)}-mobile-${run}`;
  const args=['node_modules/lighthouse/cli/index.js',`http://127.0.0.1:3020${path}`,'--chrome-flags=--headless','--only-categories=performance,accessibility,best-practices','--output=json','--output=html',`--output-path=${output}`,'--quiet'];
  const child=spawn(process.execPath,args,{stdio:'inherit',env:{...process.env,CHROME_PATH:chromium.executablePath()}});
  const code=await new Promise(resolve=>child.once('exit',resolve));
  if(code!==0)throw Error(`Lighthouse failed ${path}/${run}: ${code}`);
  const report=JSON.parse(readFileSync(`${output}.report.json`,'utf8'));
  const row={path,run,performance:report.categories.performance.score*100,lcpMs:report.audits['largest-contentful-paint'].numericValue,fcpMs:report.audits['first-contentful-paint'].numericValue,tbtMs:report.audits['total-blocking-time'].numericValue,cls:report.audits['cumulative-layout-shift'].numericValue,ttfbMs:report.audits['server-response-time']?.numericValue,transferredBytes:report.audits['total-byte-weight']?.numericValue,breakdown:report.audits['lcp-breakdown-insight']?.details};
  rows.push(row);writeFileSync(`${directory}/measurements.json`,JSON.stringify(rows,null,2));
  console.log(JSON.stringify({path,run,performance:row.performance,lcpMs:Math.round(row.lcpMs),tbtMs:Math.round(row.tbtMs)}));
}
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
const summary=['/updates','/parties','/chat'].map(path=>({path,runs:3,lcpMs:median(rows.filter(row=>row.path===path).map(row=>row.lcpMs)),tbtMs:median(rows.filter(row=>row.path===path).map(row=>row.tbtMs)),performance:median(rows.filter(row=>row.path===path).map(row=>row.performance))}));
writeFileSync(`${directory}/summary.json`,JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
