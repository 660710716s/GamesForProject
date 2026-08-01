from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import desc, func, Integer, case
from typing import List
from pydantic import BaseModel
import time
import datetime
import io
import csv
from fastapi.responses import StreamingResponse

from database import engine, get_db, Base
from models import User, Game, GameSession, ActionLog, OperatorLabLog
from puzzle_generator import (
    get_hanoi_initial_state, calculate_hanoi_similarity,
    get_watersort_initial_state, calculate_watersort_similarity,
    get_rushhour_initial_state, calculate_rushhour_similarity,
    get_sudoku_initial_state, get_minesweeper_initial_state,
    get_sliding_initial_state,
    get_pegsolitaire_initial_state, get_sokoban_initial_state,
    get_nonogram_initial_state,
    solve_rushhour, solve_watersort, solve_pegsolitaire, solve_sliding_puzzle,
    solve_sokoban, solve_hanoi, generate_operator_puzzle, solve_operator_puzzle
)

app = FastAPI(title="Adaptive Puzzle API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure tables exist (they should from init_db.py)
Base.metadata.create_all(bind=engine)

# ====================
# Pydantic Schemas
# ====================
class LoginRequest(BaseModel):
    username: str
    password: str

from typing import List, Optional

class StartGameRequest(BaseModel):
    game_id: int
    user_id: int
    custom_level: Optional[int] = None

class ActionRequest(BaseModel):
    session_id: int
    action_detail: dict
    timestamp_ms: int
    similarity_score: float = 0.0  # Client-calculated similarity (0.0 - 1.0)

class EndSessionRequest(BaseModel):
    session_id: int
    is_success: bool

class HintRequest(BaseModel):
    session_id: int
    current_state: dict # Flexible payload e.g. {"tubes": [...]}, {"vehicles": [...]}

class OperatorHintRequest(BaseModel):
    numbers: List[int]
    target: int

class OperatorCheckRequest(BaseModel):
    numbers: List[int]
    operators: List[str]
    target: int

class OperatorLabLogRequest(BaseModel):
    user_id: int
    numbers: List[int]
    target: int
    operators_used: List[str]
    is_correct: bool
    hint_used: bool = False
    solve_time_ms: int = 0

# ====================
# Routes
# ====================

@app.get("/")
def read_root():
    return {"message": "Welcome to Adaptive Puzzle API"}

from fastapi import Request

# In-memory IP tracking for simple spam protection
ip_login_attempts = {}

@app.post("/login")
def login(req: LoginRequest, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host
    now = time.time()
    
    # Prune old records
    if client_ip in ip_login_attempts:
        ip_login_attempts[client_ip] = [t for t in ip_login_attempts[client_ip] if now - t < 60]
    else:
        ip_login_attempts[client_ip] = []
        
    if len(ip_login_attempts[client_ip]) >= 10:
        raise HTTPException(status_code=429, detail="Too many attempts. Please try again later.")
        
    ip_login_attempts[client_ip].append(now)

    # Validate username
    uname = req.username
    powerusers = ["adminnaew", "admincpsu"]
    if uname not in powerusers:
        if not uname.isdigit():
            raise HTTPException(status_code=400, detail="ID ต้องเป็นตัวเลขเท่านั้น")
        if len(uname) > 9:
            raise HTTPException(status_code=400, detail="ID ต้องมีความยาวไม่เกิน 9 หลัก")
    # Very basic dummy login for now
    user = db.query(User).filter(User.username == req.username).first()
    if not user:
        # Create dummy user dynamically
        # Admin gets level 10 instantly to review higher difficulties
        level = 10 if req.username in ["adminnaew", "admincpsu"] else 1
        user = User(username=req.username, password_hash="dummy", current_overall_level=level)
        db.add(user)
        db.commit()
        db.refresh(user)
    return {"user_id": user.user_id, "username": user.username, "level": user.current_overall_level}

@app.get("/games")
def get_games(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    games = db.query(Game).all()
    
    # Efficiently find mastered games for this user at their current level
    mastered_game_ids = set(
        db.query(GameSession.game_id)
        .filter(
            GameSession.user_id == user.user_id,
            GameSession.played_at_level == user.current_overall_level,
            GameSession.is_success == True,
            GameSession.move_efficiency >= 0.25
        )
        .all()
    )
    # the .all() returns a list of tuples like [(1,), (2,)], flatten it
    mastered_game_ids = {row[0] for row in mastered_game_ids}

    # Format return list
    results = []
    for g in games:
        results.append({
            "game_id": g.game_id,
            "game_name": g.game_name,
            "category": g.category,
            "is_mastered": g.game_id in mastered_game_ids
        })
    return results

@app.post("/session/start")
def start_session(req: StartGameRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.user_id == req.user_id).first()
    game = db.query(Game).filter(Game.game_id == req.game_id).first()
    if not user or not game:
        raise HTTPException(status_code=404, detail="User or Game not found")
        
    # Check power user condition
    is_poweruser = user.username in ["adminnaew", "admincpsu"]
    
    # Generate Puzzle state depending on game
    level = user.current_overall_level
    if is_poweruser and req.custom_level is not None:
        level = req.custom_level
        
    game_state = {}
    if "Hanoi" in game.game_name:
        game_state = get_hanoi_initial_state(level)
        # Double check overlap at API level
        start_r = next((i for i, r in enumerate(game_state["rods"]) if r), -1)
        if start_r == game_state["target_rod"]:
             # Re-generate if broken
             game_state = get_hanoi_initial_state(level)
    elif "Water Sort" in game.game_name:
        game_state = get_watersort_initial_state(level)
    elif "Sudoku" in game.game_name:
        game_state = get_sudoku_initial_state(level)
    elif "Minesweeper" in game.game_name:
        game_state = get_minesweeper_initial_state(level)
    elif "Sliding Puzzle" in game.game_name:
        game_state = get_sliding_initial_state(level)
    elif "Rush Hour" in game.game_name:
        game_state = get_rushhour_initial_state(level)
    elif "Peg Solitaire" in game.game_name:
        game_state = get_pegsolitaire_initial_state(level)
    elif "Sokoban" in game.game_name:
        game_state = get_sokoban_initial_state(level)
    elif "Nonogram" in game.game_name:
        game_state = get_nonogram_initial_state(level)

    # Note: Operator Lab doesn't use sessions by design, but we keep this list for standardized games
    else:
        game_state = {
            "game_type": "unimplemented",
            "message": f"Puzzle logic for {game.game_name} is not implemented yet.", 
            "level": level, 
            "min_moves_required": 10
        }
        
    min_moves_required = game_state.get("min_moves_required", 10)
    
    # Start DB Session
    new_session = GameSession(
        user_id=user.user_id, 
        game_id=game.game_id, 
        played_at_level=user.current_overall_level,
        min_moves_required=min_moves_required
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
        
    return {
        "session_id": new_session.session_id,
        "initial_state": game_state
    }

@app.post("/session/action")
def log_action(req: ActionRequest, db: Session = Depends(get_db)):
    g_session = db.query(GameSession).filter(GameSession.session_id == req.session_id).first()
    if not g_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Similarity is now calculated client-side and sent directly
    new_log = ActionLog(
        session_id=g_session.session_id,
        action_detail=req.action_detail,
        timestamp_ms=req.timestamp_ms,
        similarity_score=req.similarity_score
    )
    db.add(new_log)
    db.commit()
    
    return {"status": "success", "similarity_score": req.similarity_score}

@app.post("/session/end")
def end_session(req: EndSessionRequest, db: Session = Depends(get_db)):
    g_session = db.query(GameSession).filter(GameSession.session_id == req.session_id).first()
    if not g_session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    g_session.end_time = datetime.datetime.utcnow()
    g_session.is_success = req.is_success
    user = g_session.user
    current_level = user.current_overall_level
    
    # Calculate moves taken and efficiency
    actual_moves = db.query(ActionLog).filter(ActionLog.session_id == g_session.session_id).count()
    g_session.actual_moves = actual_moves
    
    min_moves = max(1, g_session.min_moves_required)
    if actual_moves > 0:
        g_session.move_efficiency = round(min_moves / max(actual_moves, min_moves), 4)
    else:
        g_session.move_efficiency = 0.0
        
    db.commit()
    
    # Check if the user has successfully finished all games 
    # (req.is_success = True) at their current level with >= 25% efficiency
    total_games_count = db.query(Game).count()
    
    mastered_games = (
        db.query(GameSession.game_id)
        .filter(
            GameSession.user_id == user.user_id,
            GameSession.played_at_level == current_level,
            GameSession.is_success == True,
            GameSession.move_efficiency >= 0.25
        )
        .distinct()
        .count()
    )
    
    leveled_up = False
    mastery_threshold = total_games_count
    
    if mastered_games >= mastery_threshold and total_games_count > 0:
        user.current_overall_level += 1
        db.commit()
        leveled_up = True
        
    mastery_progress = f"{mastered_games}/{mastery_threshold}"
    return {
        "status": "success",
        "session_id": g_session.session_id,
        "new_level": user.current_overall_level,
        "leveled_up": leveled_up,
        "mastery_progress": mastery_progress,
        "message": "Protocol Matrix Fully Mastered! Advancing to Next Tier." if leveled_up else f"Complete all {mastery_threshold} simulations with >=25% efficiency to level up."
    }

@app.post("/session/hint")
def request_hint(req: HintRequest, db: Session = Depends(get_db)):
    """
    Dynamically processes the current board state and returns the optimal next move.
    Used for 'Real-time AI Hint' capabilities.
    """
    g_session = db.query(GameSession).filter(GameSession.session_id == req.session_id).first()
    if not g_session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    game_name = g_session.game.game_name
    state = req.current_state
    
    try:
        if "Tower of Hanoi" in game_name or "Hanoi" in game_name:
            if "rods" not in state or "target_rod" not in state:
                raise ValueError("Missing rods or target_rod in payload")
            rods = state["rods"]
            target_rod = state["target_rod"]
            solution = solve_hanoi(rods, target_rod)
            if not solution:
                return {"status": "success", "move": None, "detail": "Simulation optimized."}
            return {"status": "success", "move": solution[0]}

        elif "Water Sort" in game_name:
            if "tubes" not in state:
                raise ValueError("Missing tubes array in payload")
            tubes = [list(t) for t in state["tubes"]]
            # Provide generic large capacity bound
            capacity = max((len(t) for t in tubes), default=4)
            if tubes:
                 max_t_len = max(len(t) for t in tubes)
                 capacity = max(capacity, max_t_len)
                 # Wait, capacity should be 4 standard for Water Sort
                 capacity = 4 if max_t_len <= 4 else max_t_len
            
            # The generation sets tube_capacity based on level
            # Or just assume 4 typically. Actually we can do generic
            solution = solve_watersort(tubes, capacity, limit=50000)
            if solution is None or len(solution) == 0:
                return {"status": "dead_end", "detail": "Impossible to solve from this strict state."}
            return {"status": "success", "move": solution[0]}
            
        elif "Rush Hour" in game_name:
            if "vehicles" not in state:
                raise ValueError("Missing vehicles array in payload")
            vehicles = state["vehicles"]
            # Typically exit_y = 2, grid = 6
            # We can extract grid_size from the payload if provided, else assume 6
            grid_size = state.get("grid_size", 6)
            exit_y = state.get("exit_y", 2)
            
            solution = solve_rushhour(vehicles, grid_size, exit_y, limit=50000)
            if solution is None or len(solution) == 0:
                return {"status": "dead_end", "detail": "Traffic jammed completely. Reset required."}
            return {"status": "success", "move": solution[0]}

        elif "Peg Solitaire" in game_name:
            if "board" not in state:
                raise ValueError("Missing board array in payload")
            board = state["board"]
            solution = solve_pegsolitaire(board, limit=200000)
            if solution is None or len(solution) == 0:
                return {"status": "dead_end", "detail": "This state presents no valid mathematical solution. Reset required."}
            return {"status": "success", "move": solution[0]}

        elif "Sliding Puzzle" in game_name or "Sliding Nexus" in game_name:
            if "board" not in state:
                raise ValueError("Missing board key in payload")
            board = state["board"]
            size = len(board)
            solution = solve_sliding_puzzle(board, size, limit=50000)
            if solution is None or len(solution) == 0:
                return {"status": "dead_end", "detail": "Optimal path calculation timed out or puzzle scrambled into parity error."}
            return {"status": "success", "move": solution[0]}
            
        elif "Sokoban" in game_name:
            if "layout" not in state or "player" not in state or "boxes" not in state:
                raise ValueError("Missing layout, player, or boxes in payload")
            layout = state["layout"]
            player = state["player"]
            boxes = state["boxes"]
            solution = solve_sokoban(layout, player, boxes, limit=50000)
            if solution is None or len(solution) == 0:
                return {"status": "dead_end", "detail": "Box in deadlock or search limit exceeded."}
            return {"status": "success", "move": solution[0]}
            
        else:
             raise HTTPException(status_code=400, detail="Real-time hint not systematically implemented for this mode yet.")
             
    except Exception as e:
        print(f"Hint Error: {e}")
        return {"status": "error", "detail": str(e)}

# ====================
# Operator Lab (Logic Sandbox)
# ====================

@app.get("/api/operator-lab/puzzle")
def get_operator_lab_puzzle():
    return generate_operator_puzzle()

@app.post("/api/operator-lab/check")
def check_operator_lab(req: OperatorCheckRequest):
    n = req.numbers
    o = req.operators
    if len(n) != 4 or len(o) != 3:
        raise HTTPException(status_code=400, detail="Invalid inputs")
    
    expr = f"{n[0]} {o[0]} {n[1]} {o[1]} {n[2]} {o[2]} {n[3]}"
    allowed_ops = ['+', '-', '*', '/', '//', '%', '**']
    if any(op not in allowed_ops for op in o):
        raise HTTPException(status_code=400, detail="Operator not allowed")
    
    try:
        # Limited eval for safety
        result = eval(expr, {"__builtins__": {}}, {})
        return {
            "result": result,
            "is_correct": result == req.target
        }
    except Exception as e:
        return {"error": str(e), "is_correct": False}

@app.post("/api/operator-lab/hint")
def hint_operator_lab(req: OperatorHintRequest):
    solution = solve_operator_puzzle(req.numbers, req.target)
    if solution:
        return {"operators": solution}
    else:
        raise HTTPException(status_code=404, detail="No solution found")

@app.post("/api/operator-lab/log")
def log_operator_lab(req: OperatorLabLogRequest, db: Session = Depends(get_db)):
    """Log an Operator Lab attempt. Separate from GameSession/mastery system."""
    new_log = OperatorLabLog(
        user_id=req.user_id,
        numbers=req.numbers,
        target=req.target,
        operators_used=req.operators_used,
        is_correct=req.is_correct,
        hint_used=req.hint_used,
        solve_time_ms=req.solve_time_ms
    )
    db.add(new_log)
    db.commit()
    return {"status": "logged", "log_id": new_log.log_id}

# ====================
# Admin Statistics
# ====================

@app.get("/admin/stats/summary")
def get_stats_summary(db: Session = Depends(get_db)):
    total_sessions = db.query(GameSession).count()
    total_users = db.query(User).count()
    successful_sessions = db.query(GameSession).filter(GameSession.is_success == True).count()
    avg_efficiency = db.query(func.avg(GameSession.move_efficiency)).scalar() or 0
    
    return {
        "total_sessions": total_sessions,
        "total_users": total_users,
        "success_rate": round(successful_sessions / max(total_sessions, 1) * 100, 2),
        "avg_efficiency": round(avg_efficiency * 100, 2)
    }

@app.get("/admin/stats/games")
def get_stats_games(db: Session = Depends(get_db)):
    # Total sessions per game
    results = db.query(
        Game.game_name,
        func.count(GameSession.session_id).label("total_sessions"),
        func.avg(GameSession.move_efficiency).label("avg_efficiency"),
        func.sum(func.cast(GameSession.is_success, Integer)).label("success_count")
    ).outerjoin(GameSession, Game.game_id == GameSession.game_id).group_by(Game.game_id, Game.game_name).all()
    
    return [
        {
            "game_name": r.game_name,
            "total_sessions": r.total_sessions,
            "avg_efficiency": round(r.avg_efficiency * 100, 2) if r.avg_efficiency else 0,
            "success_rate": round(r.success_count / max(r.total_sessions, 1) * 100, 2) if r.success_count is not None else 0
        } for r in results
    ]

@app.get("/admin/stats/users")
def get_stats_users(db: Session = Depends(get_db)):
    # User rankings
    results = db.query(
        User.username,
        User.current_overall_level,
        func.count(GameSession.session_id).label("total_sessions"),
        func.avg(GameSession.move_efficiency).label("avg_efficiency")
    ).outerjoin(GameSession, User.user_id == GameSession.user_id).group_by(User.user_id, User.username, User.current_overall_level).order_by(desc(User.current_overall_level), desc(func.count(GameSession.session_id))).all()
    
    return [
        {
            "username": r.username,
            "level": r.current_overall_level,
            "total_sessions": r.total_sessions,
            "avg_efficiency": round(r.avg_efficiency * 100, 2) if r.avg_efficiency else 0
        } for r in results
    ]

@app.get("/admin/stats/time-series")
def get_time_series(period: str = "daily", db: Session = Depends(get_db)):
    # period can be daily, weekly, monthly
    if period == "daily":
        group_format = "%Y-%m-%d"
    elif period == "weekly":
        group_format = "%Y-%W"
    else: # monthly
        group_format = "%Y-%m"
        
    results = db.query(
        func.strftime(group_format, GameSession.start_time).label("period_label"),
        func.count(GameSession.session_id).label("count")
    ).group_by("period_label").order_by("period_label").all()
    
    return [{"period": r.period_label, "count": r.count} for r in results]

@app.get("/admin/stats/users/detail")
def get_users_detail(db: Session = Depends(get_db)):
    """Detailed per-user analytics with per-game breakdown.
    Uses SQL aggregation to avoid N+1 query chains.
    """
    # --- 1. Per-game aggregates per user (single query) ---
    per_game_rows = (
        db.query(
            GameSession.user_id,
            Game.game_name,
            func.count(GameSession.session_id).label("plays"),
            func.sum(case((GameSession.is_success == True, 1), else_=0)).label("wins"),
            func.avg(GameSession.move_efficiency).label("avg_eff"),
            func.sum(
                case(
                    (GameSession.end_time != None,
                     func.julianday(GameSession.end_time) - func.julianday(GameSession.start_time)),
                    else_=0
                )
            ).label("total_days")
        )
        .join(Game, Game.game_id == GameSession.game_id)
        .group_by(GameSession.user_id, Game.game_name)
        .all()
    )

    # Build dict: user_id -> list of game dicts
    game_by_user: dict = {}
    session_totals: dict = {}  # user_id -> {sessions, wins, total_s}
    for row in per_game_rows:
        uid = row.user_id
        plays = row.plays or 0
        wins = row.wins or 0
        avg_eff = (row.avg_eff or 0) * 100
        avg_time_s = ((row.total_days or 0) * 86400) / max(plays, 1)
        total_s = (row.total_days or 0) * 86400

        if uid not in game_by_user:
            game_by_user[uid] = []
            session_totals[uid] = {"sessions": 0, "wins": 0, "total_s": 0.0}

        game_by_user[uid].append({
            "game": row.game_name,
            "plays": plays,
            "wins": wins,
            "win_rate": round(wins / max(plays, 1) * 100, 1),
            "avg_efficiency": round(avg_eff, 1),
            "avg_time_s": round(avg_time_s, 1)
        })
        session_totals[uid]["sessions"] += plays
        session_totals[uid]["wins"] += wins
        session_totals[uid]["total_s"] += total_s

    # --- 2. Operator Lab aggregates per user (single query) ---
    op_rows = (
        db.query(
            OperatorLabLog.user_id,
            func.count(OperatorLabLog.log_id).label("attempts"),
            func.sum(case((OperatorLabLog.is_correct == True, 1), else_=0)).label("correct"),
            func.sum(case((OperatorLabLog.hint_used == True, 1), else_=0)).label("hints")
        )
        .group_by(OperatorLabLog.user_id)
        .all()
    )
    op_by_user = {
        r.user_id: {
            "attempts": r.attempts or 0,
            "correct": r.correct or 0,
            "hints_used": r.hints or 0,
        }
        for r in op_rows
    }

    # --- 3. Build result (no extra queries) ---
    users = db.query(User).order_by(User.username).all()
    result = []
    for u in users:
        uid = u.user_id
        totals = session_totals.get(uid)
        if not totals or totals["sessions"] == 0:
            continue  # skip users with no sessions

        n_sessions = totals["sessions"]
        op = op_by_user.get(uid, {"attempts": 0, "correct": 0, "hints_used": 0})
        op_attempts = op["attempts"]
        op_correct = op["correct"]

        result.append({
            "username": u.username,
            "level": u.current_overall_level,
            "total_sessions": n_sessions,
            "total_wins": totals["wins"],
            "total_hints_used": 0,  # hint counting from action_logs omitted for perf; add separately if needed
            "avg_time_per_session_s": round(totals["total_s"] / max(n_sessions, 1), 1),
            "games": game_by_user.get(uid, []),
            "operator_lab": {
                "attempts": op_attempts,
                "correct": op_correct,
                "accuracy": round(op_correct / max(op_attempts, 1) * 100, 1),
                "hints_used": op["hints_used"]
            }
        })

    return result

@app.get("/admin/stats/operator-lab")
def get_operator_lab_stats(db: Session = Depends(get_db)):
    """Operator Lab global analytics — uses SQL aggregates, no Python loops."""
    row = (
        db.query(
            func.count(OperatorLabLog.log_id).label("total"),
            func.sum(case((OperatorLabLog.is_correct == True, 1), else_=0)).label("correct"),
            func.sum(case((OperatorLabLog.hint_used == True, 1), else_=0)).label("hints"),
            func.avg(OperatorLabLog.solve_time_ms).label("avg_ms")
        )
        .one()
    )
    total = row.total or 0
    if total == 0:
        return {"total_attempts": 0, "accuracy": 0, "avg_solve_time_s": 0, "hint_usage_rate": 0}

    return {
        "total_attempts": total,
        "accuracy": round((row.correct or 0) / total * 100, 1),
        "avg_solve_time_s": round((row.avg_ms or 0) / 1000, 1),
        "hint_usage_rate": round((row.hints or 0) / total * 100, 1)
    }

# ====================
# CSV Export Endpoints
# ====================

@app.get("/admin/export/sessions")
def export_sessions_csv(username: Optional[str] = None, db: Session = Depends(get_db)):
    """Export game sessions as CSV. Optionally filter by username."""
    query = db.query(GameSession)
    if username:
        user = db.query(User).filter(User.username == username).first()
        if user:
            query = query.filter(GameSession.user_id == user.user_id)
    sessions = query.order_by(GameSession.start_time.desc()).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["session_id", "username", "game", "level", "min_moves", "actual_moves", 
                     "efficiency", "is_success", "start_time", "end_time", "duration_s"])
    
    for s in sessions:
        duration = ""
        if s.start_time and s.end_time:
            duration = round((s.end_time - s.start_time).total_seconds(), 1)
        writer.writerow([
            s.session_id,
            s.user.username if s.user else "",
            s.game.game_name if s.game else "",
            s.played_at_level,
            s.min_moves_required,
            s.actual_moves,
            round((s.move_efficiency or 0) * 100, 2),
            s.is_success,
            s.start_time.isoformat() if s.start_time else "",
            s.end_time.isoformat() if s.end_time else "",
            duration
        ])
    
    fname = f"sessions_{username}.csv" if username else "game_sessions.csv"
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={fname}"}
    )

@app.get("/admin/export/actions")
def export_actions_csv(username: Optional[str] = None, db: Session = Depends(get_db)):
    """Export action logs as CSV. Optionally filter by username."""
    query = db.query(ActionLog)
    if username:
        user = db.query(User).filter(User.username == username).first()
        if user:
            user_session_ids = [s.session_id for s in db.query(GameSession.session_id).filter(GameSession.user_id == user.user_id).all()]
            query = query.filter(ActionLog.session_id.in_(user_session_ids))
    logs = query.order_by(ActionLog.log_id).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["log_id", "session_id", "username", "game", "action_type", 
                     "similarity_score", "timestamp_ms", "action_detail"])
    
    for log in logs:
        session = log.session
        action_type = ""
        if isinstance(log.action_detail, dict):
            action_type = log.action_detail.get("type", "player_move")
        writer.writerow([
            log.log_id,
            log.session_id,
            session.user.username if session and session.user else "",
            session.game.game_name if session and session.game else "",
            action_type,
            round(log.similarity_score or 0, 4),
            log.timestamp_ms,
            str(log.action_detail) if log.action_detail else ""
        ])
    
    fname = f"actions_{username}.csv" if username else "action_logs.csv"
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={fname}"}
    )

@app.get("/admin/export/operator-lab")
def export_operator_lab_csv(username: Optional[str] = None, db: Session = Depends(get_db)):
    """Export Operator Lab logs as CSV. Optionally filter by username."""
    query = db.query(OperatorLabLog)
    if username:
        user = db.query(User).filter(User.username == username).first()
        if user:
            query = query.filter(OperatorLabLog.user_id == user.user_id)
    logs = query.order_by(OperatorLabLog.timestamp.desc()).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["log_id", "username", "numbers", "target", "operators_used", 
                     "is_correct", "hint_used", "solve_time_ms", "timestamp"])
    
    for log in logs:
        user_obj = db.query(User).filter(User.user_id == log.user_id).first()
        writer.writerow([
            log.log_id,
            user_obj.username if user_obj else "",
            str(log.numbers),
            log.target,
            str(log.operators_used),
            log.is_correct,
            log.hint_used,
            log.solve_time_ms,
            log.timestamp.isoformat() if log.timestamp else ""
        ])
    
    fname = f"operator_lab_{username}.csv" if username else "operator_lab_logs.csv"
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={fname}"}
    )

