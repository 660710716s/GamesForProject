from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, JSON, BigInteger, Boolean
from sqlalchemy.orm import relationship
import datetime

from database import Base

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    password_hash = Column(String(255))
    current_overall_level = Column(Integer, default=1)

    sessions = relationship("GameSession", back_populates="user")

class Game(Base):
    __tablename__ = "games"

    game_id = Column(Integer, primary_key=True, index=True)
    game_name = Column(String(100), unique=True)
    category = Column(String(100))

    sessions = relationship("GameSession", back_populates="game")

class GameSession(Base):
    __tablename__ = "game_sessions"

    session_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    game_id = Column(Integer, ForeignKey("games.game_id"))
    played_at_level = Column(Integer, default=1)
    min_moves_required = Column(Integer, default=0)
    actual_moves = Column(Integer, default=0)
    move_efficiency = Column(Float, default=0.0)
    is_success = Column(Boolean, default=False)
    start_time = Column(DateTime, default=datetime.datetime.utcnow)
    end_time = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="sessions")
    game = relationship("Game", back_populates="sessions")
    action_logs = relationship("ActionLog", back_populates="session")

class ActionLog(Base):
    __tablename__ = "action_logs"

    log_id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("game_sessions.session_id"))
    action_detail = Column(JSON) # Store fine-grained data like {"from": "A", "to": "B", "ring": 1}
    timestamp_ms = Column(BigInteger) # To store ms accurately
    similarity_score = Column(Float) # Score metric evaluating distance to solution

    session = relationship("GameSession", back_populates="action_logs")

class OperatorLabLog(Base):
    __tablename__ = "operator_lab_logs"

    log_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), index=True)
    numbers = Column(JSON)          # [3, 7, 2, 5]
    target = Column(Integer)        # 18
    operators_used = Column(JSON)   # ['+', '*', '-']
    is_correct = Column(Boolean)
    hint_used = Column(Boolean, default=False)
    solve_time_ms = Column(BigInteger)  # ms from puzzle load to check
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User")
