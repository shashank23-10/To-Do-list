from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Request, HTTPException
from .auth_handler import decode_access_token

class JWTBearer(HTTPBearer):
    def __init__(self, auto_error: bool = True):
        super(JWTBearer, self).__init__(auto_error=auto_error)

    async def __call__(self, request: Request) -> str:
        credentials: HTTPAuthorizationCredentials = await super(JWTBearer, self).__call__(request)
        if not credentials or credentials.scheme.lower() != "bearer":
            raise HTTPException(status_code=403, detail="Invalid authorization scheme")

        token = credentials.credentials
        if not self.verify_jwt(token):
            raise HTTPException(status_code=403, detail="Invalid or expired token")

        return token

    def verify_jwt(self, token: str) -> bool:
        payload = decode_access_token(token)
        return bool(payload)  # Returns False if decoding fails
