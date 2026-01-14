import Blog from './pages/Blog';
import ChatRute from './pages/ChatRute';
import Documents from './pages/Documents';
import EbookReader from './pages/EbookReader';
import Georeferencing from './pages/Georeferencing';
import Home from './pages/Home';
import Invoices from './pages/Invoices';
import Licenses from './pages/Licenses';
import Processes from './pages/Processes';
import Requests from './pages/Requests';
import Support from './pages/Support';
import RegularityReport from './pages/RegularityReport';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Blog": Blog,
    "ChatRute": ChatRute,
    "Documents": Documents,
    "EbookReader": EbookReader,
    "Georeferencing": Georeferencing,
    "Home": Home,
    "Invoices": Invoices,
    "Licenses": Licenses,
    "Processes": Processes,
    "Requests": Requests,
    "Support": Support,
    "RegularityReport": RegularityReport,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};