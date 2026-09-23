import {Suspense,useRef,useState,type ComponentRef} from 'react';
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
export default function ModelViewer({modelId}:{modelId:string}){
 const spec=MODELS[modelId as keyof typeof MODELS],controls=useRef<ComponentRef<typeof OrbitControls>>(null);
 const [rotating,setRotating]=useState(true),[resetVersion,setResetVersion]=useState(0);
 const reduced=useMediaQuery('(prefers-reduced-motion: reduce)');

 if(!spec)return null;
 return <figure className="viewer-block" data-od-id={`viewer-${modelId}`}><figcaption className="portfolio-eyebrow">3D {'—'} {spec.label}</figcaption><div className="viewer-frame is-interactive"><div className="viewer-clip"><ViewerBoundary><Canvas camera={{fov:38,near:.01,far:200}} dpr={[1,1.5]} gl={{alpha:true,antialias:true,toneMapping:ACESFilmicToneMapping}} onCreated={({gl})=>{gl.setClearColor('#000000',0);gl.toneMappingExposure=1.2}} fallback={<p className="viewer-note">3D is unavailable. Use the project images above.</p>}><LightingRig/><Suspense fallback={<Html center><p className="viewer-note" role="status">Loading model…</p></Html>}><ModelPresentation url={asset(spec.model)} orientation={spec.orientation as Orientation} controls={controls} resetVersion={resetVersion}/></Suspense><OrbitControls ref={controls} makeDefault enablePan={false} enableRotate enableZoom={false} autoRotate={rotating&&!reduced} autoRotateSpeed={1.2} minDistance={.6} maxDistance={40} target={[0,0,0]}/></Canvas></ViewerBoundary></div></div><div className="viewer-controls od-cluster"><Button aria-label={`Zoom in ${spec.label}`} onClick={()=>{const c=controls.current;if(c){c.object.position.sub(c.target).multiplyScalar(1/1.2).add(c.target);c.update()}}}>Zoom in</Button><Button aria-label={`Zoom out ${spec.label}`} onClick={()=>{const c=controls.current;if(c){c.object.position.sub(c.target).multiplyScalar(1.2).add(c.target);c.update()}}}>Zoom out</Button><Button data-od-id={`viewer-rotate-${modelId}`} disabled={reduced} aria-pressed={rotating&&!reduced} onClick={()=>setRotating(!rotating)}>Auto-rotate: {rotating&&!reduced?'on':'off'}</Button><Button data-od-id={`viewer-reset-${modelId}`} onClick={()=>setResetVersion(x=>x+1)}>Reset view</Button><span className="portfolio-meta">Drag to orbit {'·'} use buttons to zoom {'·'} scroll to read</span></div></figure>;
}
