from sqlalchemy.orm import Session

from models import User
from security import hash_password

def seed_default_users(db: Session):
    # 1. Define our new deployment targets
    default_users = [
        {
            "username": "Commander",
            "password": "Commander@2026",
            "role": "commander"
        },
        {
            "username": "Viewer",
            "password": "View@2026",
            "role": "viewer"
        }
    ]

    # 2. Inject default records ONLY if they do not already exist
    for user_data in default_users:
        user_exists = db.query(User).filter(User.username == user_data["username"]).first()
        
        if not user_exists:
            new_user = User(
                username=user_data["username"],
                hashed_password=hash_password(user_data["password"]),
                role=user_data["role"]
            )
            db.add(new_user)
    
    # Commit changes only if new defaults were added
    db.commit()