import {useRef} from 'react';
import HeroSection from './sections/HeroSection';
import AboutSection from './sections/AboutSection';
import ExperienceSection from './sections/ExperienceSection';
import ProjectsSection from './sections/ProjectsSection';
import useReveal from '../hooks/useReveal';
import type {OpenDetail} from './PanelShell';
import '../styles/portfolio.css';
/* One observer for the page, owned here. Every [data-reveal] descendant is
   registered once; anything already on screen at first paint is marked visible
   without a transition, so the hero never fades in and LCP is untouched. */
export default function PortfolioContent({onOpenDetail}:{onOpenDetail:OpenDetail}){
 const root=useRef<HTMLElement>(null);
 useReveal(root);
 return <main ref={root} id="main-content" data-od-id="portfolio-content" className="portfolio-document">
  <HeroSection onOpen={onOpenDetail}/>
  <AboutSection/>
  <ExperienceSection onOpen={onOpenDetail}/>
  <ProjectsSection onOpen={onOpenDetail}/>
 </main>;
}
