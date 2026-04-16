import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, CreditCard, ShoppingCart, Package, BarChart3, Wifi, Users, Music, UserCircle2, LogOut } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useOperator } from '@/hooks/useOperator';
import { motion } from 'framer-motion';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isDemoMode = useStore((s) => s.isDemoMode);
  const toggleDemoMode = useStore((s) => s.toggleDemoMode);
  const { operator, clearOperator } = useOperator();

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/customers', icon: Users, label: 'Clientes' },
    { to: '/load-tag', icon: CreditCard, label: 'Carregar' },
    { to: '/pos', icon: ShoppingCart, label: 'PDV' },
    { to: '/inventory', icon: Package, label: 'Produtos' },
    { to: '/reports', icon: BarChart3, label: 'Relatórios' },
    { to: '/courtesy', icon: Music, label: 'Consumação' },
    { to: '/admin', icon: Users, label: 'Admin' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden md:flex w-20 lg:w-64 flex-col card-surface rounded-none border-r border-border/50">
        <div className="p-4 lg:p-6">
          <h1 className="font-display font-bold text-xl lg:text-2xl text-primary hidden lg:block">
            TagFlow<span className="text-secondary"> Psy</span>
          </h1>
          <span className="font-display font-bold text-primary text-xl lg:hidden block text-center">TF</span>
        </div>

        <nav className="flex-1 flex flex-col gap-1 px-2 lg:px-3">
          {navItems.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to;
            return (
              <NavLink key={to} to={to}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all text-sm font-medium
                  ${isActive ? 'bg-primary/10 text-primary glow-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
                <Icon size={20} />
                <span className="hidden lg:inline">{label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 lg:p-4 space-y-2">
          {operator && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border/50">
              <UserCircle2 size={18} className="text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground truncate">{operator.name}</p>
                <p className="text-[10px] text-muted-foreground font-mono">#{operator.number}</p>
              </div>
              <button onClick={clearOperator} title="Trocar operador"
                className="text-muted-foreground hover:text-destructive transition-colors">
                <LogOut size={14} />
              </button>
            </div>
          )}
          {operator && (
            <button onClick={clearOperator}
              className="lg:hidden flex items-center justify-center gap-1 w-full px-2 py-2 rounded-lg bg-muted/40 text-[10px] text-muted-foreground hover:text-destructive">
              <UserCircle2 size={14} />
              <span className="font-mono">#{operator.number}</span>
            </button>
          )}
          <button onClick={toggleDemoMode}
            className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-xs font-medium transition-all
              ${isDemoMode ? 'bg-accent/10 text-accent glow-accent' : 'bg-muted text-muted-foreground'}`}>
            <Wifi size={16} />
            <span className="hidden lg:inline">{isDemoMode ? 'DEMO MODE' : 'NFC LIVE'}</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <motion.div key={location.pathname}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
          className="p-4 lg:p-6 min-h-full">
          {children}
        </motion.div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border/50 flex justify-around py-2 z-50">
        {navItems.slice(0, 5).map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          return (
            <NavLink key={to} to={to}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium
                ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
              <Icon size={18} />{label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
