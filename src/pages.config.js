import Home from './pages/Home';
import Licenses from './pages/Licenses';
import Documents from './pages/Documents';
import Georeferencing from './pages/Georeferencing';
import ChatRute from './pages/ChatRute';
import Support from './pages/Support';
import Invoices from './pages/Invoices';
import Requests from './pages/Requests';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Licenses": Licenses,
    "Documents": Documents,
    "Georeferencing": Georeferencing,
    "ChatRute": ChatRute,
    "Support": Support,
    "Invoices": Invoices,
    "Requests": Requests,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};