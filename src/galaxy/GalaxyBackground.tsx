import { useMediaQuery } from './GalaxyCanvas';
import WebGPUBlackHole from './WebGPUBlackHole';
import '../styles/galaxy.css';

/** Reading-mode background: the WebGPU ray-marched black hole (no GLB). */
export function GalaxyBackground() {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  return <WebGPUBlackHole reducedMotion={reduced}/>;
}
export default GalaxyBackground;
