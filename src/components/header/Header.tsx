import InitialsLogo from './InitialsLogo';
import SectionNavigation from './SectionNavigation';
import ContactControls from './ContactControls';
import CoolStuffControl from './CoolStuffControl';
import {COOL_STUFF_MODE_ENABLED} from '../../features';
export default function Header({enabled,onToggle}:{enabled:boolean;onToggle:()=>void}){return <header className="portfolio-topbar" data-od-id="portfolio-header"><InitialsLogo immersive={enabled}/>{!enabled&&<SectionNavigation/>}<div className="header-actions"><ContactControls/>{COOL_STUFF_MODE_ENABLED&&<CoolStuffControl enabled={enabled} onToggle={onToggle}/>}</div></header>;}
