import sqlite3

def update_db():
    conn = sqlite3.connect('puzzle_game.db')
    c = conn.cursor()
    # Delete 'admin'
    c.execute("DELETE FROM users WHERE username='admin'")
    
    # We should add the power users properly using the backend logic
    conn.commit()
    conn.close()
    print("Deleted admin from DB")

update_db()
