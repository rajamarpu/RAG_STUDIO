import { useState } from 'react';
import { Canvas3D } from '../components/3d/Canvas3D';
import { RagNetwork } from '../components/3d/RagNetwork';
import { Activity, Settings, Play, Copy } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export function Pipeline() {
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState(0);

  const stages = ['Query received', 'Embedding', 'Retrieval', 'Reranking', 'Context build', 'Generation', 'Answer'];

  const run = () => {
    if (running) return;
    setRunning(true);
    setStage(0);
    let idx = 0;
    const id = setInterval(() => {
      idx += 1;
      setStage(idx);
      if (idx >= stages.length - 1) {
        clearInterval(id);
        setRunning(false);
      }
    }, 600);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>RAG Pipeline</h1>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Inspect the live retrieval path — latency is 0 until you query real data</p>
        </div>
        <Button variant="primary" onClick={run} className="gap-2"><Play className="w-4 h-4" /> Run test</Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Pipeline Visualization</h3>
            <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--accent-primary)/10', color: 'var(--accent-primary)' }}>{running ? 'Running' : 'Idle'}</span>
          </div>
          <div className="h-[380px] rounded-lg overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
            <Canvas3D fallback={<div className="h-full flex items-center justify-center">WebGL required</div>}>
              <RagNetwork animated={running} showFlowParticles />
            </Canvas3D>
          </div>
          <div className="grid grid-cols-7 gap-1 mt-4">
            {stages.map((s, i) => (
              <div key={s} className={`p-2 rounded-lg text-center text-xs ${i <= stage ? 'text-white' : ''}`} style={{ background: i <= stage ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: i <= stage ? 'white' : 'var(--text-muted)', border: '1px solid var(--border-primary)' }}>
                <div className="font-medium">{s}</div>
                <div className="text-[10px] opacity-80">{running && i === stage ? '…' : i < stage ? 'done' : '—'}</div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Config</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span style={{ color: 'var(--text-tertiary)' }}>Chunk size</span><span style={{ color: 'var(--text-primary)' }}>1000</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--text-tertiary)' }}>Overlap</span><span style={{ color: 'var(--text-primary)' }}>200</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--text-tertiary)' }}>Top K</span><span style={{ color: 'var(--text-primary)' }}>5</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--text-tertiary)' }}>Threshold</span><span style={{ color: 'var(--text-primary)' }}>0.7</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--text-tertiary)' }}>Model</span><span style={{ color: 'var(--text-primary)' }}>llama3:8b</span></div>
              <Button variant="ghost" size="sm" className="w-full mt-2 gap-2" onClick={() => window.location.href = '/settings'}><Settings className="w-4 h-4" /> Edit in Settings</Button>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Latest Run</h3>
            <div className="text-xs space-y-1" style={{ color: 'var(--text-tertiary)' }}>
              <div>Retrieved: 0 chunks (no data yet)</div>
              <div>Top similarity: 0.00</div>
              <div>Latency: 0 ms</div>
              <div className="flex items-center gap-2 mt-2"><Copy className="w-4 h-4" /> <span>Copy trace</span></div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Health</h3>
            <div className="flex items-center gap-2 text-sm"><Activity className="w-4 h-4" style={{ color: 'var(--accent-success)' }} /><span style={{ color: 'var(--text-secondary)' }}>All stages idle — upload to test</span></div>
          </Card>
        </div>
      </div>
    </div>
  );
}
