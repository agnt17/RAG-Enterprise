from database import engine, Base
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text("DROP TABLE IF EXISTS conversations"))
    conn.execute(text("DROP TABLE IF EXISTS documents"))
    conn.commit()
    print("Tables dropped successfully!")