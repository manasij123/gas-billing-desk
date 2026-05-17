import { useState } from 'react';
import { GasAppProvider } from './state/GasAppContext.jsx';
import AppShell from './components/AppShell.jsx';

export default function App() {
  const [active, setActive] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <GasAppProvider>
      <AppShell
        active={active}
        onNavigate={setActive}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
      />
    </GasAppProvider>
  );
}
