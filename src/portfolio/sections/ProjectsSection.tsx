import BikeFramePanel from '../panels/BikeFramePanel';
import TopographyPanel from '../panels/TopographyPanel';
import AudioEqualizerPanel from '../panels/AudioEqualizerPanel';
import SimulationPanel from '../panels/SimulationPanel';
import RevealOnScroll from '../../components/ui/RevealOnScroll';
import type {OpenDetail} from '../PanelShell';
export default function ProjectsSection({onOpen}:{onOpen:OpenDetail}){
 return <section data-od-id="portfolio-projects" id="projects" className="portfolio-section" aria-labelledby="projects-title">
  <h2 id="projects-title" className="portfolio-display" data-od-id="projects-title">ENGINEERING PROJECTS</h2>
  <div className="portfolio-project-list">
   <RevealOnScroll step={0}><BikeFramePanel onOpen={onOpen}/></RevealOnScroll>
   <RevealOnScroll step={1}><TopographyPanel onOpen={onOpen}/></RevealOnScroll>
   <RevealOnScroll step={2}><AudioEqualizerPanel onOpen={onOpen}/></RevealOnScroll>
   <RevealOnScroll step={3}><SimulationPanel onOpen={onOpen}/></RevealOnScroll>
  </div>
 </section>;
}
