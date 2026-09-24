import {Suspense,useEffect,useRef,useState,type ComponentRef,type RefObject} from 'react';
import {Canvas} from '@react-three/fiber';
import {Html,OrbitControls} from '@react-three/drei';
import {ACESFilmicToneMapping} from 'three';
import {MODELS,asset} from '../data/portfolio';
import {useMediaQuery} from '../galaxy/GalaxyCanvas';
import ModelPresentation,{type Orientation} from './viewer/ModelPresentation';
import LightingRig from './viewer/LightingRig';
import ViewerBoundary from './viewer/ViewerBoundary';
import Button from '../components/Button';

import '../styles/viewer.css';
/* A viewer's WebGL context, model download and shader compiles cost hundreds
   of milliseconds of main thread on a phone. Created while the detail dialog
   was still morphing open, that work landed inside the animation and the box
   snapped to full screen instead of growing into it. So a viewer:
   - mounts its canvas only once the dialog has settled open
     (dialog[data-settled]) AND the viewer is within a screen of view;
   - pauses when the dialog closes, the viewer leaves view, or the tab hides;
   - draws on demand when auto-rotation is off, including reduced-motion mode.
   Once mounted the canvas stays mounted, so scrolling back does not pay the
   setup cost again. The browser chooses the actual GPU for the renderer. */
function useViewerActive(target:RefObject<HTMLElement|null>){
 const [settled,setSettled]=useState(false),[near,setNear]=useState(false);
 const [visible,setVisible]=useState(()=>!document.hidden);
 useEffect(()=>{
  const el=target.current;if(!el)return;
  const dialog=el.closest('dialog');
  const readSettled=()=>setSettled(dialog?dialog.dataset.settled==='true':true);
  const readVisible=()=>setVisible(!document.hidden);
  readSettled();
  readVisible();
  document.addEventListener('visibilitychange',readVisible);
  const mo=dialog?new MutationObserver(readSettled):null;
  if(dialog)mo?.observe(dialog,{attributes:true,attributeFilter:['data-settled']});
  const io=new IntersectionObserver(([entry])=>setNear(entry.isIntersecting),{rootMargin:'100% 0px'});
  io.observe(el);
  return()=>{document.removeEventListener('visibilitychange',readVisible);mo?.disconnect();io.disconnect()};
 },[target]);
 return settled&&near&&visible;
}
export default function ModelViewer({modelId}:{modelId:string}){
 const spec=MODELS[modelId as keyof typeof MODELS],controls=useRef<ComponentRef<typeof OrbitControls>>(null);
 const [rotating,setRotating]=useState(true),[resetVersion,setResetVersion]=useState(0);
 const reduced=useMediaQuery('(prefers-reduced-motion: reduce)');
 const frame=useRef<HTMLDivElement>(null);
 const active=useViewerActive(frame);
 const [mounted,setMounted]=useState(false);
 useEffect(()=>{if(active)setMounted(true)},[active]);

 if(!spec)return null;
 return <figure className="viewer-block" data-od-id={`viewer-${modelId}`}><figcaption className="portfolio-eyebrow">3D {'—'} {spec.label}</figcaption><div ref={frame} className="viewer-frame is-interactive"><div className="viewer-clip">{mounted?<ViewerBoundary><Canvas frameloop={active?(rotating&&!reduced?'always':'demand'):'never'} camera={{fov:38,near:.01,far:200}} dpr={[1,1.5]} gl={{alpha:true,antialias:true,powerPreference:'high-performance',toneMapping:ACESFilmicToneMapping}} onCreated={({gl})=>{gl.setClearColor('#000000',0);gl.toneMappingExposure=1.2}} fallback={<p className="viewer-note">3D is unavailable. Use the project images above.</p>}><LightingRig/><Suspense fallback={<Html center><p className="viewer-note" role="status">Loading model…</p></Html>}><ModelPresentation url={asset(spec.model)} orientation={spec.orientation as Orientation} controls={controls} resetVersion={resetVersion}/></Suspense><OrbitControls ref={controls} makeDefault enablePan={false} enableRotate enableZoom={false} autoRotate={rotating&&!reduced} autoRotateSpeed={1.2} minDistance={.6} maxDistance={40} target={[0,0,0]}/></Canvas></ViewerBoundary>:<div className="viewer-loading" role="status">Loading 3D model…</div>}</div></div><div className="viewer-controls od-cluster"><Button aria-label={`Zoom in ${spec.label}`} onClick={()=>{const c=controls.current;if(c){c.object.position.sub(c.target).multiplyScalar(1/1.2).add(c.target);c.update()}}}>Zoom in</Button><Button aria-label={`Zoom out ${spec.label}`} onClick={()=>{const c=controls.current;if(c){c.object.position.sub(c.target).multiplyScalar(1.2).add(c.target);c.update()}}}>Zoom out</Button><Button data-od-id={`viewer-rotate-${modelId}`} disabled={reduced} aria-pressed={rotating&&!reduced} onClick={()=>setRotating(!rotating)}>Auto-rotate: {rotating&&!reduced?'on':'off'}</Button><Button data-od-id={`viewer-reset-${modelId}`} onClick={()=>setResetVersion(x=>x+1)}>Reset view</Button><span className="portfolio-meta">Drag to orbit {'·'} use buttons to zoom {'·'} scroll to read</span></div></figure>;
}
