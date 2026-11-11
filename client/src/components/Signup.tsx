import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "../assets/sonner";

export default function Signup() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    displayName: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setFile(selectedFile || null);
  };

  const handleSignup = async () => {
    const { email, password, displayName } = form;

    if (!email || !password || !displayName) {
      toast.error("Email, password, and display name are required.");
      return;
    }

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);
    formData.append("display_name", displayName);
    if (file) formData.append("file", file);

    try {
      setLoading(true);
      const res = await fetch("http://localhost:8000/auth/signup/", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Signup failed");
      }

      toast.success("Signup successful!");
      navigate("/login");
    } catch (error) {
      toast.error(`Signup failed: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100">
      <div className="bg-white shadow-2xl rounded-2xl p-10 max-w-md w-full">
        <h2 className="text-3xl font-extrabold text-center text-purple-700 mb-6">Create Account</h2>
        <input
          name="displayName"
          placeholder="Display Name"
          className="w-full p-3 mb-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
          value={form.displayName}
          onChange={handleChange}
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          className="w-full p-3 mb-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
          value={form.email}
          onChange={handleChange}
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          className="w-full p-3 mb-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
          value={form.password}
          onChange={handleChange}
        />
        
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="w-full p-3 mb-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
        />

        <button
          onClick={handleSignup}
          disabled={loading}
          className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition duration-200 disabled:opacity-60"
        >
          {loading ? "Signing Up..." : "Sign Up"}
        </button>

        <p className="mt-4 text-center text-sm">
          Already have an account?{" "}
          <span
            onClick={() => navigate("/login")}
            className="text-purple-600 hover:underline cursor-pointer"
          >
            Log in
          </span>
        </p>
      </div>
    </div>
  );
}
