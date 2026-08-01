import heapq

def solve_sokoban(layout, boxes, player, limit=30000):
    size = len(layout)
    targets = []
    for r in range(size):
        for c in range(size):
            if layout[r][c] == 2:
                targets.append((r, c))
    
    # State: (player_pos, boxes_tuple)
    start_boxes = tuple(sorted(tuple(b) for b in boxes))
    start_player = tuple(player)
    
    def is_solved(box_state):
        return all(layout[r][c] == 2 for r, c in box_state)

    def get_heuristic(box_state):
        # Manhattan distance to nearest target for each box
        h = 0
        used_targets = set()
        for br, bc in box_state:
            # Simple heuristic: dist to closest target
            # Note: This could be better by using Hungarian algorithm for min-weight matching
            min_d = float('inf')
            for tr, tc in targets:
                d = abs(br - tr) + abs(bc - tc)
                if d < min_d:
                    min_d = d
            h += min_d
        return h

    def is_deadlock(br, bc):
        if layout[br][bc] == 2: return False
        # Corner deadlock
        up = layout[br-1][bc] == 1
        down = layout[br+1][bc] == 1
        left = layout[br][bc-1] == 1
        right = layout[br][bc+1] == 1
        if (up or down) and (left or right):
            return True
        return False

    # (priority, cost, player_pos, boxes, path)
    pq = [(get_heuristic(start_boxes), 0, start_player, start_boxes, [])]
    visited = {(start_player, start_boxes)}
    
    states_processed = 0
    while pq and states_processed < limit:
        states_processed += 1
        _, cost, (pr, pc), current_boxes, path = heapq.heappop(pq)
        
        if is_solved(current_boxes):
            return path
            
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr, nc = pr + dr, pc + dc
            
            # Bound check
            if nr < 0 or nr >= size or nc < 0 or nc >= size: continue
            if layout[nr][nc] == 1: continue # Wall
            
            box_pos = (nr, nc)
            if box_pos in current_boxes:
                # Try push
                nbr, nbc = nr + dr, nc + dc
                if nbr < 0 or nbr >= size or nbc < 0 or nbc >= size: continue
                if layout[nbr][nbc] == 1: continue # Wall
                if (nbr, nbc) in current_boxes: continue # Another box
                
                # Check deadlock
                if is_deadlock(nbr, nbc): continue
                
                new_boxes = sorted(list(current_boxes))
                idx = new_boxes.index(box_pos)
                new_boxes[idx] = (nbr, nbc)
                new_boxes = tuple(new_boxes)
                new_state = ((nr, nc), new_boxes)
                
                if new_state not in visited:
                    visited.add(new_state)
                    new_path = path + [{"dir": [dr, dc]}]
                    heapq.heappush(pq, (cost + 1 + get_heuristic(new_boxes), cost + 1, (nr, nc), new_boxes, new_path))
            else:
                # Walk
                new_state = ((nr, nc), current_boxes)
                if new_state not in visited:
                    visited.add(new_state)
                    new_path = path + [{"dir": [dr, dc]}]
                    heapq.heappush(pq, (cost + 1 + get_heuristic(current_boxes), cost + 1, (nr, nc), current_boxes, new_path))
                    
    return None

if __name__ == "__main__":
    # Test simple board
    layout = [
        [1, 1, 1, 1, 1],
        [1, 0, 2, 0, 1],
        [1, 0, 0, 1, 1],
        [1, 1, 1, 1, 1]
    ]
    boxes = [[2, 1]] # Invalid board for simple test, let's make a real one
    layout = [
        [1, 1, 1, 1, 1],
        [1, 0, 0, 2, 1],
        [1, 0, 0, 0, 1],
        [1, 1, 1, 1, 1]
    ]
    boxes = [[1, 1]]
    player = [2, 1]
    # Path: Move Up (1,1), Push Right (1,2), Push Right (1,3 - Target)
    
    sol = solve_sokoban(layout, boxes, player)
    print("Solution:", sol)
    # Target is (1,3). Box at (1,1). Player at (2,1).
    # Step 1: Up to (1,1) -> FAILS because box is there.
    # Ah, if box is at (1,1) and player at (2,1), player moves Up and pushes box to (0,1)? No, (0,1) is wall.
    # Correct sequence for this board:
    # Player starts (2,1). Targets (1,3).
    # Move Right to (2,2)
    # Move Right to (2,3)
    # Move Up to (1,3)? No, target is there.
    
    # Let's try layout:
    # # # # #
    # # . @ #  (.=target, @=player)
    # # $   #  ($=box)
    # # # # #
    layout = [
        [1,1,1,1,1],
        [1,2,0,0,1],
        [1,0,0,0,1],
        [1,1,1,1,1]
    ]
    boxes = [[2,1]]
    player = [1,2]
    # Sol: Move Down (2,2), Move Left (2,1) -> Pushes box to (2,0)? No, Wall.
    # Sol: Move Down (2,2), Move Left (2,1) NO. 
    # Player (1,2). Box (2,1). Target (1,1).
    # path: Move Left (1,1), Move Down (2,1) -> Pushes box to (3,1)? No wall.
    # Wait, my board setup is bad.
    
    # Real valid setup:
    # 1 1 1 1 1
    # 1 2 0 0 1
    # 1 1 1 1 1
    # Box at (1,2), Player at (1,3). Push Left.
    layout = [[1,1,1,1,1],[1,2,0,0,1],[1,1,1,1,1]]
    boxes = [[1,2]]
    player = [1,3]
    sol = solve_sokoban(layout, boxes, player)
    print("Solution:", sol)
