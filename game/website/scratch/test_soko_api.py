import sys
import os

# add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

from puzzle_generator import solve_sokoban

layout = [
    [1, 1, 1, 1, 1, 1, 1], 
    [1, 0, 0, 0, 0, 0, 1], 
    [1, 0, 0, 0, 0, 0, 1], 
    [1, 0, 0, 0, 0, 0, 1], 
    [1, 0, 0, 0, 0, 0, 1], 
    [1, 0, 0, 0, 0, 2, 1], 
    [1, 1, 1, 1, 1, 1, 1]
]
player = [3, 3]
boxes = [[5, 4]]  # pushed away from target!

print("Solving...")
path = solve_sokoban(layout, player, boxes, limit=50000)

if path is None:
    print("FAILED TO SOLVE")
else:
    print(f"Solved! Length: {len(path)}")
    print("First move:", path[0])
