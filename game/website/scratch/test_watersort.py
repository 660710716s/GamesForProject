import sys
import os

# Add the current directory to path so we can import puzzle_generator
sys.path.append(os.getcwd())

from backend.puzzle_generator import solve_watersort, get_watersort_initial_state

def test_watersort_solver():
    print("Testing Water Sort Solver...")
    level_1 = get_watersort_initial_state(1)
    tubes = level_1["tubes"]
    capacity = level_1["tube_capacity"]
    solution = level_1["solution"]
    min_moves = level_1["min_moves_required"]
    
    print(f"Level 1 Tubes: {tubes}")
    print(f"Optimal solution length: {min_moves}")
    print(f"First few moves: {solution[:3] if solution else 'Solved'}")
    
    # Testing higher level
    print("\nTesting Level 10 Water Sort (Stress Test)...")
    level_10 = get_watersort_initial_state(10)
    print(f"Optimal solution length (L10): {level_10['min_moves_required']}")
    print("Success!")

if __name__ == "__main__":
    test_watersort_solver()
