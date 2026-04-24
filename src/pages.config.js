/**
 * pages.config.js - Page routing configuration
 * Uses React.lazy for all pages to avoid duplicate module loading.
 */
import React from 'react';
import __Layout from './Layout.jsx';

const Agenda = React.lazy(() => import('./pages/Agenda'));
const AlertSettings = React.lazy(() => import('./pages/AlertSettings'));
const AlertsReports = React.lazy(() => import('./pages/AlertsReports'));
const AuditLogs = React.lazy(() => import('./pages/AuditLogs'));
const Blog = React.lazy(() => import('./pages/Blog'));
const CARModule = React.lazy(() => import('./pages/CARModule'));
const CRA = React.lazy(() => import('./pages/CRA'));
const CRMBoard = React.lazy(() => import('./pages/CRMBoard'));
const CampMode = React.lazy(() => import('./pages/CampMode'));
const CarbonCredits = React.lazy(() => import('./pages/CarbonCredits'));
const Certifications = React.lazy(() => import('./pages/Certifications'));
const ChatRute = React.lazy(() => import('./pages/ChatRute'));
const ClientConsultorPortal = React.lazy(() => import('./pages/ClientConsultorPortal'));
const ClimateMonitoring = React.lazy(() => import('./pages/ClimateMonitoring'));
const CommodityAnalysis = React.lazy(() => import('./pages/CommodityAnalysis'));
const ConsolidatedReports = React.lazy(() => import('./pages/ConsolidatedReports'));
const ConsultorClients = React.lazy(() => import('./pages/ConsultorClients'));
const Contracts = React.lazy(() => import('./pages/Contracts'));
const Documents = React.lazy(() => import('./pages/Documents'));
const DocumentsHub = React.lazy(() => import('./pages/DocumentsHub'));
const DocumentsManager = React.lazy(() => import('./pages/DocumentsManager'));
const ESGAgro = React.lazy(() => import('./pages/ESGAgro'));
const EbookReader = React.lazy(() => import('./pages/EbookReader'));
const EnvironmentalAlerts = React.lazy(() => import('./pages/EnvironmentalAlerts'));
const EnvironmentalAssets = React.lazy(() => import('./pages/EnvironmentalAssets'));
const EnvironmentalEasements = React.lazy(() => import('./pages/EnvironmentalEasements'));
const Expenses = React.lazy(() => import('./pages/Expenses'));
const FinancialDashboard = React.lazy(() => import('./pages/FinancialDashboard'));
const FinancialTransactions = React.lazy(() => import('./pages/FinancialTransactions'));
const Georeferencing = React.lazy(() => import('./pages/Georeferencing'));
const GreenLoans = React.lazy(() => import('./pages/GreenLoans'));
const HarvestLoss = React.lazy(() => import('./pages/HarvestLoss'));
const Home = React.lazy(() => import('./pages/Home'));
const Invoices = React.lazy(() => import('./pages/Invoices'));
const Licenses = React.lazy(() => import('./pages/Licenses'));
const Mappings = React.lazy(() => import('./pages/Mappings'));
const MyTeam = React.lazy(() => import('./pages/MyTeam'));
const NotificationSettings = React.lazy(() => import('./pages/NotificationSettings'));
const PRAD = React.lazy(() => import('./pages/PRAD'));
const PSAContracts = React.lazy(() => import('./pages/PSAContracts'));
const PaymentSettings = React.lazy(() => import('./pages/PaymentSettings'));
const Processes = React.lazy(() => import('./pages/Processes'));
const Properties = React.lazy(() => import('./pages/Properties'));
const PropertyCentral = React.lazy(() => import('./pages/PropertyCentral'));
const PropertyMapView = React.lazy(() => import('./pages/PropertyMapView'));
const RealtimeNotificationSettings = React.lazy(() => import('./pages/RealtimeNotificationSettings'));
const RegularityReport = React.lazy(() => import('./pages/RegularityReport'));
const Reports = React.lazy(() => import('./pages/Reports'));
const Requests = React.lazy(() => import('./pages/Requests'));
const RuralCredit = React.lazy(() => import('./pages/RuralCredit'));
const Support = React.lazy(() => import('./pages/Support'));
const TaxIncentives = React.lazy(() => import('./pages/TaxIncentives'));
const NotificationAudit = React.lazy(() => import('./pages/NotificationAudit'));
const NFeManagement = React.lazy(() => import('./pages/NFeManagement'));
const TermsAdmin = React.lazy(() => import('./pages/TermsAdmin'));
const AdminPanel = React.lazy(() => import('./pages/AdminPanel'));
const ChecklistTemplates = React.lazy(() => import('./pages/ChecklistTemplates'));
const LicenseChecklist = React.lazy(() => import('./pages/LicenseChecklist'));
const BudgetGenerator = React.lazy(() => import('./pages/BudgetGenerator'));
const ContractGenerator = React.lazy(() => import('./pages/ContractGenerator'));
const LandingPage = React.lazy(() => import('./pages/LandingPage'));

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
    "EnvironmentalAssets": EnvironmentalAssets,
    "EnvironmentalEasements": EnvironmentalEasements,
    "Expenses": Expenses,
    "FinancialDashboard": FinancialDashboard,
    "FinancialTransactions": FinancialTransactions,
    "Georeferencing": Georeferencing,
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
    "NotificationAudit": NotificationAudit,
    "NFeManagement": NFeManagement,
    "TermsAdmin": TermsAdmin,
    "AdminPanel": AdminPanel,
    "ChecklistTemplates": ChecklistTemplates,
    "LicenseChecklist": LicenseChecklist,
    "BudgetGenerator": BudgetGenerator,
    "ContractGenerator": ContractGenerator,
    "LandingPage": LandingPage,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};