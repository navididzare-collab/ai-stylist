import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> int:
    """
    این dependency رو روی هر route ای که نیاز به لاگین داره بذار.
    شناسه‌ی کاربر رو از هدر Authorization: Bearer <token> استخراج و verify می‌کنه.
    هیچ‌وقت به user_id ای که از URL یا body میاد اعتماد نکن؛ همیشه از اینجا بگیر.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="برای این عملیات باید وارد حساب کاربری شوید.",
        )

    try:
        return decode_access_token(credentials.credentials)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="نشست شما منقضی شده است. دوباره وارد شوید.",
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="توکن نامعتبر است.",
        )
