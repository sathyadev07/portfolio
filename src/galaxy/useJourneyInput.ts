import {useEffect,useRef,type RefObject} from 'react';
export default function useJourneyInput(root:RefObject<HTMLElement|null>,input:(delta:number)=>void,paused:boolean,onExit:()=>void){
 const latest=useRef({input,paused,onExit});latest.current={input,paused,onExit};
 useEffect(()=>{
  const el=root.current;if(!el)return;
  let startX=0,startY=0,lastY=0,moved=false,touchActive=false,suppressUntil=0;
  const blocked=()=>latest.current.paused||!!document.querySelector('dialog[open]');
  const wheel=(e:WheelEvent)=>{if(blocked()||e.ctrlKey||e.metaKey||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;e.preventDefault();latest.current.input(e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1))};
  const start=(e:TouchEvent)=>{if(blocked()||e.touches.length!==1)return;const p=e.touches[0];startX=p.clientX;startY=lastY=p.clientY;moved=false;touchActive=true};
  const move=(e:TouchEvent)=>{if(blocked()||!touchActive||e.touches.length!==1)return;const p=e.touches[0];if(Math.hypot(p.clientX-startX,p.clientY-startY)>9)moved=true;if(moved){e.preventDefault();latest.current.input((lastY-p.clientY)*2);suppressUntil=performance.now()+450}lastY=p.clientY};
  const end=()=>{touchActive=false;if(moved)suppressUntil=performance.now()+450};
  const click=(e:MouseEvent)=>{if(e.detail!==0&&performance.now()<suppressUntil){e.preventDefault();e.stopPropagation()}};
  const key=(e:KeyboardEvent)=>{if(blocked()||e.defaultPrevented)return;if(e.key==='Escape'){latest.current.onExit();return}if(e.target instanceof Element&&e.target.closest('header,input,textarea,select'))return;if(['ArrowDown','PageDown','ArrowUp','PageUp'].includes(e.key)){e.preventDefault();latest.current.input(e.key==='ArrowDown'||e.key==='PageDown'?100:-100)}};
  el.addEventListener('wheel',wheel,{passive:false});el.addEventListener('touchstart',start,{passive:true});el.addEventListener('touchmove',move,{passive:false});el.addEventListener('touchend',end);el.addEventListener('touchcancel',end);el.addEventListener('click',click,true);window.addEventListener('keydown',key);
  return()=>{el.removeEventListener('wheel',wheel);el.removeEventListener('touchstart',start);el.removeEventListener('touchmove',move);el.removeEventListener('touchend',end);el.removeEventListener('touchcancel',end);el.removeEventListener('click',click,true);window.removeEventListener('keydown',key)};
 },[root]);
}
