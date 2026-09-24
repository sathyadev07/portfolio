import {useMemo,useRef} from 'react';
import {Object3D,type Group} from 'three';
import GalaxyCanvas,{useMediaQuery} from './GalaxyCanvas';
import BlackHole from './BlackHole';
import CameraRig from './CameraRig';
import useJourney from './useJourney';
import useJourneyInput from './useJourneyInput';
import {wrap} from './journeyMath';
import {anchorBasis} from './journeyPath';
import {ANCHORS} from './galaxySpace';
import {DESTINATIONS} from './waypoints';
import DestinationContent from './destinations/DestinationContent';
import DestinationProjector from './destinations/DestinationProjector';
import type {OpenDetail} from '../portfolio/PanelShell';
import '../styles/galaxy.css';

/* Cool Stuff ON. Every destination is a real object at a real coordinate around
 * the black hole, mounted once and projected from its own world transform. There is
 * no overlay layer, no scroll-threshold reveal and no overview stop. */
export default function GalaxyScene({paused,onOpenDetail,onExit}:{paused:boolean;onOpenDetail:OpenDetail;onExit:()=>void}){
 const reduced=useMediaQuery('(prefers-reduced-motion: reduce)');
 const root=useRef<HTMLElement>(null),space=useRef<HTMLDivElement>(null),frame=useRef<Group>(null);
 const nodes=useRef<(HTMLElement|null)[]>([]);
 const journey=useJourney(paused);
 useJourneyInput(root,journey.input,paused,onExit);

 /* The anchors live in the galaxy's own frame, so they stay embedded in their
    branch whatever that frame does. Orientation is fixed once from the route
    tangent — a destination never re-aims itself per frame. */
 const anchors=useMemo(()=>ANCHORS.map((anchor,index)=>{
  const object=new Object3D();
  object.position.set(...anchor.position);
  object.quaternion.setFromRotationMatrix(anchorBasis(index));
  object.matrixAutoUpdate=false;
  object.updateMatrix();
  object.updateMatrixWorld(true);
  return object;
 }),[]);
 const arrivalDistances=useMemo(()=>ANCHORS.map(anchor=>anchor.arrivalDistance),[]);

 const settled=journey.view.travelling?-1:wrap(journey.view.from,DESTINATIONS.length);

 return <div className="galaxy-mode">
  <GalaxyCanvas reducedMotion={false}>
   <group ref={frame}>
    <BlackHole reducedMotion={reduced}/>
    {anchors.map((object,index)=><primitive key={ANCHORS[index].id} object={object}/>)}
   </group>
   <CameraRig journey={journey.state} reduced={reduced} frame={frame}/>
   <DestinationProjector anchors={anchors} nodes={nodes} space={space} arrivalDistances={arrivalDistances}/>
  </GalaxyCanvas>
  <main ref={root} id="main-content" className="journey-stage" data-od-id="journey-stage" aria-label="Black hole journey" tabIndex={-1}>
   <p className="sr-only">Scroll or swipe to travel past the black hole. Arrow up and down also move through the journey. Activate an experience or project to read its details. Escape returns to the portfolio.</p>
   <div ref={space} className="journey-space">
    {DESTINATIONS.map((destination,index)=><div
      key={destination.id}
      ref={node=>{nodes.current[index]=node}}
      className={`journey-object${destination.kind==='hero'?' journey-object--hero':''}`}
      data-od-id={`journey-object-${destination.id}`}
      aria-hidden={settled!==index||undefined}>
     <div className="journey-object-content">
      <DestinationContent destination={destination} onOpen={onOpenDetail} interactive={settled===index&&!paused}/>
     </div>
    </div>)}
   </div>
   <span className="sr-only" role="status" aria-live="polite">{settled>=0?DESTINATIONS[settled].label:''}</span>
  </main>
 </div>;
}
