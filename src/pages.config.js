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
import AlertSettings from './pages/AlertSettings';
import AlertsReports from './pages/AlertsReports';
import AuditLogs from './pages/AuditLogs';
import Blog from './pages/Blog';
import CarbonCredits from './pages/CarbonCredits';
import Certifications from './pages/Certifications';
import ChatRute from './pages/ChatRute';
import ClientConsultorPortal from './pages/ClientConsultorPortal';
import ClimateMonitoring from './pages/ClimateMonitoring';
import CommodityAnalysis from './pages/CommodityAnalysis';
import ConsolidatedReports from './pages/ConsolidatedReports';
import ConsultorClients from './pages/ConsultorClients';
import Documents from './pages/Documents';
import DocumentsHub from './pages/DocumentsHub';
import DocumentsManager from './pages/DocumentsManager';
import ESGAgro from './pages/ESGAgro';
import EbookReader from './pages/EbookReader';
import EnvironmentalAlerts from './pages/EnvironmentalAlerts';
import EnvironmentalEasements from './pages/EnvironmentalEasements';
import Georeferencing from './pages/Georeferencing';
import GreenLoans from './pages/GreenLoans';
import Home from './pages/Home';
import Invoices from './pages/Invoices';
import Licenses from './pages/Licenses';
import Mappings from './pages/Mappings';
import MyTeam from './pages/MyTeam';
import NotificationSettings from './pages/NotificationSettings';
import PRAD from './pages/PRAD';
import PSAContracts from './pages/PSAContracts';
import Processes from './pages/Processes';
import Properties from './pages/Properties';
import RealtimeNotificationSettings from './pages/RealtimeNotificationSettings';
import RegularityReport from './pages/RegularityReport';
import Reports from './pages/Reports';
import Requests from './pages/Requests';
import Support from './pages/Support';
import TaxIncentives from './pages/TaxIncentives';
import Contracts from './pages/Contracts';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AlertSettings": AlertSettings,
    "AlertsReports": AlertsReports,
    "AuditLogs": AuditLogs,
    "Blog": Blog,
    "CarbonCredits": CarbonCredits,
    "Certifications": Certifications,
    "ChatRute": ChatRute,
    "ClientConsultorPortal": ClientConsultorPortal,
    "ClimateMonitoring": ClimateMonitoring,
    "CommodityAnalysis": CommodityAnalysis,
    "ConsolidatedReports": ConsolidatedReports,
    "ConsultorClients": ConsultorClients,
    "Documents": Documents,
    "DocumentsHub": DocumentsHub,
    "DocumentsManager": DocumentsManager,
    "ESGAgro": ESGAgro,
    "EbookReader": EbookReader,
    "EnvironmentalAlerts": EnvironmentalAlerts,
    "EnvironmentalEasements": EnvironmentalEasements,
    "Georeferencing": Georeferencing,
    "GreenLoans": GreenLoans,
    "Home": Home,
    "Invoices": Invoices,
    "Licenses": Licenses,
    "Mappings": Mappings,
    "MyTeam": MyTeam,
    "NotificationSettings": NotificationSettings,
    "PRAD": PRAD,
    "PSAContracts": PSAContracts,
    "Processes": Processes,
    "Properties": Properties,
    "RealtimeNotificationSettings": RealtimeNotificationSettings,
    "RegularityReport": RegularityReport,
    "Reports": Reports,
    "Requests": Requests,
    "Support": Support,
    "TaxIncentives": TaxIncentives,
    "Contracts": Contracts,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};