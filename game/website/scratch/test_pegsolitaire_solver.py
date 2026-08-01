import collections

def solve_pegsolitaire(board, limit=50000):
    valid_coords = []
    for r in range(7):
        for c in range(7):
            if not ((r < 2 or r > 4) and (c < 2 or c > 4)):
                valid_coords.append((r, c))
    
    coord_to_bit = {coord: i for i, coord in enumerate(valid_coords)}
    bit_to_coord = {i: coord for i, coord in enumerate(valid_coords)}
    
    jumps = []
    for r, c in valid_coords:
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            mr, mc = r + dr, c + dc
            tr, tc = r + 2*dr, c + 2*dc
            if (mr, mc) in coord_to_bit and (tr, tc) in coord_to_bit:
                jumps.append((coord_to_bit[(r, c)], coord_to_bit[(mr, mc)], coord_to_bit[(tr, tc)]))

    initial_mask = 0
    for r, c in valid_coords:
        if board[r][c] == 1:
            initial_mask |= (1 << coord_to_bit[(r, c)])

    def is_solved(mask):
        return bin(mask).count('1') == 1

    if is_solved(initial_mask):
        return []

    queue = collections.deque([(initial_mask, [])])
    visited = {initial_mask}
    
    states_processed = 0
    while queue and states_processed < limit:
        states_processed += 1
        mask, path = queue.popleft()
        
        for i, j, k in jumps:
            if (mask & (1 << i)) and (mask & (1 << j)) and not (mask & (1 << k)):
                new_mask = mask ^ (1 << i) ^ (1 << j) ^ (1 << k)
                if new_mask not in visited:
                    move = {
                        "from": list(bit_to_coord[i]),
                        "jumped": list(bit_to_coord[j]),
                        "to": list(bit_to_coord[k])
                    }
                    new_path = path + [move]
                    if is_solved(new_mask):
                        return new_path
                    visited.add(new_mask)
                    queue.append((new_mask, new_path))
    return None

if __name__ == "__main__":
    # Create an empty board
    board = [[-1 if ((r < 2 or r > 4) and (c < 2 or c > 4)) else 0 for c in range(7)] for r in range(7)]
    # Set up a 2-peg situation that solves in 1 jump
    board[5][3] = 1
    board[4][3] = 1
    board[3][3] = 0
    
    sol = solve_pegsolitaire(board)
    print("Solution found:", sol)
