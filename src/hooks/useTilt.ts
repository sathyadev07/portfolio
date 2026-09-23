import {useCallback,useEffect,useRef} from 'react';
/* Pointer tilt for a media panel. transform only, one rAF per frame, and the
   listeners live on the element rather than the document.
   It yields in three situations the brief calls out: a coarse pointer or
   reduced-motion request never tilts at all; a pointerdown inside the panel
   suspends it so a drag reaches OrbitControls instead of fighting it; and
   will-change is set on enter and dropped on leave rather than left standing. */
const MAX=7;
export default function useTilt(){
 const frame=useRef(0),pose=useRef({rx:0,ry:0}),node=useRef<HTMLElement|null>(null),held=useRef(false);
 const allowed=()=>matchMedia('(hover:hover) and (pointer:fine)').matches
  &&!matchMedia('(prefers-reduced-motion:reduce)').matches;
 const apply=useCallback(()=>{
  frame.current=0;const el=node.current;if(!el)return;
  el.style.transform=`perspective(900px) rotateX(${pose.current.rx}deg) rotateY(${pose.current.ry}deg)`;
 },[]);
 const flatten=useCallback(()=>{
  const el=node.current;if(!el)return;
  if(frame.current){cancelAnimationFrame(frame.current);frame.current=0}
  el.style.transition='transform 400ms cubic-bezier(.22,1,.36,1)';
  el.style.transform='perspective(900px) rotateX(0deg) rotateY(0deg)';
  el.style.removeProperty('will-change');
 },[]);
 useEffect(()=>()=>{if(frame.current)cancelAnimationFrame(frame.current)},[]);
 return {
  ref:(el:HTMLElement|null)=>{node.current=el},
  onPointerEnter:(event:React.PointerEvent<HTMLElement>)=>{
   if(!allowed())return;
   held.current=false;
   const el=event.currentTarget;el.style.transition='none';el.style.willChange='transform';
  },
  onPointerMove:(event:React.PointerEvent<HTMLElement>)=>{
   if(!allowed()||held.current||event.pointerType!=='mouse')return;
   const box=event.currentTarget.getBoundingClientRect();
   if(!box.width||!box.height)return;
   const x=(event.clientX-box.left)/box.width-.5,y=(event.clientY-box.top)/box.height-.5;
   pose.current={rx:-y*MAX,ry:x*MAX};
   if(!frame.current)frame.current=requestAnimationFrame(apply);
  },
  // A drag belongs to whatever is inside the panel, not to the tilt.
  onPointerDown:()=>{held.current=true;flatten()},
  onPointerUp:(event:React.PointerEvent<HTMLElement>)=>{held.current=false;if(allowed())event.currentTarget.style.transition='none'},
  onPointerLeave:flatten,
  onPointerCancel:flatten,
 };
}
