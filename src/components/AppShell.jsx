import Sidebar from './Sidebar.jsx';
import DashboardPage from '../pages/DashboardPage.jsx';
import SalesBillingPage from '../pages/SalesBillingPage.jsx';
import PurchasePage from '../pages/PurchasePage.jsx';
import StockPage from '../pages/StockPage.jsx';
import PartiesPage from '../pages/PartiesPage.jsx';
import ReportsPage from '../pages/ReportsPage.jsx';
import CylinderTrackerPage from '../pages/CylinderTrackerPage.jsx';
import InvoiceLookupPage from '../pages/InvoiceLookupPage.jsx';

export default function AppShell({ active, onNavigate, sidebarCollapsed, onToggleSidebar }) {
  return (
    <div className="app-root flex h-full min-h-0 bg-white">
      <Sidebar
        active={active}
        onNavigate={onNavigate}
        collapsed={sidebarCollapsed}
        onToggleCollapse={onToggleSidebar}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <main className="print-main-scroll min-h-0 flex-1 overflow-auto bg-white">
          {active === 'dashboard' && <DashboardPage onNavigate={onNavigate} />}
          {active === 'sales' && <SalesBillingPage />}
          {active === 'purchase' && <PurchasePage />}
          {active === 'stock' && <StockPage />}
          {active === 'parties' && <PartiesPage />}
          {active === 'tracker' && <CylinderTrackerPage />}
          {active === 'lookup' && <InvoiceLookupPage />}
          {active === 'reports' && <ReportsPage />}
        </main>
      </div>
    </div>
  );
}
