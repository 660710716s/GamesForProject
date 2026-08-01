import sys
import os
from collections import deque

# Add the current directory to path so we can import puzzle_generator
sys.path.append(os.getcwd())

from backend.puzzle_generator import solve_rushhour, get_rushhour_initial_state

def test_rushhour_solver():
    print("Testing Rush Hour Solver...")
    level_1 = get_rushhour_initial_state(1)
    vehicles = level_1["vehicles"]
    grid_size = level_1["grid_size"]
    exit_y = level_1["exit_y"]
    solution = level_1["solution"]
    min_moves = level_1["min_moves_required"]
    
    print(f"Level 1 Vehicles Count: {len(vehicles)}")
    print(f"Optimal solution length: {min_moves}")
    print(f"First few moves: {solution[:3] if solution else 'Solved'}")
    
    # Testing higher level
    print("\nTesting Level 10 Rush Hour (Stress Test)...")
    level_10 = get_rushhour_initial_state(10)
    print(f"Optimal solution length (L10): {level_10['min_moves_required']}")
    print("Success!")

if __name__ == "__main__":
    test_rushhour_solver()
