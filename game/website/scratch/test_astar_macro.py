import sys
import os
import time

sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

from puzzle_generator import get_sokoban_initial_state

def solve_sokoban_macro(layout, player, boxes, limit=50000):
    size = len(layout)
    import heapq

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

    def get_reachable_and_canonical(pr, pc, boxes_set):
        reachable = set()
        queue = [(pr, pc)]
        visited = {(pr, pc)}
        min_r, min_c = pr, pc
        
        while queue:
            r, c = queue.pop(0)
            reachable.add((r, c))
            if r < min_r or (r == min_r and c < min_c):
                min_r, min_c = r, c
                
            for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nr, nc = r + dr, c + dc
                if layout[nr][nc] != 1 and (nr, nc) not in boxes_set:
                    if (nr, nc) not in visited:
                        visited.add((nr, nc))
                        queue.append((nr, nc))
        return (min_r, min_c), reachable

    start_boxes_tuple = tuple(sorted([tuple(b) for b in boxes]))
    
    if is_solved(start_boxes_tuple):
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
        return dist * 2 

    initial_canonical, _ = get_reachable_and_canonical(player[0], player[1], set(start_boxes_tuple))
    start_state = (initial_canonical[0], initial_canonical[1], start_boxes_tuple)
    
    # Store the actual player pos that got us to this macro state so we can reconstruct
    # Since we want a sequence of moves, we can just return the first step!
    # Wait, if we return the first step, we don't need the whole path. We just need the first Push.
    # Actually, we can store `path` as list of raw moves? No, macro path is pushes.
    
    # Queue: (f, g, counter, state, player_pos, path_of_pushes)
    # path_of_pushes: list of (player context before push, direction of push)
    # Example: [((pr, pc), [dr, dc]), ...] -> wait, if player is at (rp, cp) and pushes box in (dr, dc).
    
    queue = [(get_heuristic(start_boxes_tuple), 0, 0, start_state, (player[0], player[1]), [])]
    visited = {start_state: 0}
    states_processed = 0
    counter = 0

    while queue and states_processed < limit:
        states_processed += 1
        f, g, _, state, actual_pr_pc, path = heapq.heappop(queue)
        cpr, cpc, current_boxes = state
        
        boxes_set = set(current_boxes)
        _, reachable = get_reachable_and_canonical(actual_pr_pc[0], actual_pr_pc[1], boxes_set)
        
        # Look for possible pushes
        for br, bc in current_boxes:
            for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                # To push box in dir (dr, dc), player must be at (br - dr, bc - dc)
                push_r, push_c = br - dr, bc - dc
                if (push_r, push_c) in reachable:
                    # Space behind box must be empty
                    nbr, nbc = br + dr, bc + dc
                    if layout[nbr][nbc] != 1 and (nbr, nbc) not in boxes_set:
                        new_boxes = list(current_boxes)
                        new_boxes.remove((br, bc))
                        new_boxes.append((nbr, nbc))
                        new_boxes_tuple = tuple(sorted(new_boxes))
                        
                        # New player pos is where the box was
                        new_pr, new_pc = br, bc 
                        new_cpr, new_cpc = get_reachable_and_canonical(new_pr, new_pc, set(new_boxes_tuple))[0]
                        new_state = (new_cpr, new_cpc, new_boxes_tuple)
                        new_g = g + 1
                        
                        if new_state not in visited or new_g < visited[new_state]:
                            # Deadlock detect
                            deadlocked = False
                            for xbr, xbc in new_boxes_tuple:
                                if layout[xbr][xbc] != 2:
                                    wu = layout[xbr-1][xbc] == 1
                                    wd = layout[xbr+1][xbc] == 1
                                    wl = layout[xbr][xbc-1] == 1
                                    wr = layout[xbr][xbc+1] == 1
                                    if (wu or wd) and (wl or wr):
                                        deadlocked = True
                                        break
                            if deadlocked: continue
                            
                            visited[new_state] = new_g
                            counter += 1
                            h = get_heuristic(new_boxes_tuple)
                            new_path = path + [((push_r, push_c), (br, bc), (dr, dc))]
                            
                            if is_solved(new_boxes_tuple):
                                # Return the first step!
                                return resolve_first_step(player[0], player[1], set(start_boxes_tuple), new_path, layout)
                            
                            heapq.heappush(queue, (new_g + h, new_g, counter, new_state, (new_pr, new_pc), new_path))
                            
    return None

def resolve_first_step(start_r, start_c, boxes_set, macro_path, layout):
    if not macro_path: return []
    # We must route player from (start_r, start_c) to macro_path[0][0] (the push_r, push_c)
    target_r, target_c = macro_path[0][0]
    push_dr, push_dc = macro_path[0][2]
    
    if start_r == target_r and start_c == target_c:
        # Player is already at the push position! Just push.
        return [{"dir": [push_dr, push_dc]}]
        
    # BFS for player route
    q = [[(start_r, start_c)]]
    visited = {(start_r, start_c)}
    while q:
        p = q.pop(0)
        r, c = p[-1]
        if r == target_r and c == target_c:
            # We found path to push pos. 
            # First step is p[1], direction is p[1] minus p[0]
            nr, nc = p[1]
            return [{"dir": [nr - start_r, nc - start_c]}]
            
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr, nc = r + dr, c + dc
            if layout[nr][nc] != 1 and (nr, nc) not in boxes_set:
                if (nr, nc) not in visited:
                    visited.add((nr, nc))
                    q.append(p + [(nr, nc)])
                    
    return None

print("Generating complex level...")
state = get_sokoban_initial_state(8)
print("Solving with Macro A*...")
start_time = time.time()
path = solve_sokoban_macro(state['layout'], state['player'], state['boxes'], limit=50000)
end_time = time.time()
print(f"Result: {path} in {end_time - start_time:.4f}s")
