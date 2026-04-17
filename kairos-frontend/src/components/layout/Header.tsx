import { Menu, Zap, Sparkles } from 'lucide-react';
import { WalletButton } from '@/components/shared/WalletButton';
import { BalanceCard } from '@/components/shared/BalanceCard';
import { useEffect, useState } from 'react';

interface HeaderProps {
  onMenuToggle?: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const [tone, setTone] = useState<'trader' | 'beginner' | 'research'>('trader');

  useEffect(() => {
    const t = (localStorage.getItem('kairos_tone') || 'trader').toLowerCase();
    setTone(t === 'beginner' ? 'beginner' : t === 'research' ? 'research' : 'trader');
  }, []);

  const toggleTone = () => {
    const next = tone === 'trader' ? 'beginner' : tone === 'beginner' ? 'research' : 'trader';
    setTone(next);
    localStorage.setItem('kairos_tone', next);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border/30 bg-background/70 backdrop-blur-xl h-14 flex items-center justify-between px-4 lg:px-6">
      {/* Mobile menu */}
      <button
        onClick={onMenuToggle}
        id="mobile-menu-btn"
        className="p-2 rounded-lg hover:bg-accent transition-colors md:hidden text-muted-foreground hover:text-foreground"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Network badge */}
      <div className="hidden md:flex items-center gap-1.5 glass-btn px-3 py-1.5 text-xs text-muted-foreground">
        <Zap className="w-3 h-3 text-yellow-400" />
        <span>BNB Testnet</span>
        <span className="status-dot ml-0.5" />
      </div>

      <div className="flex-1" />

      {/* Right: balance + wallet */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={toggleTone}
          className="hidden md:inline-flex items-center gap-1.5 glass-btn px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          title={
            tone === 'trader'
              ? 'Trader-grade mode: tighter + numeric'
              : tone === 'beginner'
                ? 'Beginner-friendly mode: more explanation + safety checks'
                : 'Research mode: source-backed + cites web snippets'
          }
        >
          <Sparkles className="w-3 h-3 text-violet-300" />
          <span>{tone === 'trader' ? 'Trader' : tone === 'beginner' ? 'Beginner' : 'Research'}</span>
        </button>
        <BalanceCard compact />
        <WalletButton />
      </div>
    </header>
  );
}
