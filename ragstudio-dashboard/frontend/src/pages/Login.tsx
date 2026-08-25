import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Canvas3D } from '../components/3d/Canvas3D';
import { CityBackground } from '../components/3d/CityBackground';
import { ParticleField } from '../components/3d/ParticleField';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Lock, Mail, User, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';

export function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const addToast = useUIStore((state) => state.addToast);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    // Success
    setSuccess(true);
    setLoading(false);

    if (isLogin) {
      addToast('Welcome back! Redirecting to dashboard...', 'success');
      setTimeout(() => window.location.href = '/dashboard', 1000);
    } else {
      addToast('Account created! Redirecting to dashboard...', 'success');
      setTimeout(() => window.location.href = '/dashboard', 1000);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError('');
    await new Promise(resolve => setTimeout(resolve, 1000));
    addToast('Demo mode activated', 'success');
    setTimeout(() => window.location.href = '/dashboard', 500);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6" style={{ background: 'var(--bg-primary)' }}>
      {/* 3D Background */}
      <Canvas3D fallback={<LoginFallback />} className="absolute inset-0 z-0">
        <CityBackground />
        <ParticleField count={1500} size={0.02} speed={0.4} variant="ambient" />
      </Canvas3D>

      {/* Foreground Form */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'var(--accent-primary)' }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}>
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </motion.div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>RAG AI Platform</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-tertiary)' }}>
            {isLogin ? 'Sign in to your account' : 'Create your account'}
          </p>
        </motion.div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Card className="p-6" variant="glass">
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <Input
                  label="Name"
                  type="text"
                  placeholder="John Doe"
                  leftIcon={<User className="w-5 h-5" />}
                  autoComplete="name"
                  required={!isLogin}
                />
              )}

              <Input
                label="Email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-5 h-5" />}
                autoComplete="email"
                required
              />

              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-5 h-5" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                }
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                required
              />

              {!isLogin && (
                <Input
                  label="Confirm Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  leftIcon={<Lock className="w-5 h-5" />}
                  autoComplete="new-password"
                  required
                />
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 rounded-lg text-sm"
                  style={{ background: 'var(--accent-error)/10', color: 'var(--accent-error)', border: '1px solid var(--accent-error)/30' }}
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 rounded-lg text-sm"
                  style={{ background: 'var(--accent-success)/10', color: 'var(--accent-success)', border: '1px solid var(--accent-success)/30' }}
                >
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{isLogin ? 'Signing in...' : 'Creating account...'}</span>
                </motion.div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                className="mt-2"
              >
                {isLogin ? 'Sign In' : 'Create Account'}
              </Button>
            </form>

            {/* Demo Login */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-6"
            >
              <Button
                variant="secondary"
                fullWidth
                onClick={handleDemoLogin}
                disabled={loading}
                className="gap-2"
              >
                <Loader2 className="w-4 h-4" />
                Continue with Demo
              </Button>
            </motion.div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" style={{ borderColor: 'var(--border-primary)' }} />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2" style={{ background: 'var(--bg-glass)', color: 'var(--text-muted)' }}>
                  Or continue with
                </span>
              </div>
            </div>

            {/* OAuth Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="ghost"
                disabled={loading}
                className="gap-2 justify-center"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </Button>
              <Button
                variant="ghost"
                disabled={loading}
                className="gap-2 justify-center"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub
              </Button>
            </div>

            {/* Switch Mode */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-6 text-center text-sm"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setSuccess(false);
                }}
                className="font-medium hover:underline transition-colors"
                style={{ color: 'var(--accent-primary)' }}
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </motion.p>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-6 text-center text-sm"
          style={{ color: 'var(--text-muted)' }}
        >
          By continuing, you agree to our{' '}
          <a href="#" className="underline hover:opacity-70">Terms of Service</a>{' '}
          and{' '}
          <a href="#" className="underline hover:opacity-70">Privacy Policy</a>
        </motion.p>
      </div>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-md p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '1.5rem' }}>
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'var(--accent-primary)/10' }}>
            <Lock className="w-8 h-8" style={{ color: 'var(--accent-primary)' }} />
          </div>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Sign In</h3>
        </div>
        <p className="text-sm text-center" style={{ color: 'var(--text-tertiary)' }}>3D background requires WebGL</p>
      </div>
    </div>
  );
}