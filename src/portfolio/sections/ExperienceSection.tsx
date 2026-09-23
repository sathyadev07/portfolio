import SikorskyPanel from '../panels/SikorskyPanel';
import FormulaSaePanel from '../panels/FormulaSaePanel';
import RevealOnScroll from '../../components/ui/RevealOnScroll';
import type {OpenDetail} from '../PanelShell';
/* The reveal wrapper is outside the card, never on it: the card owns its tilt
   transform and the morph reads its geometry, so two transforms on one node
   would overwrite each other. */
export default function ExperienceSection({onOpen}:{onOpen:OpenDetail}){
 return <section data-od-id="portfolio-experience" id="experience" className="portfolio-section" aria-labelledby="experience-title">
  <h2 id="experience-title" className="portfolio-display" data-od-id="experience-title">WORK EXPERIENCE</h2>
  <div className="portfolio-work-list">
   <RevealOnScroll step={0}><SikorskyPanel onOpen={onOpen}/></RevealOnScroll>
   <RevealOnScroll step={1}><FormulaSaePanel onOpen={onOpen}/></RevealOnScroll>
  </div>
 </section>;
}
