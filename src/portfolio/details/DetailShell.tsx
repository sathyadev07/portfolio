import {useCallback,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {X} from 'lucide-react';
import Button from '../../components/Button';
import {buildMorph,morphMs,readSource,type Morph,type SourceGeometry} from '../morph/containerMorph';
import {isKeyboardModality} from '../morph/inputModality';

/* Pause handshake for the background renderer. The root carries
   data-detail-covering="true" only while the detail dialog, settled at the end
   of its open morph, covers the whole viewport: nothing behind it needs a new
   frame then. It is cleared synchronously at the start of a close (before the
   close's first frame), and on unmount. Previous/Next never clears it. */
const uncover=()=>{delete document.documentElement.dataset.detailCovering};
function markCovering(el:HTMLDialogElement){
 /* The root's own box, not clientWidth: with scrollbar-gutter:stable and the
    page scroll-locked, clientWidth includes the empty gutter while the dialog
    and the fixed background both stop at the gutter's edge. */
 const r=el.getBoundingClientRect(),vw=document.documentElement.getBoundingClientRect().width,vh=innerHeight;
 const covers=el.open&&r.left<=.5&&r.top<=.5&&r.right>=vw-.5&&r.bottom>=vh-.5;
 if(covers)document.documentElement.dataset.detailCovering='true';else uncover();
}
export default function DetailShell({children,onClose,origin,entryId,footer}:{children:ReactNode;onClose:()=>void;origin:HTMLElement|null;entryId:string;footer?:ReactNode}){
 const dialog=useRef<HTMLDialogElement>(null),body=useRef<HTMLDivElement>(null);
 const motion=useRef<Morph|null>(null),source=useRef<SourceGeometry|null>(null);
 /* `from` is the element the current source geometry was read from; `home` is
    the element the dialog should close into and hand focus back to. They
    differ only after Previous/Next: the dialog then shows another entry, and
    closing morphs into THAT entry's card instead of cross-fading its title
    into the card that opened the dialog. */
 const from=useRef<HTMLElement|null>(null),home=useRef<HTMLElement|null>(null);
 const desired=useRef(true),alive=useRef(false),finish=useRef(onClose);finish.current=onClose;
 const [closing,setClosing]=useState(false);
 /* `desired` is the intent; `closing` is only the paint of it. The toggle reads
    the ref so a second click inside the same frame — before the state lands —
    reverses the close instead of restarting it, and Esc during a close is
    idempotent rather than ignored. */
 const drive=useCallback((open:boolean)=>{
  // Before anything else, so the background is live for the close's first frame.
  if(!open)uncover();
  desired.current=open;setClosing(!open);
  /* The destination geometry was measured when the detail opened. After the
     body scrolls, the title's layout box has moved but its keyframes have not,
     so the close landed off the card by the scroll distance and the handover
     jumped. From a settled open state, re-measure before closing. */
  const settled=!open&&!!motion.current&&motion.current.time()===morphMs()&&!!dialog.current;
  const retarget=settled&&!!home.current?.isConnected&&home.current!==from.current;
  if(settled&&(retarget||(body.current?.scrollTop??0)>0)){
   if(retarget){
    /* Bring the shown entry's card to where the opening card sat, so the
       dialog collapses onto it in the same place on screen. The page behind
       is covered by the opaque dialog and its backdrop while it scrolls, and
       the shared title now lands on a card with the same words: no
       cross-fade is needed. Reads happen before the scroll write. */
    const target=home.current!,card=(target.closest('.panel-surface')??target).getBoundingClientRect();
    const was=source.current?.rect.top??card.top,max=document.documentElement.scrollHeight-innerHeight;
    const top=Math.max(0,Math.min(max,scrollY+card.top-was));
    if(Math.abs(top-scrollY)>.5)window.scrollTo({top,behavior:'instant'});
    motion.current!.cancel();source.current?.release();
    source.current=readSource(target);from.current=target;
   }else motion.current!.cancel();
   motion.current=buildMorph(dialog.current!,source.current);motion.current.seek(morphMs());
  }
  const current=motion.current;
  if(!current){if(!open&&alive.current)finish.current();return}
  void current.play(open).then(valid=>{
   if(!valid||!alive.current)return;
   /* `valid` means this play was not superseded, so an open resolving here has
      reached its final frame: the clip is the full dialog. */
   if(desired.current){if(dialog.current)markCovering(dialog.current)}
   else finish.current();
  });
 },[]);
 useLayoutEffect(()=>{
  alive.current=true;desired.current=true;setClosing(false);
  const el=dialog.current!,root=document.documentElement;
  const oldOverflow=document.body.style.overflow,oldRootOverflow=root.style.overflow;
  const previous=origin??document.activeElement as HTMLElement;
  from.current=home.current=origin;
  source.current=readSource(origin);
  // Root scrollbar-gutter keeps the same content width while scroll is locked.
  root.style.overflow='hidden';document.body.style.overflow='hidden';
  el.showModal();
  motion.current=buildMorph(el,source.current);drive(true);
  /* Rebuilding re-reads the source card and the whole dialog, so a burst of
     resize events (a window drag, a mobile URL bar) rebuilds once per frame,
     not once per event. Resize events are dispatched in the same rendering
     step, just before rAF callbacks, so the rebuild still lands in that frame. */
  let resizeFrame=0;
  const resize=()=>{
   resizeFrame=0;
   const time=motion.current?.time()??0;
   motion.current?.cancel();source.current?.release();source.current=readSource(from.current);
   motion.current=buildMorph(el,source.current);motion.current.seek(time);drive(desired.current);
  };
  const onResize=()=>{if(!resizeFrame)resizeFrame=requestAnimationFrame(resize)};
  window.addEventListener('resize',onResize,{passive:true});
  return()=>{
   alive.current=false;window.removeEventListener('resize',onResize);if(resizeFrame)cancelAnimationFrame(resizeFrame);
   uncover();
   motion.current?.cancel();motion.current=null;
   source.current?.release();source.current=null;
   el.close();document.body.style.overflow=oldOverflow;root.style.overflow=oldRootOverflow;
   const back=home.current?.isConnected?home.current:previous;
   if(back?.isConnected)back.focus({preventScroll:true,focusVisible:isKeyboardModality()});
  };
 },[]);
 // The footer arrives as a prop; mark it inert with the body.
 useLayoutEffect(()=>{
  const foot=dialog.current?.querySelector<HTMLElement>('.portfolio-dialog-shell>footer');
  if(foot)foot.inert=closing;
 },[closing,footer]);
 const lastEntry=useRef(entryId);
 useLayoutEffect(()=>{
  // Skipped on mount: a fresh body is already at the top, and scrollTo would
  // force a synchronous layout of the whole detail in the opening frame.
  if(lastEntry.current===entryId)return;
  lastEntry.current=entryId;
  body.current?.scrollTo(0,0);
  // The card this entry lives on, if the page has one (the close morphs into it).
  home.current=document.querySelector<HTMLElement>(`[data-od-id="open-detail-${CSS.escape(entryId)}"]`)??home.current;
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
