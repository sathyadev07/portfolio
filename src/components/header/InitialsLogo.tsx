import {COPY} from '../../data/portfolio';
export default function InitialsLogo({immersive}:{immersive:boolean}){return immersive ? <span className="portfolio-brand portfolio-name" data-od-id="initials-logo" aria-label={COPY.name}>SD</span> : <a href="#main-content" className="portfolio-brand portfolio-name" data-od-id="initials-logo" aria-label={`${COPY.name} — back to top`}>SD</a>;}
