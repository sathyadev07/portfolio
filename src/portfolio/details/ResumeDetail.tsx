import {ArrowUpRight} from 'lucide-react';
import {useRef,useState} from 'react';
import {COPY,asset} from '../../data/portfolio';
import Button from '../../components/Button';
import GlowMedia from '../../components/ui/GlowMedia';
/* The large amber RESUME heading and the "PDF unavailable?" line are both gone
   from the markup, not hidden. Two consequences handled here rather than left
   to break:
   - the dialog names itself with aria-labelledby="detail-title", so a
     screen-reader-only <h2> keeps that id and the heading outline intact;
   - that line was the no-embed fallback, so Open PDF and Download PDF are now
     the only fallback and stay above the embed where a failed frame leaves them
     visible.
   The heading is no longer the morph's title anchor: a 1px sr-only box would
   give the shared-element transition nonsense geometry to grow from. */
export default function ResumeDetail(){
 const frame=useRef<HTMLIFrameElement>(null),[status,setStatus]=useState('');
 return <>
  <h2 id="detail-title" className="sr-only">Resume</h2>
  <div className="portfolio-actions od-cluster">
   <a className="portfolio-button" href={asset(COPY.resumePdf)} target="_blank" rel="noopener noreferrer" data-od-id="resume-open">Open PDF <ArrowUpRight size={18} strokeWidth={1.5} aria-hidden="true"/></a>
   <a className="portfolio-button" href={asset(COPY.resumePdf)} download="Sathya-Devarajan-Resume.pdf" data-od-id="resume-download">Download PDF</a>
   <Button data-od-id="resume-print" onClick={()=>{try{frame.current?.contentWindow?.focus();frame.current?.contentWindow?.print();setStatus('If printing does not open, use Open PDF and its print control.')}catch{setStatus('Open the PDF and use its print control.')}}}>Print</Button>
  </div>
  {status&&<p data-od-id="resume-print-status">{status}</p>}
  <p className="sr-only" role="status">{status}</p>
  <GlowMedia tilt={false} className="portfolio-resume-frame">
   <iframe ref={frame} className="portfolio-resume" title="Sathya Devarajan resume PDF" src={asset(COPY.resumePdf)}/>
  </GlowMedia>
 </>;
}
