import sqlite3
import os

# Database file is in backend/puzzle_game.db
db_path = os.path.join(os.path.dirname(__file__), '../backend/puzzle_game.db')

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 1. Delete the game entry
cursor.execute("DELETE FROM games WHERE game_name = 'Light Up (Akari)'")
deleted_count = cursor.rowcount

# 2. Delete any sessions associated with it (as per request "all database")
# This might not be strictly necessary if there's no FK constraint, 
# but it's cleaner to remove traces. 
# However, usually we keep history, but the user said "remove from database completely".
# We should probably check if sessions table exists.

cursor.execute("DELETE FROM game_sessions WHERE game_id NOT IN (SELECT game_id FROM games)")
sessions_deleted = cursor.rowcount

conn.commit()
conn.close()

print(f"Successfully removed {deleted_count} game records and {sessions_deleted} associated session records.")
