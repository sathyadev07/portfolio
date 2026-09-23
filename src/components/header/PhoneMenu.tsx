import type {RefObject} from 'react';
import {COPY} from '../../data/portfolio';
/* The menu panel only. It wraps its content and nothing more: the status line
   no longer reserves a height for a message that is usually absent, which is
   what left dead space under the copy button. The panel is height:auto, so when
   a status does appear the box grows to it. */
export default function PhoneMenu({panelRef,firstRef,open,status,onCopy}:{
 panelRef:RefObject<HTMLDivElement|null>;
 firstRef:RefObject<HTMLAnchorElement|null>;
 open:boolean;status:string;onCopy:()=>void;
}){
 return <div ref={panelRef} id="phone-actions" className="phone-actions glow-box" data-morph-rise data-od-id="phone-actions" inert={!open}>
  <p className="od-nowrap">{COPY.phone}</p>
  <a ref={firstRef} className="portfolio-button" href={COPY.phoneHref} data-od-id="phone-call">Call</a>
  <button type="button" className="portfolio-button" data-od-id="phone-copy" onClick={onCopy}>Copy number</button>
  {status&&<p className="copy-status" data-od-id="phone-copy-status">{status}</p>}
  <p className="sr-only" role="status">{status}</p>
 </div>;
}
