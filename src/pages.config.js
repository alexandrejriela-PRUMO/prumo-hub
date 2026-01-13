import Home from './pages/Home';
import Licenses from './pages/Licenses';
import Documents from './pages/Documents';
import Georeferencing from './pages/Georeferencing';
import ChatRute from './pages/ChatRute';
import Support from './pages/Support';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Licenses": Licenses,
    "Documents": Documents,
    "Georeferencing": Georeferencing,
    "ChatRute": ChatRute,
    "Support": Support,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};