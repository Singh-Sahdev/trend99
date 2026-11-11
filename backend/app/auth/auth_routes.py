# auth_routes.py
from fastapi import Depends, APIRouter, HTTPException, Form, UploadFile, File, status
from fastapi.responses import JSONResponse
from .auth import signup_with_email_password, upload_image_and_get_url
from firebase_admin import auth as firebase_auth
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/auth", tags=["Auth"])

security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        decoded_token = firebase_auth.verify_id_token(token)
        return decoded_token   # contains uid, email, etc.
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

@router.post("/signup/")
def signup(
    email: str = Form(...),
    password: str = Form(...),
    display_name: str = Form(...),
    file: UploadFile = File(None)
):
    try:
        photo_url = None
        photo_public_id = None
        if file:
            photo_data = upload_image_and_get_url(file)
            photo_url = photo_data.get("secure_url")
            photo_public_id = photo_data.get("public_id")
        user = signup_with_email_password(
            email=email,
            password=password,
            display_name=display_name,
            photo_url=photo_url,
            photo_public_id=photo_public_id
        )
        return {"message": "User created", "user": user}
    except HTTPException as e:
        print(f"Error during signup: {e.detail}")
        raise e
    except Exception as e:
        print(f"Unexpected error during signup: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/upload-photo/")
def upload_photo(file: UploadFile = File(...)):
    try:
        result = upload_image_and_get_url(file)
        return result
    except HTTPException as e:
        print(f"HTTP error during image upload: {e.detail}")
        raise e
    except Exception as e:
        print(f"Error uploading photo: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to upload photo")

@router.post("/update-profile/")
def update_profile(
    email: str = Form(...),
    display_name: str = Form(...),
    phone_number: str = Form(None),
    file: UploadFile = File(None)
):
    try:
        # Lookup user
        user = firebase_auth.get_user_by_email(email)

        update_data = {
            "display_name": display_name,
            "email": email,
        }

        # Upload image if provided
        if file:
            photo_data = upload_image_and_get_url(file)
            update_data["photo_url"] = photo_data.get("secure_url")
            update_data["custom_claims"] = {"photo_public_id": photo_data.get("public_id")}

        # Update the user profile
        firebase_auth.update_user(
            uid=user.uid,
            display_name=update_data["display_name"],
            photo_url=update_data.get("photo_url")
        )

        # Update custom claims (e.g., store public_id for deletion if needed)
        if "custom_claims" in update_data:
            firebase_auth.set_custom_user_claims(user.uid, update_data["custom_claims"])

        return {"message": "Profile updated successfully"}

    except firebase_auth.UserNotFoundError:
        raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        print(f"Error updating profile: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update profile")

