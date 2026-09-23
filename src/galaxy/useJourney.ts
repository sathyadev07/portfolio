import {useEffect,useRef,useState} from 'react';
import {advance,createJourney,impulse} from './journeyMath';
/* Owns the one authoritative journey state. It no longer animates any DOM: the
   camera reads this state and the destinations are projected from their world
   transforms, so there is a single source of motion. */
export default function useJourney(paused:boolean){
 const state=useRef(createJourney());
 const pausedRef=useRef(paused);pausedRef.current=paused;
 const [view,setView]=useState({from:0,to:1,travelling:false});
 useEffect(()=>{
  let frame=0,last=performance.now(),signature='0:1:dwell';
  const tick=(now:number)=>{
   const dt=Math.min((now-last)/1000,.05);last=now;
   const s=state.current;if(!pausedRef.current)advance(s,dt);
   const key=`${s.from}:${s.to}:${s.phase}`;
   if(key!==signature){signature=key;setView({from:s.from,to:s.to,travelling:s.phase==='travel'})}
   frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
 },[]);
 function input(delta:number){if(!pausedRef.current)impulse(state.current,delta)}
 return {state,view,input};
}
