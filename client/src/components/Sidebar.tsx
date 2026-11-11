import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../utils/tailwind";
import { LayoutDashboard, Settings, Sidebar as Code2, Sparkles, Gamepad } from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  closeSidebar: () => void;
}

const Sidebar = ({ isOpen, closeSidebar }: SidebarProps) => {
  const location = useLocation();

  const navItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      color: "text-blue-500",
    },
    {
      name: "Trend Analyzer",
      path: "/trend-analyzer",
      icon: <Code2 className="h-5 w-5" />,
      color: "text-indigo-500",
    },
    {
      name: "Trend Chain Game",
      path: "/trend-chain",
      icon: <Gamepad className="h-5 w-5" />,
      color: "text-purple-500",
    },
    // {
    //   name: "Settings",
    //   path: "/settings",
    //   icon: <Settings className="h-5 w-5" />,
    //   color: "text-amber-500",
    // },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          // Removed backdrop-blur-sm to prevent blurring of content behind it.
          // Changed bg-black/50 to bg-black/60 for a slightly more opaque dimming effect,
          // but you can adjust this transparency (e.g., bg-black/40, bg-black/70) to your preference.
          className="fixed inset-0 z-20 bg-black/60 lg:hidden"
          onClick={closeSidebar}
        ></div>
      )}
      
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-30 h-full w-64 bg-sidebar glass-card backdrop-blur-md transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0 lg:static"
        )}
      >

        <div className="flex h-16 items-center border-b border-sidebar-border/30 px-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-gradient-purple rounded-lg flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-semibold text-sidebar-foreground">Trend99</span>
          </div>
        </div>
        <nav className="space-y-1 p-3 mt-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200",
                isActive
                  ? "bg-primary text-background shadow-md"
                  : "text-sidebar-foreground hover:bg-primary/10"
              )}
              onClick={closeSidebar}
            >
              <div
                className={cn(
                  "h-8 w-8 flex items-center justify-center rounded-lg",
                  isActive ? "bg-white/20" : `${item.color} bg-opacity-10`
                )}
              >
                {React.cloneElement(item.icon, {
                  className: cn("h-4.5 w-4.5", isActive ? "text-background" : item.color),
                })}
              </div>
              {item.name}
            </Link>
          );
        })}

        </nav>
      </aside>
    </>
  );
};

export default Sidebar;