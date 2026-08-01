import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

from puzzle_generator import get_hanoi_initial_state

overlaps = 0
trials = 1000
for i in range(trials):
    state = get_hanoi_initial_state(1)
    # The new code prints logs, so we'll see them in console
    start_rod = -1
    for idx, rod in enumerate(state['rods']):
        if rod:
            start_rod = idx
            break
    
    if start_rod == state['target_rod']:
        overlaps += 1

print(f"Final Report: {overlaps} overlaps in {trials} trials.")
if overlaps == 0:
    print("STATUS: VERIFIED SECURE")
else:
    print("STATUS: VULNERABLE")
