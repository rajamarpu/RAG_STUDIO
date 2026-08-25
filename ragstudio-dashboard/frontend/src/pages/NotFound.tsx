/*
 * City Signal design reminder: errors are framed as missing coordinates or disconnected routes,
 * using the same graphite surfaces, precise teal signal, and calm infrastructure language.
 */
import { ArrowLeft, Crosshair, GitBranch, RadioTower } from "lucide-react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main className="route-missing-page">
      <div className="route-grid" />
      <div className="route-glow route-glow-a" />
      <div className="route-glow route-glow-b" />
      <section className="route-missing-card">
        <div className="route-brand"><span className="route-brand-mark"><GitBranch size={16} /></span><strong>RAG</strong><span>STUDIO</span></div>
        <div className="missing-visual" aria-hidden="true"><span className="coordinate coordinate-a">40.7128° N</span><span className="coordinate coordinate-b">74.0060° W</span><div className="missing-path"><span className="missing-node node-one" /><span className="missing-node node-two" /><span className="missing-node node-three" /></div><Crosshair className="missing-crosshair" size={38} /></div>
        <div className="eyebrow"><RadioTower size={12} /> Route unresolved</div>
        <h1>We lost the signal<span>.</span></h1>
        <p>This coordinate is not mapped in the current workspace. Return to the command center and pick a live route.</p>
        <Link to="/" className="route-home-link"><ArrowLeft size={15} /> Return to dashboard</Link>
        <div className="route-missing-meta">status <b>404</b><i /> node not found</div>
      </section>
    </main>
  );
}
