import AlertSettings from './pages/AlertSettings';
import Blog from './pages/Blog';
import CarbonCredits from './pages/CarbonCredits';
import ChatRute from './pages/ChatRute';
import CommodityAnalysis from './pages/CommodityAnalysis';
import Documents from './pages/Documents';
import EbookReader from './pages/EbookReader';
import EnvironmentalAlerts from './pages/EnvironmentalAlerts';
import Georeferencing from './pages/Georeferencing';
import Home from './pages/Home';
import Invoices from './pages/Invoices';
import Licenses from './pages/Licenses';
import NotificationSettings from './pages/NotificationSettings';
import Processes from './pages/Processes';
import Properties from './pages/Properties';
import RegularityReport from './pages/RegularityReport';
import Reports from './pages/Reports';
import Requests from './pages/Requests';
import Support from './pages/Support';
import PSAContracts from './pages/PSAContracts';
import EnvironmentalEasements from './pages/EnvironmentalEasements';
import DocumentsHub from './pages/DocumentsHub';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AlertSettings": AlertSettings,
    "Blog": Blog,
    "CarbonCredits": CarbonCredits,
    "ChatRute": ChatRute,
    "CommodityAnalysis": CommodityAnalysis,
    "Documents": Documents,
    "EbookReader": EbookReader,
    "EnvironmentalAlerts": EnvironmentalAlerts,
    "Georeferencing": Georeferencing,
    "Home": Home,
    "Invoices": Invoices,
    "Licenses": Licenses,
    "NotificationSettings": NotificationSettings,
    "Processes": Processes,
    "Properties": Properties,
    "RegularityReport": RegularityReport,
    "Reports": Reports,
    "Requests": Requests,
    "Support": Support,
    "PSAContracts": PSAContracts,
    "EnvironmentalEasements": EnvironmentalEasements,
    "DocumentsHub": DocumentsHub,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};