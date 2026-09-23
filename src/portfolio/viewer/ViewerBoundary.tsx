import {Component,type ReactNode} from 'react';
export default class ViewerBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed
    ? <p className="viewer-note">The interactive model could not load. The project’s CAD, CAM and FEA images remain available in the gallery above.</p>
    : this.props.children; }
}
