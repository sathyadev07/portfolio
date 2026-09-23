const fs=require('fs'),vm=require('vm');
const context={window:{}};vm.createContext(context);
for(const file of ['portfolio-data','media','model-map'])vm.runInContext(fs.readFileSync('source/'+file+'.js','utf8'),context);
const content=fs.readFileSync('source/content.js','utf8');
const extract=name=>vm.runInNewContext('('+content.match(new RegExp('const '+name+' = ([\\s\\S]*?);'))[1]+')');
const values={COPY:extract('COPY'),WORK:context.window.EXPERIENCES_DATA,PROJECTS:context.window.PROJECTS_DATA.filter(x=>!['proj-02','proj-05'].includes(x.id)).map((x,i)=>({...x,projNumber:'PROJ-0'+(i+1)})),GALLERIES:extract('GALLERIES'),LOGOS:extract('LOGOS'),VIDEOS:extract('VIDEOS'),MEDIA:context.window.PORTFOLIO_MEDIA,MODELS:context.window.PORTFOLIO_MODELS};
fs.writeFileSync('src/data/portfolio.ts',Object.entries(values).map(([k,v])=>'export const '+k+' = '+JSON.stringify(v,null,2)+';').join('\n\n')+'\nexport const asset = (path: string) => import.meta.env.BASE_URL + path.replace(/^\\//, "");\n');
const html=fs.readFileSync('index-v2.html','utf8');fs.writeFileSync('src/styles/layout.css',html.match(/<style>([\s\S]*?)<\/style>/)[1]);
