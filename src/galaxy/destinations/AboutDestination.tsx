import usePanelTilt from '../../hooks/usePanelTilt';
import AboutCopy from '../../portfolio/sections/AboutCopy';
export default function AboutDestination(){const tilt=usePanelTilt();return <section className="journey-about panel-tilt" {...tilt} data-od-id="journey-about" aria-label="About Sathya"><h2 className="portfolio-display">ABOUT ME</h2><div className="portfolio-prose"><AboutCopy immersive/></div></section>;}
