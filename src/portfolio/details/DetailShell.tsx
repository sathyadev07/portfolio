import {useCallback,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {X} from 'lucide-react';
import Button from '../../components/Button';
import {buildMorph,morphMs,readSource,type Morph,type SourceGeometry} from '../morph/containerMorph';
import {isKeyboardModality} from '../morph/inputModality';

export default function DetailShell({children,onClose,origin,entryId,footer}:{children:ReactNode;onClose:()=>void;origin:HTMLElement|null;entryId:string;footer?:ReactNode}){
 const dialog=useRef<HTMLDialogElement>(null),body=useRef<HTMLDivElement>(null);
 const motion=useRef<Morph|null>(null),source=useRef<SourceGeometry|null>(null);
 const desired=useRef(true),alive=useRef(false),finish=useRef(onClose);finish.current=onClose;
 const [closing,setClosing]=useState(false);
 /* `desired` is the intent; `closing` is only the paint of it. The toggle reads
    the ref so a second click inside the same frame — before the state lands —
    reverses the close instead of restarting it, and Esc during a close is
    idempotent rather than ignored. */
 const drive=useCallback((open:boolean)=>{
  desired.current=open;setClosing(!open);
  /* The destination geometry was measured when the detail opened. After the
     body scrolls, the title's layout box has moved but its keyframes have not,
     so the close landed off the card by the scroll distance and the handover
     jumped. From a settled open state, re-measure before closing. */
  if(!open&&motion.current&&motion.current.time()===morphMs()&&(body.current?.scrollTop??0)>0&&dialog.current){
   motion.current.cancel();motion.current=buildMorph(dialog.current,source.current);motion.current.seek(morphMs());
  }
  const current=motion.current;
  if(!current){if(!open&&alive.current)finish.current();return}
  void current.play(open).then(valid=>{if(valid&&alive.current&&!desired.current)finish.current()});
 },[]);
 useLayoutEffect(()=>{
  alive.current=true;desired.current=true;setClosing(false);
  const el=dialog.current!,root=document.documentElement;
  const oldOverflow=document.body.style.overflow,oldRootOverflow=root.style.overflow;
  const previous=origin??document.activeElement as HTMLElement;
  source.current=readSource(origin);
  // Root scrollbar-gutter keeps the same content width while scroll is locked.
  root.style.overflow='hidden';document.body.style.overflow='hidden';
  el.showModal();
  motion.current=buildMorph(el,source.current);drive(true);
  const resize=()=>{
   const time=motion.current?.time()??0;
   motion.current?.cancel();source.current?.release();source.current=readSource(origin);
   motion.current=buildMorph(el,source.current);motion.current.seek(time);drive(desired.current);
  };
  window.addEventListener('resize',resize);
  return()=>{
   alive.current=false;window.removeEventListener('resize',resize);
   motion.current?.cancel();motion.current=null;
   source.current?.release();source.current=null;
   el.close();document.body.style.overflow=oldOverflow;root.style.overflow=oldRootOverflow;
   if(previous?.isConnected)previous.focus({preventScroll:true,focusVisible:isKeyboardModality()});
  };
 },[]);
 // The footer arrives as a prop; mark it inert with the body.
 useLayoutEffect(()=>{
  const foot=dialog.current?.querySelector<HTMLElement>('.portfolio-dialog-shell>footer');
  if(foot)foot.inert=closing;
 },[closing,footer]);
 const lastEntry=useRef(entryId);
 useLayoutEffect(()=>{
  body.current?.scrollTo(0,0);
  if(lastEntry.current===entryId)return;
  lastEntry.current=entryId;
  // New detail children need their own effects, at the SAME container progress.
  const time=motion.current?.time()??0;
  motion.current?.cancel();motion.current=buildMorph(dialog.current!,source.current);
  motion.current.seek(time);drive(true);
 },[entryId,drive]);
 return <dialog ref={dialog} className="portfolio-dialog" aria-labelledby="detail-title" data-od-id="portfolio-detail-dialog" onCancel={e=>{e.preventDefault();drive(false)}}>
  <div className="portfolio-dialog-shell">
   <header className="portfolio-dialog-bar">
    <span className="portfolio-eyebrow">{entryId==='resume'?'RESUME':entryId==='portfolio'?'PORTFOLIO':'ENGINEERING PORTFOLIO'}</span>
    <Button data-od-id="close-detail" autoFocus onClick={()=>drive(!desired.current)} aria-label={closing?'Keep detail open':'Close detail'}>{closing?'Keep open':'Close'} <X size={18} strokeWidth={1.5} aria-hidden="true"/></Button>
   </header>
   {/* Content fades out first on close; while it is invisible it must not
       take clicks or focus. The Close / Keep open button stays live, since it
       is how a close is reversed. */}
   <div ref={body} className="portfolio-detail-body" inert={closing}><div className="detail-content">{children}</div></div>
   {footer}
  </div>
 </dialog>;
}
