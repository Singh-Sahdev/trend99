import { useEffect, useState } from "react";
import { Input } from "../assets/input";
import { Button } from "../assets/button";
import { Card, CardContent } from "../assets/card";
import { toast } from "../assets/sonner";
import { useSelector } from "react-redux";
import { RootState } from "../app/store";

const Profile = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    photoURL: "",
  });

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || "",
        email: user.email || "",
        photoURL: user.photoURL || "",
      });
      setPreviewImage(user.photoURL || null);
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    try {
      const form = new FormData();
      form.append("email", formData.email);
      form.append("display_name", formData.displayName);
      if (imageFile) form.append("file", imageFile);

      const res = await fetch("http://localhost:8000/auth/update-profile/", {
        method: "POST",
        body: form,
      });

      if (!res.ok) throw new Error("Failed to update profile");

      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error("Error updating profile");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 pt-20">
      <Card className="max-w-xl mx-auto rounded-2xl shadow-2xl p-6">
        <CardContent>
          <h2 className="text-3xl font-bold text-purple-700 mb-8 text-center">
            Edit Profile
          </h2>

          <div className="flex flex-col gap-6">
            {/* Profile Image */}
            <div className="flex flex-col items-center gap-3">
              {previewImage && (
                <img
                  src={previewImage}
                  alt="Profile Preview"
                  className="w-24 h-24 rounded-full object-cover shadow"
                />
              )}
              <label className="text-sm font-medium text-gray-700">
                Profile Picture
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="text-sm file:bg-purple-500 file:text-white file:rounded-md file:px-4 file:py-1"
              />
            </div>

            {/* Display Name */}
            <div>
              <label htmlFor="displayName" className="text-sm font-medium text-gray-700 block mb-1">
                Display Name
              </label>
              <Input
                id="displayName"
                name="displayName"
                placeholder="Enter your display name"
                value={formData.displayName}
                onChange={handleChange}
                className="rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-400 focus:outline-none"
              />
            </div>

            {/* Email (Read Only) */}
            <div>
              <label htmlFor="email" className="text-sm font-medium text-gray-700 block mb-1">
                Email (cannot be changed)
              </label>
              <Input
                id="email"
                name="email"
                placeholder="Your email"
                value={formData.email}
                disabled
                className="rounded-xl bg-gray-100 text-gray-500 border border-gray-300"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-center">
              <Button
                onClick={handleSubmit}
                className="bg-gradient-purple text-white font-semibold rounded-xl px-6 py-2"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
