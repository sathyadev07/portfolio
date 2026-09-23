import {useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {Phone} from 'lucide-react';
import {COPY} from '../../data/portfolio';
import {buildMorph,readSource,type Morph} from '../../portfolio/morph/containerMorph';
import {isKeyboardModality} from '../../portfolio/morph/inputModality';
import useOutsideClick from '../../hooks/useOutsideClick';
import PhoneMenu from './PhoneMenu';
export default function PhoneControl(){
 /* `mounted` is a session id, 0 when unmounted. A reopen requested after the
    close finished but before React committed the unmount gets a NEW id, so the
    layout effect tears the old morph down and builds a fresh one. With a plain
    boolean, false-then-true batched into "no change": the effect never re-ran
    and the menu sat open with no animation owner. */
 const [mounted,setMounted]=useState(0),[open,setOpen]=useState(false),[status,setStatus]=useState('');
 const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),first=useRef<HTMLAnchorElement>(null),panel=useRef<HTMLDivElement>(null);
 const motion=useRef<Morph|null>(null),desired=useRef(false),restore=useRef(false),alive=useRef(true),session=useRef(0);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[]);
 const drive=useCallback((next:boolean,returnFocus=false)=>{
  desired.current=next;restore.current=returnFocus;setOpen(next);
  if(next&&!motion.current){setMounted(++session.current);return}
  const current=motion.current;
  if(!current)return;
  void current.play(next).then(valid=>{
   if(!valid||!alive.current)return;
   if(desired.current){if(isKeyboardModality()&&document.activeElement===trigger.current)first.current?.focus({preventScroll:true})}
   else{
    /* Unmount only after the reverse has finished, and leave the finished
       effects in place until React removes the node. Cancelling here dropped
       the fill:'both' end state before the unmount committed, so for a frame
       the full open menu flashed back — the "abrupt disappearance". The
       layout effect's cleanup cancels once the node is gone. */
    const focusInside=panel.current?.contains(document.activeElement);
    motion.current=null;setMounted(0);
    if(restore.current||focusInside)trigger.current?.focus({preventScroll:true,focusVisible:isKeyboardModality()});
   }
  });
 },[]);
 /* Both refs are exempt from the dismiss listener: without the trigger, pressing
    it while open would count as an outside press and toggle the menu twice. */
 const guarded=useMemo(()=>[root],[]);
 useOutsideClick(mounted>0&&open,guarded,useCallback(()=>drive(false),[drive]));
 useLayoutEffect(()=>{
  if(!mounted)return;
  // The morph this session owns, even after drive() has let go of motion.current.
  let owned:Morph|null=null;
  const build=()=>{owned=buildMorph(panel.current!,readSource(trigger.current),{popover:true});motion.current=owned};
  const place=()=>{
   const el=panel.current!,anchor=root.current!.getBoundingClientRect();
   const width=el.getBoundingClientRect().width;
   const left=Math.max(8,Math.min(anchor.right-width,document.documentElement.clientWidth-width-8));
   el.style.left=`${left-anchor.left}px`;el.style.right='auto';el.style.transform='none';
  };
  place();
  build();drive(desired.current);
  const resize=()=>{
   if(motion.current!==owned)return;
   const time=owned?.time()??0;owned?.cancel();place();build();owned!.seek(time);drive(desired.current);
  };
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();drive(false,true)}};
  window.addEventListener('resize',resize);document.addEventListener('keydown',escape,true);
  return()=>{owned?.cancel();if(motion.current===owned)motion.current=null;window.removeEventListener('resize',resize);document.removeEventListener('keydown',escape,true)};
 },[mounted,drive]);
 async function copy(){try{await navigator.clipboard.writeText(COPY.phone);if(alive.current)setStatus('Number copied.')}catch{if(alive.current)setStatus(`Copy: ${COPY.phone}`)}}
 return <div className="phone-control" ref={root} onBlur={e=>{if(e.relatedTarget&&!e.currentTarget.contains(e.relatedTarget))drive(false)}}>
  <button ref={trigger} type="button" className="contact-control glow-box glow-tight" aria-label="Phone actions" aria-expanded={open} aria-controls="phone-actions" data-od-id="phone-control" onClick={()=>{setStatus('');drive(!desired.current)}}><Phone size={24} strokeWidth={1.5} aria-hidden="true"/></button>
  {mounted>0&&<PhoneMenu panelRef={panel} firstRef={first} open={open} status={status} onCopy={copy}/>}
 </div>;
}
