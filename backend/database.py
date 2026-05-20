from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Referencing the persistent internal storage pathway inside the backend container
SQLALCHEMY_DATABASE_URL = "sqlite:////data/robot_app.db"

# Establishing the core database connectivity engine with explicit execution parameters
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Constructing the registry foundation for database relational mappings
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        # Releasing active resources back to the pool upon lifecycle completion
        db.close()