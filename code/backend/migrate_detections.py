import sqlite3
import os

DB_PATH = "backend/visionestate.db"

def run_migration():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(properties)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if "ai_detections" not in columns:
            print("Adding ai_detections column...")
            cursor.execute("ALTER TABLE properties ADD COLUMN ai_detections TEXT")
            conn.commit()
            print("Migration successful: ai_detections column added.")
        else:
            print("Column ai_detections already exists.")
            
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    run_migration()
