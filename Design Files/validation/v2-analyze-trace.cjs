// node v2-analyze-trace.cjs <trace.json.gz> — main-thread + frame summary for the page renderer.
const fs=require('fs'),zlib=require('zlib');
let raw=fs.readFileSync(process.argv[2]);if(process.argv[2].endsWith('.gz'))raw=zlib.gunzipSync(raw);
const j=JSON.parse(raw);const ev=Array.isArray(j)?j:j.traceEvents;
// Renderer main thread of the page under test: the CrRendererMain with most RunTask events whose frame URL is :3202
const threads={};for(const e of ev)if(e.name==='thread_name')threads[e.pid+':'+e.tid]=e.args.name;
const pidFor=new Set();for(const e of ev){if(e.name==='TracingStartedInBrowser'&&e.args?.data?.frames)for(const f of e.args.data.frames)if(/:3202/.test(f.url||''))pidFor.add(f.processId)}
const mains=Object.entries(threads).filter(([k,v])=>v==='CrRendererMain'&&(!pidFor.size||pidFor.has(+k.split(':')[0]))).map(([k])=>k);
const onMain=e=>mains.includes(e.pid+':'+e.tid);
const sum={};const long=[];let t0=Infinity,t1=0;
for(const e of ev){if(!onMain(e)||e.ph!=='X')continue;t0=Math.min(t0,e.ts);t1=Math.max(t1,e.ts+(e.dur||0));
 if(e.name==='RunTask'&&e.dur>50000)long.push(+(e.dur/1000).toFixed(1));
 if(['Layout','UpdateLayoutTree','Paint','PrePaint','Layerize','FunctionCall','EventDispatch','FireAnimationFrame','ParseHTML','RecalculateStyles','Commit','EvaluateScript','v8.callFunction','TimerFire','HitTest','ScrollLayer','UpdateLayer','IntersectionObserverController::computeIntersections'].includes(e.name))sum[e.name]=(sum[e.name]||0)+e.dur/1000;}
for(const k in sum)sum[k]=+sum[k].toFixed(1);
// Frames: PipelineReporter (compositor) states
const frames=ev.filter(e=>e.name==='PipelineReporter'&&e.ph==='b'&&(!pidFor.size||pidFor.has(e.pid)));
const states={};for(const f of frames){const s=f.args?.chrome_frame_reporter?.state||'?';states[s]=(states[s]||0)+1}
const layoutCount=ev.filter(e=>onMain(e)&&e.name==='Layout').length;
const forced=ev.filter(e=>onMain(e)&&e.name==='Layout'&&e.args?.beginData?.stackTrace).length;
console.log(JSON.stringify({mainThreads:mains.length,windowMs:+((t1-t0)/1000).toFixed(0),longTasksOver50ms:long.length,longTaskMs:long.slice(0,15),mainThreadMsByEvent:sum,layoutEvents:layoutCount,layoutsWithJsStack_forced:forced,frameStates:states},null,1));
