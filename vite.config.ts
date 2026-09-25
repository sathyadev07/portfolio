import {defineConfig,type Plugin} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import {readFileSync,writeFileSync,cpSync} from 'node:fs';
import {resolve} from 'node:path';
import {COPY} from './src/data/portfolio';

/* About text has one source: COPY.about in src/data/portfolio.ts.
   This plugin writes it into the static index.html between the ABOUT markers
   (so the file on disk and the ATS-readable HTML always match) on every
   `npm run dev` / `npm run build`, and injects it into the served/built HTML. */
const ABOUT_BLOCK=/(<!-- ABOUT:START[^>]*-->)[\s\S]*?(\n\s*<!-- ABOUT:END -->)/;
const escapeHtml=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const aboutHtml=()=>COPY.about.split(/\n\s*\n/).map(p=>`    <p class="intro-text">${escapeHtml(p.trim())}</p>`).join('\n');
const withAbout=(html:string)=>html.replace(ABOUT_BLOCK,(_,start,end)=>`${start}\n${aboutHtml()}${end}`);

function aboutSync():Plugin{
 let root=process.cwd();
 return {
  name:'about-sync',
  configResolved(config){root=config.root},
  buildStart(){
   const file=resolve(root,'index.html');
   const html=readFileSync(file,'utf8');
   const next=withAbout(html);
   if(next!==html)writeFileSync(file,next);
  },
  transformIndexHtml:{order:'pre',handler:withAbout},
 };
}

/* assets/ (PDFs, images, models, fonts, video, decoders) is the single copy of
   every site asset. Dev serves it straight from the project root; the build
   copies it to dist/assets so runtime paths like ./assets/Resume.pdf and the
   Cool Mode app's asset('assets/…') URLs resolve on GitHub Pages. */
function copyAssets():Plugin{
 let root=process.cwd(),outDir='dist';
 return {
  name:'copy-assets',
  apply:'build',
  configResolved(config){root=config.root;outDir=resolve(config.root,config.build.outDir)},
  closeBundle(){cpSync(resolve(root,'assets'),resolve(outDir,'assets'),{recursive:true,filter:src=>!/\.(md|zip)$/i.test(src)})},
 };
}

export default defineConfig({base:'./',plugins:[aboutSync(),copyAssets(),react(),tailwindcss()],build:{outDir:'dist',assetsDir:'bundled'}});
