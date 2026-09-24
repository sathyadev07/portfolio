const fs=require('fs');
for(const f of process.argv.slice(2)){
 const r=JSON.parse(fs.readFileSync(f,'utf8').replace(/^[^\[{]*/,'').replace(/[^\]}]*$/,''));
 console.log('==',f);
 for(const x of r){for(const k of ['idle','scroll','pointer']){const m=x[k];console.log(k.padEnd(8),`fps ${m.avgFps} p95 ${m.p95} p99 ${m.p99} >20ms ${m.over20ms} >33ms ${m.over33ms} LT ${m.longTasks}/${m.longTaskTotalMs}ms`)}console.log(' tilt',JSON.stringify(x.tiltAfterPointer))}
}
