import NavIcon from './NavIcon.jsx';
import Logo from './Logo.jsx';

const NAV = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'sales', label: 'Sales / Billing' },
  { id: 'purchase', label: 'Purchase' },
  { id: 'stock', label: 'Stock' },
  { id: 'lookup', label: 'Invoice Lookup' },
  { id: 'tracker', label: 'Cylinder Tracker' },
  { id: 'parties', label: 'Parties' },
  { id: 'reports', label: 'Reports' },
];

export default function Sidebar({ active, onNavigate, collapsed, onToggleCollapse }) {
  return (
    <aside
      className={`print-root-hidden flex shrink-0 flex-col border-r border-slate-200 bg-slate-50 text-slate-700 transition-[width] duration-300 ease-in-out ${
        collapsed ? 'w-[4.25rem]' : 'w-56'
      }`}
    >
      <div className={`flex border-b border-white/5 px-3 py-4 transition-all duration-300 ${collapsed ? 'flex-col items-center gap-3' : 'items-center justify-between'}`}>
        <div className={`flex items-center gap-3 min-w-0 ${collapsed ? 'justify-center' : ''}`}>
          <Logo size={collapsed ? 32 : 38} className="shrink-0 transition-all duration-300" />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-brand-gold">
                MIG Desk
              </div>
              <div className="truncate text-[11px] font-bold text-slate-400 uppercase">Industrial Gases</div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand menu' : 'Collapse menu'}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-slate-200 hover:text-brand-gold ${collapsed ? '' : 'ml-1'}`}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
            aria-hidden
          >
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {!collapsed && (
        <div className="px-6 py-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Main Menu</div>
      )}

      <nav className="flex-1 space-y-2 px-3 overflow-y-auto overflow-x-hidden py-2 custom-sidebar-nav">
        {NAV.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              title={collapsed ? item.label : undefined}
              onClick={() => onNavigate(item.id)}
              className={`group flex w-full items-center py-2 text-left text-sm font-semibold transition-all duration-500 ease-in-out ${
                collapsed ? 'justify-center px-0' : 'gap-3 px-3'
              } ${
                isActive
                  ? `text-white rounded-full ${collapsed ? 'bg-transparent' : 'bg-brand-emerald shadow-lg shadow-brand-emerald/30'}`
                  : `text-slate-500 hover:text-slate-900 rounded-full ${collapsed ? 'hover:bg-transparent' : 'hover:bg-slate-200/50'}`
              }`}
            >
              <span 
                className={`flex shrink-0 items-center justify-center transition-all duration-500 ease-in-out rounded-full ${
                  collapsed ? 'h-12 w-12' : 'h-10 w-10'
                } ${isActive 
                    ? (collapsed ? 'bg-brand-emerald border border-emerald-400/20 shadow-[inset_0_2px_6px_rgba(0,0,0,0.3),0_4px_6px_rgba(0,0,0,0.3)]' : 'bg-black/10') 
                    : (collapsed ? 'group-hover:bg-slate-200' : '')}`} 
                aria-hidden
              >
                <NavIcon id={item.id} active={isActive} sidebarCollapsed={collapsed} />
              </span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="border-t border-slate-200 p-3 text-[10px] leading-relaxed text-slate-400">
          Data in this browser (localStorage). Cloud sync can be added later.
        </div>
      )}
    </aside>
  );
}
