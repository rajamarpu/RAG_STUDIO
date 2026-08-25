/*
 * City Signal landing direction: cinematic but calm, one central knowledge route,
 * spacious typography, signal teal for the data path, and no dashboard-card overload.
 */
import { useEffect, useState } from "react";
import { ArrowDown, ArrowRight, BrainCircuit, Check, ChevronRight, Database, FileText, GitBranch, Menu, Network, Search, Sparkles, UploadCloud, X, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const heroImage = "/assets/hero.png";
const signalMark = "/assets/signal-mark.svg";

const features = [
  { icon: FileText, eyebrow: "01 / Ingest", title: "Document intelligence", copy: "Bring your documents into one searchable knowledge layer, ready for the questions that matter." },
  { icon: Search, eyebrow: "02 / Retrieve", title: "Relevant by design", copy: "RAG Studio finds the right context before the model answers, so your data stays in the conversation." },
  { icon: Sparkles, eyebrow: "03 / Answer", title: "Answers with proof", copy: "See the sources, follow the retrieval path, and understand why each answer was generated." },
];

const pipeline = [
  { label: "Upload", detail: "Your source material", icon: UploadCloud },
  { label: "Chunk", detail: "Meaningful sections", icon: FileText },
  { label: "Embed", detail: "Semantic vectors", icon: BrainCircuit },
  { label: "Retrieve", detail: "Relevant context", icon: Search },
  { label: "Generate", detail: "Grounded answer", icon: Sparkles },
];

function RouteLine() {
  return <svg className="landing-route-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M4 56 C19 20, 26 78, 43 42 S66 24, 96 58" /><circle cx="4" cy="56" r="1.2" /><circle cx="43" cy="42" r="1.2" /><circle cx="96" cy="58" r="1.2" /></svg>;
}

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (event: MouseEvent) => setMouse({ x: (event.clientX / window.innerWidth - .5) * 12, y: (event.clientY / window.innerHeight - .5) * 10 });
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return <div className="landing-page">
    <header className="landing-nav"><Link className="landing-brand" to="/"><span className="landing-brand-mark"><img src={signalMark} alt="" /></span><strong>RAG</strong><span>STUDIO</span></Link><nav className={menuOpen ? "landing-menu open" : "landing-menu"}><a href="#why">Why RAG</a><a href="#how">How it works</a><a href="#features">Capabilities</a><Link to="/dashboard" className="nav-studio-link">Open studio <ArrowRight size={14} /></Link></nav><button className="landing-menu-toggle" onClick={() => setMenuOpen((value) => !value)} aria-label="Toggle menu" aria-expanded={menuOpen} aria-controls="landing-menu">{menuOpen ? <X size={19} /> : <Menu size={19} />}</button></header>

    <main>
      <section className="landing-hero">
        <div className="landing-hero-image" style={{ backgroundImage: `url(${heroImage})` }} />
        <div className="landing-grid-texture" />
        <div className="hero-copy">
          <div className="landing-kicker"><span className="kicker-pip" /> Intelligent knowledge infrastructure <span className="kicker-line" /> New York / 40.7128° N</div>
          <h1>Turn your documents<br />into <em>intelligence.</em></h1>
          <p>RAG Studio gives your AI a memory it can cite. Connect your knowledge, follow the retrieval path, and build answers grounded in the way your team works.</p>
          <div className="hero-actions"><Link to="/dashboard" className="landing-primary">Enter RAG Studio <ArrowRight size={16} /></Link><a href="#why" className="landing-secondary">Explore how it works <ArrowDown size={15} /></a></div>
          <div className="hero-proof"><span><Check size={13} /> Source-aware answers</span><span><Check size={13} /> Built for your data</span><span><Check size={13} /> Visible retrieval</span></div>
        </div>
        <div className="hero-visual" style={{ transform: `translate(${mouse.x * .35}px, ${mouse.y * .35}px)` }} aria-label="Documents flowing into an AI answer">
          <div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" /><RouteLine />
          <div className="hero-node hero-node-doc"><FileText size={18} /><span>documents</span></div><div className="hero-node hero-node-vector"><Database size={18} /><span>knowledge</span></div><div className="hero-node hero-node-answer"><Sparkles size={18} /><span>answer</span></div>
          <div className="float-file float-file-a">PDF <small>handbook</small></div><div className="float-file float-file-b">DOCX <small>product notes</small></div><div className="float-file float-file-c">CSV <small>signals</small></div>
          <div className="visual-caption"><span className="caption-live" /> Documents <ChevronRight size={12} /> Knowledge <ChevronRight size={12} /> Answer</div>
        </div>
        <a className="scroll-cue" href="#why"><span>Scroll to explore</span><ArrowDown size={14} /></a>
      </section>

      <section id="why" className="story-section story-why"><div className="story-index">01 <span /> The missing layer</div><div className="story-copy"><h2>Your AI should know <em>your data.</em></h2><p>Most models know the world. RAG Studio helps them understand your world — the policies, product docs, decisions, and language that make an answer useful.</p></div><div className="compare-flow"><div className="compare-column muted-flow"><span className="compare-label">Without RAG</span><strong>Question</strong><ArrowDown size={16} /><strong>Generic model</strong><ArrowDown size={16} /><b>Generic answer</b></div><div className="compare-divider"><span>vs</span></div><div className="compare-column live-flow"><span className="compare-label">With RAG Studio</span><strong>Question</strong><ArrowDown size={16} /><strong>Your knowledge</strong><ArrowDown size={16} /><strong>Relevant sources</strong><ArrowDown size={16} /><b>Context-aware answer</b></div></div></section>

      <section id="features" className="story-section features-section"><div className="story-index">02 <span /> Built to stay clear</div><div className="story-header"><h2>The useful parts,<br /><em>without the noise.</em></h2><p>Everything you need to move from source material to trusted answers, and nothing you need to hunt for.</p></div><div className="feature-list">{features.map((feature, index) => { const Icon = feature.icon; return <div className="feature-row" key={feature.title}><div className="feature-number">{feature.eyebrow}</div><div className="feature-icon"><Icon size={20} /></div><h3>{feature.title}</h3><p>{feature.copy}</p><ArrowRight className="feature-arrow" size={17} /></div>; })}</div></section>

      <section id="how" className="story-section pipeline-section"><div className="story-index">03 <span /> The path to an answer</div><div className="story-header"><h2>From documents<br />to <em>answers.</em></h2><p>See the architecture in plain sight. Every stage has a job, every answer has a route.</p></div><div className="landing-pipeline">{pipeline.map((step, index) => { const Icon = step.icon; return <div className={`landing-pipeline-step ${index === 3 ? "selected" : ""}`} key={step.label}><div className="pipeline-icon"><Icon size={18} /></div><span>{step.label}</span><small>{step.detail}</small>{index < pipeline.length - 1 && <ArrowRight className="pipeline-arrow" size={16} />}</div>; })}</div><div className="pipeline-note"><GitBranch size={15} /><span>Retrieval is the difference between an answer that sounds right and one your team can trust.</span></div></section>

      <section className="story-section preview-section"><div className="story-index">04 <span /> Meet the workspace</div><div className="preview-intro"><div><h2>A knowledge workspace<br /><em>you can see.</em></h2><p>The main studio keeps your sources, retrieval, and answer quality in one calm, observable workspace.</p></div><Link to="/dashboard" className="text-link">Preview the studio <ArrowRight size={15} /></Link></div><div className="browser-preview"><div className="browser-top"><span className="browser-dots"><i /><i /><i /></span><span className="browser-url"><Zap size={11} /> app.ragstudio.ai / overview</span><span className="browser-status"><span /> live</span></div><div className="browser-body"><aside><div className="mini-brand"><span /> RAG <small>STUDIO</small></div><span className="mini-nav active"><Network size={12} /> Overview</span><span className="mini-nav"><Database size={12} /> Knowledge bases</span><span className="mini-nav"><Search size={12} /> Retrieval</span><span className="mini-nav"><Sparkles size={12} /> AI chat</span></aside><div className="mini-workspace"><div className="mini-heading"><small>Workspace / overview</small><strong>The pulse of your knowledge</strong></div><div className="mini-stats"><span><small>Documents</small><b>179</b></span><span><small>Queries</small><b>1,024</b></span><span><small>Accuracy</small><b>98.7%</b></span></div><div className="mini-main"><div className="mini-graph"><span className="mini-route" /><i /><i /><i /><i /><small>RAG engine / live topology</small></div><div className="mini-side"><small>Recent activity</small><span><i /> Query processed</span><span><i /> Document indexed</span><span><i /> Evaluation complete</span></div></div></div></div></div></section>

      <section className="landing-cta"><div className="cta-grid" /><div className="cta-orb" /><div className="story-index">05 <span /> The next route</div><h2>Ready to give your AI<br /><em>something to remember?</em></h2><p>Upload your knowledge, trace the answer, and make the next query more useful.</p><div className="hero-actions"><Link to="/dashboard" className="landing-primary">Launch RAG Studio <ArrowRight size={16} /></Link><a href="#features" className="landing-secondary">Explore capabilities <ArrowDown size={15} /></a></div></section>
    </main>
    <footer className="landing-footer"><span><span className="footer-mark" /> RAGStudio</span><span>Infrastructure you can see. <em>© 2026</em></span><Link to="/dashboard">Open application <ArrowRight size={13} /></Link></footer>
  </div>;
}
