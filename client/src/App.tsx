import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useDispatch } from "react-redux"
import { onAuthStateChanged } from "firebase/auth"

// Components
import Dashboard from './components/Dashboard'
import TrendAnalyzerForm from './components/Trendanalyser'
import TrendChainGame from './components/TrendGame'
import Navbar from './components/Navbar'
// import Sidebar from './components/Sidebar'
import Login from './components/Login'
import Signup from './components/Signup'
import Sidebar from './components/Sidebar'

// Firebase and Redux
import { auth } from "./firebase/firebase"
import { setUser, clearUser } from "./features/auth/authSlice"
import Profile from './components/Profile'
import { Toaster } from './assets/sonner'


function Layout() {

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />

      {/* Main content area */}
      <div className="flex flex-col flex-1">
        <Navbar isSidebarOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <Toaster/>
        <main className="flex-1 overflow-y-auto p-0">  {/* pt-20 gives space below navbar */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        path: '/',
        element: <Dashboard className={'pt-10'}/> 
      },
      {
        path: 'dashboard',
        element: <Dashboard className={'pt-10'}/>
      },
      {
        path: 'trend-analyzer',
        element: <TrendAnalyzerForm className={'pt-10'}/>
      },
      {
        path: 'trend-chain',
        element: <TrendChainGame className={'pt-10'}/>
      },
      {
        path: 'login',
        element: <Login />
      },
      {
        path: 'signup',
        element: <Signup />
      },
      {
        path: 'profile',
        element: <Profile />
      },
    ]
  }
])


const App = () => {

  const dispatch = useDispatch();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          phoneNumber: user.phoneNumber,
  
        };
  
        // Dispatch only the serializable user data to Redux
        dispatch(setUser(userData)); 
      }
      else dispatch(clearUser());
    });

    return () => unsubscribe();
  }, [dispatch]);

  return (
    <RouterProvider router={router} />
  )
}


export default App
