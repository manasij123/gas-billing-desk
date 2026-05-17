export default function NavIcon({ id, active, sidebarCollapsed }) {
  const baseClass = "text-[18px]";

  // Sidebar collapsed এবং active থাকলে আইকন কালার পরিবর্তন
  const getActiveColor = () => {
    if (active) return '#ffffff'; // White when item is active in sidebar
    
    // Default categorical colors for non-active icons
    switch (id) {
      case 'dashboard': return '#60a5fa'; // Blue
      case 'sales': return '#34d399';     // Emerald
      case 'purchase': return '#fbbf24';  // Gold
      case 'stock': return '#4ade80';     // Green
      case 'parties': return '#a78bfa';   // Purple
      case 'tracker': return '#7c3aed';   // Deep Purple
      case 'reports': return '#f472b6';   // Pink/Purple
      default: return 'rgba(71, 85, 105, 0.6)';
    }
  };

  const getIconClass = () => {
    switch (id) {
      case 'dashboard':
        return 'fa-solid fa-gauge-high';
      case 'sales':
        return 'fa-solid fa-file-invoice-dollar';
      case 'purchase':
        return 'fa-solid fa-truck-field';
      case 'stock':
        return 'fa-solid fa-boxes-stacked';
      case 'tracker':
        return 'fa-solid fa-clock-rotate-left';
      case 'parties':
        return 'fa-solid fa-user-group';
      case 'reports':
        return 'fa-solid fa-chart-line';
      case 'lookup':
        return 'fa-solid fa-magnifying-glass';
      default:
        return 'fa-solid fa-circle-dot';
    }
  };

  return (
    <i 
      className={`${getIconClass()} ${baseClass} transition-all duration-300 ${active ? 'scale-110' : ''}`} 
      style={{ color: getActiveColor() }} 
      aria-hidden="true" 
    />
  );
}
