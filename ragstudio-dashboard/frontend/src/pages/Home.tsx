/*
 * City Signal studio direction: the app is a focused workspace, not a wall of cards.
 * Keep only the operational essentials: four metrics, the live RAG path, services,
 * recent activity, and one answer-quality/retrieval insight zone.
 */
import { useEffect, useState } from "react";
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, Bell, BookOpen, BrainCircuit, Check, ChevronDown, ChevronRight, Command, Database, FileCode2, FileText, GitBranch, Gauge, Headphones, History, LayoutDashboard, LifeBuoy, ListFilter, Menu, MessageSquare, Moon, Network, PanelLeftClose, PanelLeftOpen, Play, Search, Settings, Sparkles, Sun, UploadCloud, X, Zap } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTheme } from "../components/themes/ThemeProvider";

const heroImage = "/assets/hero.png";
const signalMark = "/assets/signal-mark.svg";
type Theme = "dark" | "light";
type IconType = typeof LayoutDashboard;

const navGroups: { label: string; items: { label: string; icon: IconType }[] }[] = [
  { label: "Overview", items: [{ label: "Dashboard", icon: LayoutDashboard }] },
  { label: "AI", items: [{ label: "AI Assistant", icon: MessageSquare }, { label: "Retrieval", icon: Search }] },
  { label: "Knowledge", items: [{ label: "Knowledge Bases", icon: Database }, { label: "Documents", icon: FileText }, { label: "Chunks", icon: BookOpen }, { label: "Knowledge Graph", icon: Network }] },
  { label: "Engineering", items: [{ label: "RAG Pipeline", icon: GitBranch }, { label: "Queries", icon: ListFilter }, { label: "Query History", icon: History }] },
  { label: "Insights", items: [{ label: "Analytics", icon: BarChart3 }, { label: "Evaluation", icon: Gauge }] },
  { label: "System", items: [{ label: "Settings", icon: Settings }] },
  { label: "Help", items: [{ label: "Support", icon: Headphones }, { label: "API Docs", icon: FileCode2 }] },
];
const metrics = [
  { label: "Documents", value: "179", delta: "+14 this week", tone: "blue", trend: "↗" },
  { label: "Knowledge bases", value: "12", delta: "+2 this week", tone: "teal", trend: "↗" },
  { label: "Queries · 24h", value: "1,024", delta: "+12.8% vs prior", tone: "amber", trend: "↗" },
  { label: "Retrieval accuracy", value: "98.7%", delta: "+0.6% this week", tone: "teal", trend: "↗" },
];
const services = [["Gateway API", "Operational"], ["Vector database", "Operational"], ["Embedding model", "Operational"], ["LLM inference", "Operational"]];
const events = [["Query processed", "Leave policy answer generated", "Just now"], ["Document indexed", "employee-handbook-v4.pdf", "4 min ago"], ["Evaluation completed", "Weekly retrieval benchmark", "42 min ago"]];
const nodes = [{ label: "Query", x: 8, y: 66, tone: "teal" }, { label: "Embed", x: 25, y: 30, tone: "blue" }, { label: "Retrieve", x: 45, y: 68, tone: "amber" }, { label: "Context", x: 64, y: 30, tone: "violet" }, { label: "Answer", x: 88, y: 62, tone: "teal" }];

function MiniSpark({ tone }: { tone: string }) { return <svg viewBox="0 0 74 26" className={`studio-spark spark-${tone}`} aria-hidden="true"><polyline points="1,20 12,16 20,18 30,10 40,14 50,8 60,11 73,3" /><circle cx="73" cy="3" r="2.2" /></svg>; }
function Pipeline({ running, step }: { running: boolean; step: number }) { const points = nodes.map((node) => `${node.x},${node.y}`).join(" "); return <div className="studio-pipeline"><div className="studio-map-image" style={{ backgroundImage: `url(${heroImage})` }} /><div className="studio-map-grid" /><svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline className="studio-path-shadow" points={points} /><polyline className={`studio-path ${running ? "flowing" : ""}`} points={points} />{nodes.slice(0, -1).map((node, index) => <circle key={node.label} className={index < step ? "flow-particle active" : "flow-particle"} r="1"><animateMotion dur={running ? "2s" : "6s"} repeatCount="indefinite" path={`M ${node.x} ${node.y} L ${nodes[index + 1].x} ${nodes[index + 1].y}`} /></circle>)}</svg>{nodes.map((node, index) => <div className={`studio-node node-${node.tone} ${index === step ? "active" : ""} ${index < step ? "complete" : ""}`} style={{ left: `${node.x}%`, top: `${node.y}%` }} key={node.label}><span className="studio-node-ring"><i /></span><span>{node.label}</span><small>{index === 0 ? "received" : index === 1 ? "42 ms" : index === 2 ? "84 ms" : index === 3 ? "built" : "ready"}</small></div>)}<div className="studio-map-label"><span /><span>live retrieval path</span><em>40.7128° N · 74.0060° W</em></div></div>; }

const routeMap: Record<string, string> = {
  Dashboard: '/dashboard',
  'AI Assistant': '/chat',
  Retrieval: '/retrieval',
  'Knowledge Bases': '/knowledge-bases',
  Documents: '/documents',
  Chunks: '/chunks',
  'Knowledge Graph': '/knowledge-graph',
  'RAG Pipeline': '/pipeline',
  Queries: '/queries',
  'Query History': '/query-history',
  Analytics: '/analytics',
  Evaluation: '/evaluations',
  Settings: '/settings',
  Support: '/support',
  'API Docs': '/api-docs',
};

export default function Home() {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(4);
  const [query, setQuery] = useState("What is the company's leave policy?");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [expandedService, setExpandedService] = useState<string | null>(null);
  useEffect(() => { if (!running) return; const timer = window.setInterval(() => setStep((value) => { if (value >= 4) { setRunning(false); toast.success("Answer ready", { description: "The pipeline completed in 1.24 seconds." }); return 4; } return value + 1; }), 700); return () => window.clearInterval(timer); }, [running]);
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen((value) => !value); } if (event.key === "Escape") setSearchOpen(false); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, []);
  const visibleNav = navGroups.flatMap((group) => group.items).filter((item) => item.label.toLowerCase().includes(searchValue.toLowerCase())).slice(0, 7);
  const selectNav = (label: string) => {
    setActiveNav(label);
    const route = routeMap[label];
    if (route) {
      navigate(route);
    } else if (label !== "Dashboard") {
      toast(label, { description: "Navigating to " + label });
    }
  };
  const runQuery = () => {
    if (running) return;
    setStep(0);
    setRunning(true);
    toast("Pipeline started", { description: "Navigating to Retrieval..." });
    setTimeout(() => navigate('/retrieval'), 800);
  };
  return <div className={`app-shell compact-studio theme-${theme} ${collapsed ? "sidebar-collapsed" : ""}`}>
    <aside className="sidebar" aria-label="Studio navigation"><div className="brand-lockup"><div className="brand-mark-wrap"><img src={signalMark} alt="" className="brand-mark" /></div>{!collapsed && <div className="brand-name"><strong>RAG</strong><span>STUDIO</span></div>}</div><button className="collapse-button" onClick={() => setCollapsed((value) => !value)} aria-label="Toggle sidebar">{collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</button><nav className="nav-scroll">{navGroups.map((group) => <div className="nav-group" key={group.label}>{!collapsed && <div className="nav-group-label">{group.label}</div>}{group.items.map((item) => { const Icon = item.icon; const active = item.label === activeNav; return <button className={`nav-item ${active ? "active" : ""}`} key={item.label} onClick={() => selectNav(item.label)} title={collapsed ? item.label : undefined}><Icon size={17} /><span>{!collapsed && item.label}</span>{active && <i className="nav-active-line" />}</button>; })}</div>)}</nav>{!collapsed && <div className="sidebar-footer"><div className="workspace-avatar">NS</div><div><strong>Northstar AI</strong><span>Pro workspace</span></div><ChevronDown size={14} /></div>}</aside>
    <main className="main-canvas"><header className="topbar"><div className="mobile-menu"><Menu size={19} /></div><div className="breadcrumb"><Link href="/" className="crumb-link">RAG Studio</Link><ChevronRight size={14} /><strong>Workspace</strong><ChevronRight size={14} /><span>Overview</span></div><button className="global-search" onClick={() => setSearchOpen(true)}><Search size={16} /><span>Search your workspace...</span><kbd><Command size={11} /> K</kbd></button><div className="topbar-actions"><div className="system-pill"><span className="status-pulse" /><span className="system-pill-text">All systems operational</span></div><button className="icon-button" onClick={() => navigate('/analytics')} aria-label="Notifications"><Bell size={17} /></button><div className="theme-picker"><button onClick={() => setTheme("light")} className={theme === "light" ? "selected" : ""} aria-label="Light"><Sun size={14} /></button><button onClick={() => setTheme("dark")} className={theme === "dark" ? "selected" : ""} aria-label="Dark"><Moon size={14} /></button></div><div className="topbar-user"><div className="user-avatar">JR</div><ChevronDown size={14} /></div></div></header>
      <div className="content-area"><section className="page-intro"><div><div className="eyebrow">Workspace / Northstar AI</div><h1>See your knowledge work.</h1><p>One clear view of the path from document to answer.</p></div><div className="intro-actions"><button className="secondary-button" onClick={() => navigate('/documents')}><UploadCloud size={16} /> Index documents</button><button className="primary-button" onClick={runQuery}><Play size={15} fill="currentColor" /> Run a query</button></div></section>
        <section className="metrics-grid compact-metrics">{metrics.map((metric) => <article className={`metric-card metric-${metric.tone}`} key={metric.label}><div className="metric-top"><span>{metric.label}</span><span className="metric-icon"><Activity size={13} /></span></div><div className="metric-value">{metric.value}</div><div className="metric-bottom"><span className="delta-positive"><ArrowUpRight size={12} /> {metric.delta}</span><MiniSpark tone={metric.tone} /></div></article>)}</section>
        <section className="studio-main-grid"><article className="surface-card studio-engine-card"><div className="card-header"><div><div className="eyebrow"><span className="live-dot" /> Live topology</div><h2>RAG engine</h2><p>Documents → retrieval → answer <span className="healthy-text">· healthy</span></p></div><div className="engine-controls"><button className="small-control" onClick={() => navigate('/pipeline')}><GitBranch size={14} /> Path view</button></div></div><Pipeline running={running} step={step} /><div className="studio-query-row"><div><span>Current query</span><strong>{query}</strong></div><div className="studio-query-meta"><span>Latency</span><strong>{running ? "Processing" : "1.24 s"}</strong></div></div></article>
          <aside className="studio-rail"><article className="surface-card essential-panel"><div className="section-heading"><div><div className="eyebrow">System status</div><h2>Core services</h2></div><span className="operational-badge"><i /> 4 / 4</span></div><div className="service-list">{services.map(([name, status]) => <button className={`service-row ${expandedService === name ? "selected" : ""}`} key={name} onClick={() => setExpandedService((value) => value === name ? null : name)}><span className="service-icon"><Zap size={14} /></span><span className="service-copy"><strong>{name}</strong><small>{expandedService === name ? "99.99% uptime · 48 ms p95" : status}</small></span><span className="service-state"><i /><ChevronRight size={14} /></span></button>)}</div><div className="status-footer"><Activity size={13} /> Updated 14 seconds ago</div></article><article className="surface-card essential-panel activity-panel"><div className="section-heading"><div><div className="eyebrow">Event stream</div><h2>Recent activity</h2></div><button className="text-button" onClick={() => navigate('/query-history')}>View all <ArrowUpRight size={13} /></button></div><div className="event-list">{events.map(([title, detail, time]) => <button className="event-row" key={title} onClick={() => navigate('/queries')}><span className="event-icon"><Check size={13} /></span><span className="event-copy"><strong>{title}</strong><small>{detail} · {time}</small></span><ChevronRight size={14} /></button>)}</div></article></aside></section>
        <section className="essential-insights"><article className="surface-card insight-panel"><div className="section-heading"><div><div className="eyebrow">Live retrieval</div><h2>Answer formation</h2></div><span className="retrieval-status"><i /> complete</span></div><div className="insight-query"><span>Query</span><strong>{query}</strong></div><div className="retrieval-stats"><div><span>Retrieved</span><strong>5 chunks</strong></div><div><span>Top similarity</span><strong>0.94</strong></div><div><span>Latency</span><strong>124 ms</strong></div></div><div className="source-strip">{["employee-handbook.pdf", "leave-policy.docx", "people-ops.md"].map((source) => <button key={source} onClick={() => navigate('/chunks')}><FileText size={13} />{source}<ChevronRight size={13} /></button>)}</div></article><article className="surface-card insight-panel"><div className="section-heading"><div><div className="eyebrow">RAG quality</div><h2>Trust signal</h2></div><button className="text-button" onClick={() => selectNav("Evaluation")}>Open evaluation <ArrowUpRight size={13} /></button></div><div className="quality-score"><div><strong>92.1%</strong><span>overall score</span></div><div className="quality-track-large"><span /></div></div><div className="quality-summary"><span><i /> Faithfulness <b>94%</b></span><span><i /> Answer relevance <b>91%</b></span><span><i /> Retrieval precision <b>93%</b></span></div></article></section>
        <footer className="page-footer"><span><span className="footer-mark" /> RAGStudio <em>·</em> Infrastructure you can see.</span><span>API v2.4 <em>·</em> <Link href="/">Back to product</Link></span></footer>
      </div></main>
      {searchOpen && <div className="command-overlay" onClick={() => setSearchOpen(false)}><div className="command-palette" onClick={(event) => event.stopPropagation()}><div className="command-input-wrap"><Search size={17} /><input autoFocus value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder="Search your workspace..." /><kbd>esc</kbd><button onClick={() => setSearchOpen(false)} aria-label="Close"><X size={15} /></button></div><div className="command-section-label">Jump to</div>{visibleNav.map((item) => { const Icon = item.icon; return <button key={item.label} className="command-result" onClick={() => { selectNav(item.label); setSearchOpen(false); }}><Icon size={16} /><span>{item.label}</span><ChevronRight size={14} /></button>})}</div></div>}
    </div>;
}
