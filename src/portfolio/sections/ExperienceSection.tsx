import SikorskyPanel from '../panels/SikorskyPanel';
import FormulaSaePanel from '../panels/FormulaSaePanel';
import type {OpenDetail} from '../PanelShell';
export default function ExperienceSection({onOpen}:{onOpen:OpenDetail}){
 return <section data-od-id="portfolio-experience" id="experience" className="portfolio-section" aria-labelledby="experience-title">
  <h2 id="experience-title" className="portfolio-display" data-od-id="experience-title">WORK EXPERIENCE</h2>
  <div className="portfolio-work-list">
   <SikorskyPanel onOpen={onOpen}/>
   <FormulaSaePanel onOpen={onOpen}/>
  </div>
 </section>;
}
