import usePanelTilt from '../../hooks/usePanelTilt';
import AboutCopy from './AboutCopy';
/* About copy lives inside a real panel.
   It uses the same .panel-surface the
   work and project cards use. It takes the tilt but not .interactive-panel:
   there is nothing to open here, so it must never show the hover border that
   means "this is clickable". */
export default function AboutSection(){
 const tilt=usePanelTilt();
 return <section data-od-id="portfolio-about" id="about" className="portfolio-section" aria-labelledby="about-title">
  <div className="portfolio-about panel-surface" data-od-id="about-panel" {...tilt}>
   <h2 id="about-title" data-od-id="about-title" className="portfolio-display">ABOUT ME</h2>
   <div className="portfolio-prose"><AboutCopy/></div>
  </div>
 </section>;
}
