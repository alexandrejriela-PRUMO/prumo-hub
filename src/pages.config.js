import AlertSettings from './pages/AlertSettings';
import Blog from './pages/Blog';
import ChatRute from './pages/ChatRute';
import Documents from './pages/Documents';
import EbookReader from './pages/EbookReader';
import EnvironmentalAlerts from './pages/EnvironmentalAlerts';
import Georeferencing from './pages/Georeferencing';
import Home from './pages/Home';
import Invoices from './pages/Invoices';
import Licenses from './pages/Licenses';
import Processes from './pages/Processes';
import RegularityReport from './pages/RegularityReport';
import Requests from './pages/Requests';
import Support from './pages/Support';
import CommodityAnalysis from './pages/CommodityAnalysis';
import Properties from './pages/Properties';
import NotificationSettings from './pages/NotificationSettings';
import Reports from './pages/Reports';
import CarbonCredits from './pages/CarbonCredits';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AlertSettings": AlertSettings,
    "Blog": Blog,
    "ChatRute": ChatRute,
    "Documents": Documents,
    "EbookReader": EbookReader,
    "EnvironmentalAlerts": EnvironmentalAlerts,
    "Georeferencing": Georeferencing,
    "Home": Home,
    "Invoices": Invoices,
    "Licenses": Licenses,
    "Processes": Processes,
    "RegularityReport": RegularityReport,
    "Requests": Requests,
    "Support": Support,
    "CommodityAnalysis": CommodityAnalysis,
    "Properties": Properties,
    "NotificationSettings": NotificationSettings,
    "Reports": Reports,
    "CarbonCredits": CarbonCredits,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};