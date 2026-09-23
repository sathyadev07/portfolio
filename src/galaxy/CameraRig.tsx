import {useRef,type RefObject} from 'react';
import {useFrame, useThree} from '@react-three/fiber';
import {Vector3, type Group} from 'three';
import {journeyPosition,type JourneyState} from './journeyMath';
import {cameraAt} from './journeyPath';

/* The camera is the spaceship.
 *
 * Its pose comes straight from the shared route: position at the current point on
 * the curve, aimed at the point a fixed arc ahead. Because that look-ahead equals
 * the arrival stand-off, a settled camera is looking exactly at its destination
 * and a flying camera is looking along the path it is flying — one rule, so
 * position and orientation can never drift apart into a backwards-looking pivot.
 *
 * Forward input only ever increases the journey scalar, so the camera closes on a
 * destination, passes through it, and carries on to the next one. It never backs
 * away to reveal the next scene.
 */
export default function CameraRig({journey,reduced,frame}:{journey:RefObject<JourneyState>;reduced:boolean;frame:RefObject<Group|null>}){
 const camera=useThree(state=>state.camera);
 const position=useRef(new Vector3()),target=useRef(new Vector3());
 useFrame(()=>{
  const state=journey.current;
  /* Reduced motion keeps the camera stationary at each destination instead of
     flying: it takes the pose of whichever stop the journey is headed for. */
  const progress=reduced?(state.phase==='travel'?state.to:state.stop):journeyPosition(state);
  const pose=cameraAt(progress);
  position.current.copy(pose.position);
  target.current.copy(pose.target);
  /* Resolve through the galaxy's own frame, so the route stays welded to the
     star field even if that frame is ever given a transform. */
  frame.current?.updateWorldMatrix(true,false);
  const matrix=frame.current?.matrixWorld;
  if(matrix){position.current.applyMatrix4(matrix);target.current.applyMatrix4(matrix)}
  camera.position.copy(position.current);
  camera.up.set(0,0,1); // the disc normal, so the galaxy reads level in flight
  camera.lookAt(target.current);
 },-2);
 return null;
}
