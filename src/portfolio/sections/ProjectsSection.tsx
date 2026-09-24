import BikeFramePanel from '../panels/BikeFramePanel';
import TopographyPanel from '../panels/TopographyPanel';
import AudioEqualizerPanel from '../panels/AudioEqualizerPanel';
import SimulationPanel from '../panels/SimulationPanel';
import type {OpenDetail} from '../PanelShell';
export default function ProjectsSection({onOpen}:{onOpen:OpenDetail}){
 return <section data-od-id="portfolio-projects" id="projects" className="portfolio-section" aria-labelledby="projects-title">
  <h2 id="projects-title" className="portfolio-display" data-od-id="projects-title">ENGINEERING PROJECTS</h2>
  <div className="portfolio-project-list">
   <BikeFramePanel onOpen={onOpen}/>
   <TopographyPanel onOpen={onOpen}/>
   <AudioEqualizerPanel onOpen={onOpen}/>
   <SimulationPanel onOpen={onOpen}/>
  </div>
 </section>;
}
