// src/pages/Login.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { useDispatch } from "react-redux";
import { setUser } from "../features/auth/authSlice";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleLogin = async (event:any) => {
    event.preventDefault(); // Prevent default form submission
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        phoneNumber: user.phoneNumber,

      };

      // Dispatch only the serializable user data to Redux
      dispatch(setUser(userData)); 
      // alert("Login successful!");
      navigate("/dashboard");
    } catch (error: any) {
      alert("Login failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100">
      <div className="bg-white shadow-2xl rounded-2xl p-10 max-w-md w-full">
        <h2 className="text-3xl font-extrabold text-center text-purple-700 mb-6">Welcome Back</h2>
        <form action="">
        <input
          type="email"
          placeholder="Email"
          className="w-full p-3 mb-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full p-3 mb-6 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition duration-200"
        >
          {loading ? "Logging in..." : "Log In"}
        </button>
        </form>
        <p className="mt-4 text-center text-sm">
          New to Trend99?{" "}
          <span
            onClick={() => navigate("/signup")}
            className="text-purple-600 hover:underline cursor-pointer"
          >
            Create an account
          </span>
        </p>
      </div>
    </div>
  );
}
