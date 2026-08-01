import sys
import os
import time

sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

from puzzle_generator import get_sokoban_initial_state, solve_sokoban

# Generate complex state
print("Generating level 8...")
state = get_sokoban_initial_state(8)
print(f"Boxes: {len(state['boxes'])}, Grid Size: {state['size']}, Solved path length: {len(state['solution'])}")

start_time = time.time()
print("Solving with current solve_sokoban (BFS)...")
path = solve_sokoban(state['layout'], state['player'], state['boxes'], limit=100000)
end_time = time.time()

if path is None:
    print(f"FAILED TO SOLVE in {end_time - start_time:.2f}s (Limit reached)")
else:
    print(f"Solved BFS! Length: {len(path)} in {end_time - start_time:.2f}s")

# Let's define A* inline
def solve_sokoban_astar(layout, player, boxes, limit=100000):
    size = len(layout)
    start_state = (player[0], player[1], tuple(sorted([tuple(b) for b in boxes])))

    targets = []
    for r in range(size):
        for c in range(size):
            if layout[r][c] == 2:
                targets.append((r, c))

    def is_solved(state_boxes):
        for br, bc in state_boxes:
            if layout[br][bc] != 2:
                return False
        return True

    if is_solved(start_state[2]):
        return []

    def get_heuristic(state_boxes):
        dist = 0
        for br, bc in state_boxes:
            min_d = 9999
            for tr, tc in targets:
                d = abs(br - tr) + abs(bc - tc)
                if d < min_d:
                    min_d = d
            dist += min_d
        return dist

    import heapq
    counter = 0
    h_start = get_heuristic(start_state[2])
    queue = [(h_start, 0, counter, start_state, [])]
    visited = {start_state: 0}
    states_processed = 0

    while queue and states_processed < limit:
        states_processed += 1
        f, g, _, state, path = heapq.heappop(queue)
        pr, pc, current_boxes = state

        if is_solved(current_boxes):
            return path

        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr, nc = pr + dr, pc + dc
            if layout[nr][nc] == 1:
                continue

            new_boxes = list(current_boxes)
            if (nr, nc) in current_boxes:
                nbr, nbc = nr + dr, nc + dc
                if layout[nbr][nbc] == 1 or (nbr, nbc) in current_boxes:
                    continue
                idx = new_boxes.index((nr, nc))
                new_boxes[idx] = (nbr, nbc)

            new_boxes_tuple = tuple(sorted(new_boxes))
            new_state = (nr, nc, new_boxes_tuple)
            new_g = g + 1

            if new_state not in visited or new_g < visited[new_state]:
                deadlocked = False
                for br, bc in new_boxes_tuple:
                    if layout[br][bc] != 2:
                        is_wall_u = layout[br-1][bc] == 1
                        is_wall_d = layout[br+1][bc] == 1
                        is_wall_l = layout[br][bc-1] == 1
                        is_wall_r = layout[br][bc+1] == 1
                        if (is_wall_u or is_wall_d) and (is_wall_l or is_wall_r):
                            deadlocked = True
                            break
                
                if deadlocked:
                    continue

                visited[new_state] = new_g
                counter += 1
                new_h = get_heuristic(new_boxes_tuple)
                heapq.heappush(queue, (new_g + new_h, new_g, counter, new_state, path + [{"dir": [dr, dc]}]))

    return None

start_time = time.time()
print("Solving with A*...")
path_astar = solve_sokoban_astar(state['layout'], state['player'], state['boxes'], limit=100000)
end_time = time.time()

if path_astar is None:
    print(f"FAILED TO SOLVE A* in {end_time - start_time:.2f}s (Limit reached)")
else:
    print(f"Solved A*! Length: {len(path_astar)} in {end_time - start_time:.2f}s")
