import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

from puzzle_generator import get_hanoi_initial_state

state = get_hanoi_initial_state(1)
print(f"Level: {state['num_disks']} disks")
print(f"Start Rod indices: {[i for i, r in enumerate(state['rods']) if r]}")
print(f"Target Rod: {state['target_rod']}")
print(f"Initial rods: {state['rods']}")

solution = state['solution']
print(f"Solution length: {len(solution)}")

# Verify the solution
rods = [list(r) for r in state['rods']]

for i, move in enumerate(solution):
    f, t = move['from'], move['to']
    if not rods[f]:
        print(f"ERROR at step {i}: Source rod {f} is empty")
        break
    disk = rods[f].pop()
    if rods[t] and rods[t][-1] < disk:
        print(f"ERROR at step {i}: Invalid move {disk} onto {rods[t][-1]} (from {f} to {t})")
        break
    rods[t].append(disk)

# Check if solved
target_rod_index = state['target_rod']
if len(rods[target_rod_index]) == state['num_disks']:
    print("Verification: Solved successfully via steps")
else:
    print("Verification: FAILED to solve via steps")
    print("Final rods:", rods)
