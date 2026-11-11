import { useEffect, useState } from "react";
import { Button } from "../assets/button";
import { Avatar, AvatarFallback, AvatarImage } from "../assets/avatar";
import { toast } from "../assets/sonner";
import { Menu, LogOut, User as UserIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../app/store";
import { clearUser } from "../features/auth/authSlice";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";

interface NavbarProps {
  toggleSidebar?: () => void;
  isSidebarOpen?: boolean; // Indicates if the mobile sidebar is open
}

const Navbar = ({ toggleSidebar, isSidebarOpen }: NavbarProps) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [scrolled, setScrolled] = useState(false);

  const { user, isLoggedIn } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setScrolled(scrollTop > 10);
      // console.log(scrollTop); // Keep or remove for debugging
    };

    // console.log('222'); // Keep or remove for debugging
    document.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []); // only run once on mount

  const handleLogout = async () => {
    try {
      await signOut(auth); // Firebase logout
      dispatch(clearUser()); // Clear Redux
      toast.success("Logged out successfully");
      navigate("/login"); // Go to login/home
    } catch (error: any) {
      toast.error("Failed to logout: " + error.message);
    }
  };

  // Get user initials from displayName or email
  const getUserInitials = () => {
    if (!user) return "T9";
    const name = user.displayName || user.email || "";
    const initials = name
      .split(" ")
      .map((part) => part[0]?.toUpperCase())
      .join("");
    return initials.slice(0, 2);
  };

  return (
    <header
      className={`fixed top-0 z-400 transition-all duration-300
        ${scrolled ? "bg-white/80 backdrop-blur-lg shadow-sm" : "bg-gradient-to-r from-bg-black to-bg-white"}
        
        ${isSidebarOpen ? "w-[calc(100vw-16rem)] right-0" : "w-full"} 
        
        lg:w-[calc(100vw-16rem)] lg:right-0 
      `}
      style={{ background: "linear-gradient(to right, #d9d1f3, white)", transition: "background-color 0.3s ease, backdrop-filter 0.3s ease" }}
    >
      <div className="flex h-16 items-center justify-between px-4 lg:px-8 max-w-7xl mx-auto">
        {/* Mobile menu button */}
        { toggleSidebar && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="lg:hidden rounded-xl"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        <div className="flex items-center gap-4 ml-auto">
          {isLoggedIn ? (
            <>
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="rounded-xl hover:bg-destructive/10 gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
              <Avatar onClick={() => { navigate('/profile') }} className="h-9 w-9 ring-2 ring-primary/20 cursor-pointer">
                <AvatarImage alt="User" />
                <AvatarFallback className="bg-gradient-purple text-white">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => navigate("/login")}
                className="rounded-xl hover:bg-primary/10 cursor-pointer"
              >
                Login
              </Button>
              <Button
                variant="default"
                onClick={() => navigate("/dashboard")}
                className="rounded-xl bg-gradient-purple gap-2 cursor-pointer"
              >
                <UserIcon className="h-4 w-4" />
                <span>Try as Guest</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;