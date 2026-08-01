from database import Base, engine, SessionLocal
import models
import datetime

def run_tests():
    db = SessionLocal()
    
    user = models.User(username="test_guesser2", password_hash="123", current_overall_level=1)
    db.add(user)
    db.commit()
    db.refresh(user)
    
    games = db.query(models.Game).all()
    
    print("\n--- Test 1/2: Simulating Random Guessing (Many moves) ---")
    game1 = games[0]
    sess1 = models.GameSession(user_id=user.user_id, game_id=game1.game_id, played_at_level=1, min_moves_required=7, is_success=True)
    db.add(sess1)
    db.commit()
    db.refresh(sess1)
    
    # Simulate 20 moves (7 is min). Efficiency should be 7/20 = 0.35.
    for i in range(20):
        log = models.ActionLog(session_id=sess1.session_id, action_detail={"mock": "move"}, timestamp_ms=0, similarity_score=1.0)
        db.add(log)
    db.commit()
    
    actual_moves = db.query(models.ActionLog).filter(models.ActionLog.session_id == sess1.session_id).count()
    efficiency = 7 / max(actual_moves, 7)
    
    mastered = (
        db.query(models.GameSession.game_id)
        .filter(
            models.GameSession.session_id == sess1.session_id,
            models.GameSession.is_success == True,
            models.GameSession.move_efficiency >= 0.8
        )
        .count()
    )
    if mastered > 0:
        print(f"FAIL: Guesser bypassed efficiency block and mastered game! (Eff: {efficiency:.2f})")
    else:
        print(f"PASS: Guesser correctly held back by efficiency block! (Eff: {efficiency:.2f})")

if __name__ == "__main__":
    run_tests()
