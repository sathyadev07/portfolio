import GalaxyCanvas, { useMediaQuery } from './GalaxyCanvas';
import GalaxyCloud from './GalaxyCloud';
import '../styles/galaxy.css';

export function GalaxyBackground() {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  return <GalaxyCanvas background reducedMotion={reduced}><GalaxyCloud rotating reducedMotion={reduced}/></GalaxyCanvas>;
}
export default GalaxyBackground;
