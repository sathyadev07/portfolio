import HeroSection from './sections/HeroSection';
import AboutSection from './sections/AboutSection';
import ExperienceSection from './sections/ExperienceSection';
import ProjectsSection from './sections/ProjectsSection';
import type {OpenDetail} from './PanelShell';
import '../styles/portfolio.css';
/* Every section is fully visible from first paint: there is no scroll-driven
   reveal, so nothing fades, slides or shifts in while the page scrolls. */
export default function PortfolioContent({onOpenDetail}:{onOpenDetail:OpenDetail}){
 return <main id="main-content" data-od-id="portfolio-content" className="portfolio-document">
  <HeroSection onOpen={onOpenDetail}/>
  <AboutSection/>
  <ExperienceSection onOpen={onOpenDetail}/>
  <ProjectsSection onOpen={onOpenDetail}/>
  <footer className="model-credit">Black hole simulation by <a href="https://github.com/dgreenheck/webgpu-black-hole" target="_blank" rel="noopener noreferrer">Daniel Greenheck</a> · <a href="https://opensource.org/license/mit" target="_blank" rel="noopener noreferrer">MIT</a>. Camera adapted for scroll.</footer>
 </main>;
}
