import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

from puzzle_generator import get_hanoi_initial_state

overlaps = 0
for i in range(100):
    state = get_hanoi_initial_state(1)
    start_rod = -1
    for idx, rod in enumerate(state['rods']):
        if rod:
            start_rod = idx
            break
    
    if start_rod == state['target_rod']:
        overlaps += 1
        print(f"Overlap found at iteration {i}: start={start_rod}, target={state['target_rod']}")

print(f"Total overlaps in 100 trials: {overlaps}")
