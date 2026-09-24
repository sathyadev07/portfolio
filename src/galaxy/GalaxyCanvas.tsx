import {JOURNEY_NEAR} from './galaxySpace';
import { Component, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { useProgress } from '@react-three/drei';
import { NoToneMapping } from 'three';

export function useMediaQuery(query: string) {
  const [matches,setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const change = () => setMatches(media.matches);
    change(); media.addEventListener('change',change);
    return () => media.removeEventListener('change',change);
  },[query]);
  return matches;
}

class SceneBoundary extends Component<{children:ReactNode}, {failed:boolean}> {
  state = { failed:false };
  static getDerivedStateFromError() { return { failed:true }; }
  render() { return this.state.failed ? <p className="galaxy-status" role="status">Black hole unavailable. All portfolio content and navigation remain available.</p> : this.props.children; }
}
function LoadStatus() {
  const {active,progress} = useProgress();
  if (!active) return null;
  return <div className="galaxy-status" role="status"><span>Loading black hole</span><progress aria-label="Black hole loading" max="100" value={progress}/></div>;
}
function ContextStatus({ onLost }: { onLost: (lost: boolean) => void }) {
  const gl = useThree(state => state.gl);
  useEffect(() => {
    const lost = () => onLost(true);
    const restored = () => onLost(false);
    gl.domElement.addEventListener('webglcontextlost', lost);
    gl.domElement.addEventListener('webglcontextrestored', restored);
    return () => {
      gl.domElement.removeEventListener('webglcontextlost', lost);
      gl.domElement.removeEventListener('webglcontextrestored', restored);
    };
  }, [gl, onLost]);
  return null;
}
export default function GalaxyCanvas({children, reducedMotion=false, background=false}: {children:ReactNode; reducedMotion?:boolean; background?:boolean}) {
  const compact = useMediaQuery('(max-width: 767px)');
  const [lost,setLost] = useState(false);
  return <div className={background ? 'galaxy-canvas galaxy-canvas--background' : 'galaxy-canvas'} aria-hidden={background || undefined}>
    <SceneBoundary>
      <Canvas camera={{position:[0,-10,4.5],fov:75,near:JOURNEY_NEAR,far:4200}}
        dpr={[1,compact ? 1.25 : 1.75]} frameloop={reducedMotion ? 'demand' : 'always'}
        gl={{alpha:true,antialias:false,powerPreference:'high-performance',toneMapping:NoToneMapping}}
        fallback={<p className="galaxy-status">3D is unavailable on this device. Portfolio navigation remains available.</p>}
        onCreated={({camera,gl}) => {
          camera.lookAt(0,0,0); gl.setClearColor('#000000',0);
        }}
        onContextMenu={event => event.preventDefault()}>
        <ContextStatus onLost={setLost}/>
        <Suspense fallback={null}>{children}</Suspense>
      </Canvas>
      <LoadStatus/>
      {lost && <p className="galaxy-status" role="status">3D connection lost. Switch Cool Stuff off to continue reading.</p>}
    </SceneBoundary>
  </div>;
}
