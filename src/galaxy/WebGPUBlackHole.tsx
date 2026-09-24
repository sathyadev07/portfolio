import {useEffect, useRef, useState} from 'react';
import type {BlackHoleBackground} from './webgpu-black-hole/createBlackHoleBackground';

/**
 * Full-viewport, non-interactive background running the WebGPU ray-marched
 * black hole (dgreenheck/webgpu-black-hole, MIT). The camera orbits with page
 * scroll only; the canvas never receives pointer input.
 */
export default function WebGPUBlackHole({reducedMotion = false}: {reducedMotion?: boolean}) {
  const host = useRef<HTMLDivElement>(null);
  const reduced = useRef(reducedMotion);
  const [failed, setFailed] = useState(false);
  reduced.current = reducedMotion;

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let bh: BlackHoleBackground | null = null;
    let active = true;
    const fail = (error: unknown) => {
      console.error('Failed to initialize WebGPU renderer:', error);
      bh?.dispose();
      if (active) setFailed(true);
    };
    // three/webgpu is large; load it in its own chunk after first paint.
    import('./webgpu-black-hole/createBlackHoleBackground').then(({createBlackHoleBackground}) => {
      if (!active) return;
      bh = createBlackHoleBackground(container, {reducedMotion: () => reduced.current});
      const instance = bh;
      return instance.ready.then(() => {
        if (!active || !import.meta.env.DEV) return;
        const backend = (instance.renderer as unknown as {backend?: {isWebGPUBackend?: boolean}}).backend;
        console.info(`[black hole] backend: ${backend?.isWebGPUBackend ? 'WebGPU' : 'WebGL2 fallback'}`);
        const adaptive = instance.adaptive;
        (window as unknown as {__bh?: unknown}).__bh = {
          camera: instance.camera, controls: instance.controls, renderer: instance.renderer,
          uniforms: instance.uniforms, scrollState: instance.scrollState,
          adaptive, isRendering: instance.isRendering,
          get renderScale() { return adaptive.scale; }
        };
      });
    }).catch(fail);
    return () => {
      active = false;
      bh?.dispose();
      if (import.meta.env.DEV) delete (window as unknown as {__bh?: unknown}).__bh;
    };
  }, []);

  return <>
    <div ref={host} className="galaxy-canvas galaxy-canvas--background galaxy-canvas--blackhole" aria-hidden="true"/>
    {failed && <p className="galaxy-status" role="status">Black hole unavailable. All portfolio content and navigation remain available.</p>}
  </>;
}
