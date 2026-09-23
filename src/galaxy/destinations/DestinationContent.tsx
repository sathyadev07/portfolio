import SikorskyDestination from './SikorskyDestination';
import FormulaSaeDestination from './FormulaSaeDestination';
import BikeFrameDestination from './BikeFrameDestination';
import TopographyDestination from './TopographyDestination';
import AudioEqualizerDestination from './AudioEqualizerDestination';
import SimulationDestination from './SimulationDestination';
import StartDestination from './StartDestination';
import AboutDestination from './AboutDestination';
import type {Destination} from '../waypoints';
import type {PillProps} from './DestinationPill';
const pills={'sikorsky':SikorskyDestination,'fsae':FormulaSaeDestination,'proj-01':BikeFrameDestination,'proj-03':TopographyDestination,'proj-04':AudioEqualizerDestination,'proj-06':SimulationDestination};
export default function DestinationContent({destination,...props}:{destination:Destination}&PillProps){
 if(destination.kind==='hero')return <StartDestination/>;
 if(destination.kind==='about')return <AboutDestination/>;
 const Pill=pills[destination.id as keyof typeof pills];return Pill?<Pill {...props}/>:null;
}
