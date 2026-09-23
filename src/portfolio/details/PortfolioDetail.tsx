import {ArrowUpRight} from 'lucide-react';
import {COPY,asset} from '../../data/portfolio';
import GlowMedia from '../../components/ui/GlowMedia';
/* Same treatment as the resume detail: the amber PORTFOLIO heading and the
   "Open the portfolio directly." line are removed from the markup, the section
   keeps an accessible name through a screen-reader-only heading, and the two
   buttons are the only embed fallback. */
export default function PortfolioDetail(){
 return <>
  <h2 id="detail-title" className="sr-only">Portfolio</h2>
  <div className="portfolio-actions od-cluster">
   <a className="portfolio-button" href={asset(COPY.portfolioPdf)} target="_blank" rel="noopener noreferrer" data-od-id="portfolio-open">Open PDF <ArrowUpRight size={18} strokeWidth={1.5} aria-hidden="true"/></a>
   <a className="portfolio-button" href={asset(COPY.portfolioPdf)} download="Sathya-Devarajan-Portfolio.pdf" data-od-id="portfolio-download">Download PDF</a>
  </div>
  <GlowMedia tilt={false} className="portfolio-resume-frame">
   <iframe className="portfolio-resume" title="Sathya Devarajan engineering portfolio PDF" src={asset(COPY.portfolioPdf)}/>
  </GlowMedia>
 </>;
}
