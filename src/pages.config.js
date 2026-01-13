import ChatRute from './pages/ChatRute';
import Documents from './pages/Documents';
import Georeferencing from './pages/Georeferencing';
import Home from './pages/Home';
import Invoices from './pages/Invoices';
import Licenses from './pages/Licenses';
import Requests from './pages/Requests';
import Support from './pages/Support';
import EbookReader from './pages/EbookReader';
import Processes from './pages/Processes';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ChatRute": ChatRute,
    "Documents": Documents,
    "Georeferencing": Georeferencing,
    "Home": Home,
    "Invoices": Invoices,
    "Licenses": Licenses,
    "Requests": Requests,
    "Support": Support,
    "EbookReader": EbookReader,
    "Processes": Processes,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};