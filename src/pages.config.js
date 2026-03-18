/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Agenda from './pages/Agenda';
import AlertSettings from './pages/AlertSettings';
import AlertsReports from './pages/AlertsReports';
import AuditLogs from './pages/AuditLogs';
import Blog from './pages/Blog';
import CARModule from './pages/CARModule';
import CRA from './pages/CRA';
import CRMBoard from './pages/CRMBoard';
import CampMode from './pages/CampMode';
import CarbonCredits from './pages/CarbonCredits';
import Certifications from './pages/Certifications';
import ChatRute from './pages/ChatRute';
import ClientConsultorPortal from './pages/ClientConsultorPortal';
import ClimateMonitoring from './pages/ClimateMonitoring';
import CommodityAnalysis from './pages/CommodityAnalysis';
import ConsolidatedReports from './pages/ConsolidatedReports';
import ConsultorClients from './pages/ConsultorClients';
import Contracts from './pages/Contracts';
import Documents from './pages/Documents';
import DocumentsHub from './pages/DocumentsHub';
import DocumentsManager from './pages/DocumentsManager';
import ESGAgro from './pages/ESGAgro';
import EbookReader from './pages/EbookReader';
import EnvironmentalAlerts from './pages/EnvironmentalAlerts';
import EnvironmentalEasements from './pages/EnvironmentalEasements';
import Expenses from './pages/Expenses';
import FinancialDashboard from './pages/FinancialDashboard';
import FinancialTransactions from './pages/FinancialTransactions';
import Georeferencing from './pages/Georeferencing';
import GoogleCalendarCallback from './pages/GoogleCalendarCallback';
import GreenLoans from './pages/GreenLoans';
import HarvestLoss from './pages/HarvestLoss';
import Home from './pages/Home';
import Invoices from './pages/Invoices';
import Licenses from './pages/Licenses';
import Mappings from './pages/Mappings';
import MyTeam from './pages/MyTeam';
import NotificationSettings from './pages/NotificationSettings';
import PRAD from './pages/PRAD';
import PSAContracts from './pages/PSAContracts';
import PaymentSettings from './pages/PaymentSettings';
import Processes from './pages/Processes';
import Properties from './pages/Properties';
import PropertyCentral from './pages/PropertyCentral';
import PropertyMapView from './pages/PropertyMapView';
import RealtimeNotificationSettings from './pages/RealtimeNotificationSettings';
import RegularityReport from './pages/RegularityReport';
import Reports from './pages/Reports';
import Requests from './pages/Requests';
import RuralCredit from './pages/RuralCredit';
import Support from './pages/Support';
import TaxIncentives from './pages/TaxIncentives';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Agenda": Agenda,
    "AlertSettings": AlertSettings,
    "AlertsReports": AlertsReports,
    "AuditLogs": AuditLogs,
    "Blog": Blog,
    "CARModule": CARModule,
    "CRA": CRA,
    "CRMBoard": CRMBoard,
    "CampMode": CampMode,
    "CarbonCredits": CarbonCredits,
    "Certifications": Certifications,
    "ChatRute": ChatRute,
    "ClientConsultorPortal": ClientConsultorPortal,
    "ClimateMonitoring": ClimateMonitoring,
    "CommodityAnalysis": CommodityAnalysis,
    "ConsolidatedReports": ConsolidatedReports,
    "ConsultorClients": ConsultorClients,
    "Contracts": Contracts,
    "Documents": Documents,
    "DocumentsHub": DocumentsHub,
    "DocumentsManager": DocumentsManager,
    "ESGAgro": ESGAgro,
    "EbookReader": EbookReader,
    "EnvironmentalAlerts": EnvironmentalAlerts,
    "EnvironmentalEasements": EnvironmentalEasements,
    "Expenses": Expenses,
    "FinancialDashboard": FinancialDashboard,
    "FinancialTransactions": FinancialTransactions,
    "Georeferencing": Georeferencing,
    "GoogleCalendarCallback": GoogleCalendarCallback,
    "GreenLoans": GreenLoans,
    "HarvestLoss": HarvestLoss,
    "Home": Home,
    "Invoices": Invoices,
    "Licenses": Licenses,
    "Mappings": Mappings,
    "MyTeam": MyTeam,
    "NotificationSettings": NotificationSettings,
    "PRAD": PRAD,
    "PSAContracts": PSAContracts,
    "PaymentSettings": PaymentSettings,
    "Processes": Processes,
    "Properties": Properties,
    "PropertyCentral": PropertyCentral,
    "PropertyMapView": PropertyMapView,
    "RealtimeNotificationSettings": RealtimeNotificationSettings,
    "RegularityReport": RegularityReport,
    "Reports": Reports,
    "Requests": Requests,
    "RuralCredit": RuralCredit,
    "Support": Support,
    "TaxIncentives": TaxIncentives,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};