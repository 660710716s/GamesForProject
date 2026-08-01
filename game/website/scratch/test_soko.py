import sys
import os

# add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

from puzzle_generator import get_sokoban_initial_state

def check_overlap(state):
    player = tuple(state['player'])
    boxes = [tuple(b) for b in state['boxes']]
    
    if player in boxes:
        return True, f"Player at {player} overlaps with box"
    
    if len(set(boxes)) < len(boxes):
        return True, "Boxes overlap with each other"
        
    return False, ""

for i in range(5):
    state = get_sokoban_initial_state(1)
    overlap, msg = check_overlap(state)
    
    # Check if boxes are still on targets
    layout = state['layout']
    boxes_on_targets = 0
    for br, bc in state['boxes']:
        if layout[br][bc] == 2:
            boxes_on_targets += 1
            
    print(f"Level {i}: Overlap={overlap} ({msg}), Boxes on targets={boxes_on_targets}/{len(state['boxes'])}")
    if overlap:
        print("  PLAYER:", state['player'])
        print("  BOXES :", state['boxes'])
