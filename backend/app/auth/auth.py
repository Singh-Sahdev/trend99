import requests
from fastapi import HTTPException, UploadFile

FIREBASE_API_KEY = "AIzaSyCKdaUx8hS6R4gLx6PFwhhdWPG2EF_VQaA"

import cloudinary
import cloudinary.uploader

# Configure Cloudinary
cloudinary.config(
    cloud_name="dxmdglhft",
    api_key="497881937523295",
    api_secret="R0GFDvjTYJn_hW0rmpd0ST25k28"
)

def signup_with_email_password(email: str, password: str, display_name: str, photo_url: str = None, photo_public_id: str = None):
    """Sign up a new user with email and password, and optionally update their profile with display name, photo URL, and phone number.
    """
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={FIREBASE_API_KEY}"
    payload = {
        "email": email,
        "password": password,
        "returnSecureToken": True
    }
    response = requests.post(url, json=payload)
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail=response.json()["error"]["message"])

    user_data = response.json()
    
    # Now update user profile with displayName, photoUrl, phoneNumber if provided
    if display_name or photo_url:
        update_url = f"https://identitytoolkit.googleapis.com/v1/accounts:update?key={FIREBASE_API_KEY}"
        update_payload = {
            "idToken": user_data["idToken"],
            "displayName": display_name,
            "photoUrl": photo_url,
            "photoPublicId": photo_public_id,
            "returnSecureToken": True
        }
        update_response = requests.post(update_url, json=update_payload)
        if update_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to update user profile")
        print(update_response.json())
        user_data.update(update_response.json())

    return user_data



def upload_image_and_get_url(file: UploadFile):
    try:
        result = cloudinary.uploader.upload(file.file)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail="Image upload failed: " + str(e))

