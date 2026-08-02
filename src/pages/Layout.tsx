import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import "../App.css";

const Layout: React.FC = () => {
    return (
        <div className="layout-container">
            <Sidebar />
            <div className="layout-content">
                <Outlet />
            </div>
        </div>
    );
};

export default Layout;