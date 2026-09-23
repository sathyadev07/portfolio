import {ArrowUpRight} from 'lucide-react';
import {COPY} from '../../data/portfolio';
import Button from '../../components/Button';
import type {OpenDetail} from '../PanelShell';
/* Both labels are marked as the morph's title anchor: the button's own text is
   what the detail heading grows out of, so the label does not simply blink off
   when the surface starts expanding. */
export default function HeroSection({onOpen}:{onOpen:OpenDetail}){
 return <section data-od-id="portfolio-hero" id="hero" className="portfolio-hero portfolio-section" aria-labelledby="hero-title">
  <p className="portfolio-eyebrow">{COPY.role}</p>
  <h1 id="hero-title" data-od-id="hero-title" className="portfolio-display portfolio-name">{COPY.name}</h1>
  <div className="portfolio-actions od-cluster">
   <Button data-od-id="view-resume" className="primary doc-button" onClick={e=>onOpen('resume',e.currentTarget)} aria-haspopup="dialog"><span data-morph="title">View Resume</span> <ArrowUpRight size={18} strokeWidth={1.5} aria-hidden="true"/></Button>
   <Button data-od-id="view-portfolio-pdf" className="doc-button" onClick={e=>onOpen('portfolio',e.currentTarget)} aria-haspopup="dialog"><span data-morph="title">View Portfolio PDF</span> <ArrowUpRight size={18} strokeWidth={1.5} aria-hidden="true"/></Button>
  </div>
 </section>;
}
