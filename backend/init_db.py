from sqlalchemy.orm import Session

from models import User
from security import hash_password

def seed_default_users(db: Session):
    # Setting up the account details for our initial user accounts
    default_users = [
        {
            "username": "Commander",
            "password": "Commander@2026",
            "role": "commander"
        },
        {
            "username": "Viewer",
            "password": "Viewer@2026",
            "role": "viewer"
        }
    ]

    # Checking each profile one by one against the existing database records
    for user_data in default_users:
        user_exists = db.query(User).filter(User.username == user_data["username"]).first()
        
        # Creating a fresh user record only when the username is missing
        if not user_exists:
            new_user = User(
                username=user_data["username"],
                hashed_password=hash_password(user_data["password"]),
                role=user_data["role"]
            )
            db.add(new_user)
    db.commit()