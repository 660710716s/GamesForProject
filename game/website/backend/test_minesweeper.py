import sys, os, random
sys.path.append(r'C:/Users/thesh/Documents/website/backend')
from puzzle_generator import get_minesweeper_initial_state
for lvl in range(1, 13):
    s = get_minesweeper_initial_state(lvl)
    print(f"Level {lvl}: {s['width']}x{s['height']}, mines={len(s['mine_locations'])}, min_moves={s['min_moves_required']}")
