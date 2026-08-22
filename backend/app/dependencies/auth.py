from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import User
from ..utils.security import decode_subject

oauth2_scheme = OAuth2PasswordBearer(tokenUrl='/api/auth/login')
def current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    subject = decode_subject(token)
    user = db.get(User, int(subject)) if subject and subject.isdigit() else None
    if not user or not user.is_active: raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid authentication credentials')
    return user

def require_roles(*roles: str):
    def dependency(user: User = Depends(current_user)) -> User:
        if user.role not in roles: raise HTTPException(status_code=403, detail='Insufficient permissions')
        return user
    return dependency
