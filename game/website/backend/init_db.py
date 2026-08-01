from database import engine, Base, SessionLocal
from models import Game

def init_db():
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")

    # Seed the 10 games into the database
    db = SessionLocal()
    
    games_to_seed = [
        {"game_name": "Tower of Hanoi", "category": "Sequential & Constraints"},
        {"game_name": "Water Sort Puzzle", "category": "Sequential & Constraints"},
        {"game_name": "Peg Solitaire", "category": "Sequential & Constraints"},
        {"game_name": "Sliding Puzzle (15-Puzzle)", "category": "Sliding & Spatial"},
        {"game_name": "Rush Hour (Traffic Jam)", "category": "Sliding & Spatial"},
        {"game_name": "Sokoban", "category": "Sliding & Spatial"},
        {"game_name": "Sudoku", "category": "Logic & Grid"},
        {"game_name": "Nonogram (Picross)", "category": "Logic & Grid"},
        {"game_name": "Minesweeper", "category": "Logic & Grid"},

    ]

    for g in games_to_seed:
        existing_game = db.query(Game).filter(Game.game_name == g["game_name"]).first()
        if not existing_game:
            new_game = Game(game_name=g["game_name"], category=g["category"])
            db.add(new_game)
    
    db.commit()
    db.close()
    print("Seeded games list into the database.")

if __name__ == "__main__":
    init_db()
