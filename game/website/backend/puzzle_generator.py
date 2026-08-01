import random
import heapq
from collections import deque

def get_hanoi_initial_state(level: int):
    # ระดับ 1 = 3 ห่วง, ระดับสูงขึ้นจำนวนห่วงจะเพิ่มขึ้น (จำกัดสูงสุด 8 ห่วง)
    # Easy mode for level 1: use only 2 disks
    if level == 1:
        num_disks = 2
    else:
        num_disks = min(max(3, level + 1), 8)
    
    # Select different rods for start and target
    start_rod, target_rod = random.sample([0, 1, 2], 2)
    
    # Paranoid fail-safe: Ensure they are distinct
    while start_rod == target_rod:
        start_rod, target_rod = random.sample([0, 1, 2], 2)
        
    aux_rod = 3 - start_rod - target_rod
    
    # Server-side audit log
    print(f"[Hanoi Gen] Level {level}: Start={start_rod}, Target={target_rod}, Aux={aux_rod}")
    
    rods = [[], [], []]
    rods[start_rod] = list(range(num_disks, 0, -1))
    
    # Recursive solver to generate the "Method" for admin
    def gen_hanoi_solution(n, src, dst, aux):
        if n == 1: return [{"from": src, "to": dst}]
        return gen_hanoi_solution(n-1, src, aux, dst) + \
               [{"from": src, "to": dst}] + \
               gen_hanoi_solution(n-1, aux, dst, src)
               
    solution = gen_hanoi_solution(num_disks, start_rod, target_rod, aux_rod)
            
    return {
        "game_type": "hanoi",
        "num_disks": num_disks,
        "rods": rods,
        "target_rod": int(target_rod),
        "solution": solution,
        "min_moves_required": (2 ** num_disks) - 1
    }

def calculate_hanoi_similarity(current_rods: list[list[int]], target_rod_index: int, num_disks: int) -> float:
    # ... previous logic ...
    target_rod = current_rods[target_rod_index]
    score = 0.0
    expected_disk = num_disks # ฐานควรจะเป็นห่วงที่ใหญ่ที่สุด

    for disk in target_rod:
        if disk == expected_disk:
            score += disk 
            expected_disk -= 1
        else:
            break
            
    max_possible_score = (num_disks * (num_disks + 1)) / 2
    return round(score / max_possible_score, 4) if max_possible_score > 0 else 0.0

def solve_hanoi(rods, target_rod):
    """
    Finds the next optimal move from any legal Tower of Hanoi state.
    """
    num_disks = 0
    disk_pos = {} 
    for i, rod in enumerate(rods):
        for disk in rod:
            disk_pos[disk] = i
            num_disks = max(num_disks, disk)
            
    if num_disks == 0: return None
    
    def get_move(n, target):
        curr = disk_pos.get(n)
        if curr is None: return None
        if curr == target:
            if n == 1: return None
            return get_move(n-1, target)
        else:
            aux = 3 - curr - target
            if n == 1:
                return {"from": curr, "to": target, "dir": [0,0]} # dir added for API consistency
            move = get_move(n-1, aux)
            if move: return move
            return {"from": curr, "to": target, "dir": [0,0]}
            
    move = get_move(num_disks, target_rod)
    return [move] if move else []

# ตัวอย่างการทดสอบฟังก์ชัน
if __name__ == "__main__":
    # Test Level 1
    state = get_hanoi_initial_state(1)
    print("Initial State (Level 1):", state)
    
    # สมมติผู้เล่นย้ายห่วงใหญ่สุดและรองใหญ่สุดไปเสา 3 แล้ว
    test_rods = [[1], [], [3, 2]]
    sim_score = calculate_hanoi_similarity(test_rods, state["target_rod"], state["num_disks"])
    print(f"Similarity Score ของ [3, 2] บนเสา 3: {sim_score*100}%")
def solve_watersort(start_tubes, tube_capacity, limit=50000):
    """
    BFS algorithm to find the shortest path to solve the Water Sort Puzzle.
    """
    def is_solved(state):
        for tube in state:
            if not tube: continue
            if len(tube) != tube_capacity: return False
            if len(set(tube)) > 1: return False
        return True

    def get_moves(state):
        moves = []
        for i, src in enumerate(state):
            if not src: continue
            color = src[-1]
            
            # Optimization: only move blocks of same color
            count = 0
            for k in range(len(src)-1, -1, -1):
                if src[k] == color: count += 1
                else: break
            
            for j, dst in enumerate(state):
                if i == j: continue
                # Can pour if dst is empty OR top color matches AND has space
                if len(dst) < tube_capacity and (not dst or dst[-1] == color):
                    # We only pour if it makes sense:
                    # Don't move a color from a tube that's already pure to another empty tube
                    if not dst and len(set(src)) == 1: continue
                    
                    space = tube_capacity - len(dst)
                    amt = min(count, space)
                    moves.append((i, j, amt))
        return moves

    start_state = tuple(tuple(t) for t in start_tubes)
    if is_solved(start_state): return []

    queue = deque([(start_state, [])])
    # Symmetry Breaking: Sort tubes (excluding empty ones) to canonicalize state for 'visited'
    def get_canonical(s):
        return tuple(sorted(s))

    visited = {get_canonical(start_state)}
    
    states_processed = 0

    while queue and states_processed < limit:
        states_processed += 1
        state, path = queue.popleft()
        
        for i, j, amt in get_moves(state):
            # Apply move
            new_state_list = [list(t) for t in state]
            color = new_state_list[i][-1]
            for _ in range(amt):
                new_state_list[i].pop()
                new_state_list[j].append(color)
            
            new_state = tuple(tuple(t) for t in new_state_list)
            canonical = get_canonical(new_state)
            
            if canonical not in visited:
                new_path = path + [{"from": i, "to": j}]
                if is_solved(new_state):
                    return new_path
                visited.add(canonical)
                queue.append((new_state, new_path))
                
    return [] # Return empty if no optimal solution found within limit

def get_watersort_initial_state(level: int):
    # Solvable-guaranteed Water Sort generator
    # Easy mode for level 1: only 2 colors and fewer scramble steps
    if level == 1:
        num_colors = 2
    else:
        num_colors = min(max(2, level + 1), 7)
    tube_capacity = 4
    num_tubes = num_colors + 2
    
    # Start with solved state
    tubes = [[c] * tube_capacity for c in range(1, num_colors + 1)]
    for _ in range(2): tubes.append([])
    
    # Perform random legal reverse pours to scramble
    # A reverse pour: take some of the same color from top of tube i, 
    # move to tube j if j has space AND (is empty OR has same color on top)
    # Easy mode for level 1: reduce scramble steps
    if level == 1:
        scramble_steps = 15
    else:
        scramble_steps = 30 + (level * 15)
    history = []
    
    for _ in range(scramble_steps):
        possible = []
        for i in range(num_tubes):
            if not tubes[i]: continue
            color = tubes[i][-1]
            # Count blocks of same color on top
            count = 0
            for k in range(len(tubes[i])-1, -1, -1):
                if tubes[i][k] == color: count += 1
                else: break
            
            for j in range(num_tubes):
                if i == j: continue
                # Reverse pour requirement: we want to put 'color' onto 'j'.
                # To perfectly invert a valid forward pour (which moves an entire color block),
                # 'j' must NOT already have 'color' on top in the current scrambled state.
                if len(tubes[j]) < tube_capacity and (not tubes[j] or tubes[j][-1] != color):
                    space = tube_capacity - len(tubes[j])
                    max_transfer = min(count, space)
                    # We can transfer any amount from 1 to max_transfer, breaking the block!
                    for amt in range(1, max_transfer + 1):
                        possible.append((i, j, amt))
        
        if possible:
            i, j, amt = random.choice(possible)
            color = tubes[i][-1]
            for _ in range(amt):
                tubes[i].pop()
                tubes[j].append(color)
            # Solution move is from j back to i
            history.append({"from": j, "to": i})
            
    # 3. Use BFS to find the OPTIMAL shortest path for the generated tubes
    optimal_solution = solve_watersort(tubes, tube_capacity)
    
    return {
        "game_type": "water_sort",
        "num_tubes": num_tubes,
        "tube_capacity": tube_capacity,
        "tubes": tubes,
        "num_colors": num_colors,
        "solution": optimal_solution,
        "min_moves_required": len(optimal_solution)
    }

def calculate_watersort_similarity(current_tubes: list[list[int]], tube_capacity: int) -> float:
    # A tube is "sorted" if it's empty or contains `tube_capacity` of the SAME color.
    # We can give points for each color block that is sorted from bottom to up.
    score = 0.0
    total_elements = 0
    
    for tube in current_tubes:
        total_elements += len(tube)
        if len(tube) == 0:
            continue
            
        base_color = tube[0]
        # Count consecutive matching colors from the bottom
        for color in tube:
            if color == base_color:
                score += 1
            else:
                break
                
    # max possible score = total number of liquid units
    return round(score / total_elements, 4) if total_elements > 0 else 0.0

# --- Sudoku Generator ---
def get_sudoku_initial_state(level: int):
    base = 3
    side = base * base
    def pattern(r, c): return (base * (r % base) + r // base + c) % side
    def shuffle(s): return random.sample(s, len(s))
    
    rBase = list(range(base))
    # Randomize the base layout groups
    rows = [g * base + r for g in shuffle(rBase) for r in shuffle(rBase)]
    cols = [g * base + c for g in shuffle(rBase) for c in shuffle(rBase)]
    # Randomize the digit mapping
    nums = shuffle(list(range(1, side + 1)))
    
    board = [[nums[pattern(r, c)] for c in cols] for r in rows]
    
    # Remove cells based on difficulty level (more aggressive with level)
    squares = side * side
    # Easy mode for level 1: player must fill only 4 cells (i.e., 4 empties)
    if level == 1:
        empties = 4
    else:
        empties = min(25 + (level * 4), 62)
    
    puzzle = [[board[r][c] for c in range(side)] for r in range(side)]
    
    for p in random.sample(range(squares), empties):
        puzzle[p // side][p % side] = 0
        
    return {
        "game_type": "sudoku",
        "grid": puzzle,
        "solution": board,
        "min_moves_required": empties
    }

# --- Minesweeper Generator ---
def get_minesweeper_initial_state(level: int):
    # Level 1: very small board with 1-2 mines, clustered
    if level == 1:
        width = height = 5
        density = 0.04  # roughly 1 mine
        num_mines = max(1, int(width * height * density))
        # clustered placement: start from a seed and expand
        seed = random.choice([(r, c) for r in range(height) for c in range(width)])
        mines = {seed}
        while len(mines) < num_mines:
            r, c = random.choice(list(mines))
            neighbors = [(nr, nc) for nr in range(r-1, r+2) for nc in range(c-1, c+2)
                         if 0 <= nr < height and 0 <= nc < width and (nr, nc) not in mines]
            if not neighbors:
                neighbors = [(nr, nc) for nr in range(height) for nc in range(width) if (nr, nc) not in mines]
            mines.add(random.choice(neighbors))
        mine_locations = list(mines)
    # Level 2: slightly larger board with a few more mines, still low density
    elif level == 2:
        width = height = 6
        density = 0.07  # ~2-3 mines
        num_mines = max(2, int(width * height * density))
        seed = random.choice([(r, c) for r in range(height) for c in range(width)])
        mines = {seed}
        while len(mines) < num_mines:
            r, c = random.choice(list(mines))
            neighbors = [(nr, nc) for nr in range(r-1, r+2) for nc in range(c-1, c+2)
                         if 0 <= nr < height and 0 <= nc < width and (nr, nc) not in mines]
            if not neighbors:
                neighbors = [(nr, nc) for nr in range(height) for nc in range(width) if (nr, nc) not in mines]
            mines.add(random.choice(neighbors))
        mine_locations = list(mines)
    else:
        # Smooth scaling for levels > 2
        # Board size grows linearly but caps at 20x20
        width = height = min(5 + level, 20)
        # Mine density starts low and increases, capped at 0.25 (25%)
        density = min(0.04 + level * 0.02, 0.25)
        num_mines = int(width * height * density)
        cells = [(r, c) for r in range(height) for c in range(width)]
        mine_locations = random.sample(cells, num_mines)

    # Create empty board
    board = [[0 for _ in range(width)] for _ in range(height)]
    # Place mines (-1)
    for r, c in mine_locations:
        board[r][c] = -1

    # Calculate adjacent numbers for each cell
    for r, c in mine_locations:
        for dr in (-1, 0, 1):
            for dc in (-1, 0, 1):
                if dr == 0 and dc == 0:
                    continue
                nr, nc = r + dr, c + dc
                if 0 <= nr < height and 0 <= nc < width and board[nr][nc] != -1:
                    board[nr][nc] += 1

    # Estimate minimum moves
    if level <= 2:
        min_moves = len(mine_locations)
    else:
        safe_cells = width * height - len(mine_locations)
        min_moves = int(safe_cells * 0.3)

    return {
        "game_type": "minesweeper",
        "width": width,
        "height": height,
        "mine_locations": mine_locations,
        "board": board,
        "min_moves_required": min_moves,
    }

# --- 15-Puzzle (Sliding Puzzle) Solver & Generator ---

def solve_sliding_puzzle(start_board, size, limit=None):
    """
    A* search algorithm to find the optimal path to the solved state for the Sliding Puzzle.
    Heuristic: Manhattan Distance.
    """
    target = tuple(range(1, size * size)) + (0,)
    
    def get_manhattan_dist(flat_state):
        dist = 0
        for i, val in enumerate(flat_state):
            if val != 0:
                # Target pos for val in row-major
                target_idx = val - 1
                tr, tc = divmod(target_idx, size)
                cr, cc = divmod(i, size)
                dist += abs(tr - cr) + abs(tc - cc)
        return dist

    start_flat = tuple(x for row in start_board for x in row)
    # heap stores: (f_score, g_score, current_state, path)
    # g_score is depth (moves taken)
    # f_score is g + heuristic
    queue = [(get_manhattan_dist(start_flat), 0, start_flat, [])]
    visited = {start_flat: 0}
    
    # Safety limit to prevent infinite loops or excessive computation
    search_limit = limit if limit else (5000 if size == 3 else 20000)
    nodes_processed = 0

    while queue and nodes_processed < search_limit:
        nodes_processed += 1
        f, g, state, path = heapq.heappop(queue)
        
        if state == target:
            return path
            
        # find empty space (0)
        idx = state.index(0)
        r, c = divmod(idx, size)
        
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr, nc = r + dr, c + dc
            if 0 <= nr < size and 0 <= nc < size:
                n_idx = nr * size + nc
                # Swap 0 with neighbor
                new_state = list(state)
                new_state[idx], new_state[n_idx] = new_state[n_idx], new_state[idx]
                new_state = tuple(new_state)
                
                new_g = g + 1
                if new_state not in visited or new_g < visited[new_state]:
                    visited[new_state] = new_g
                    new_f = new_g + get_manhattan_dist(new_state)
                    # For solution reporting, we want to report the 'click' coord.
                    # Clicking nr, nc moves that tile into empty spot r, c.
                    new_path = path + [{"r": nr, "c": nc}]
                    heapq.heappush(queue, (new_f, new_g, new_state, new_path))
                    
    return path # Fallback to whatever path we found if timed out (unlikely for size 3/4)

def get_sliding_initial_state(level: int):
    # Depending on level: level 1 = 3x3, level > 2 = 4x4
    # Easy mode for level 1: 3×3 board with fewer shuffles
    if level == 1:
        size = 3
        shuffle_moves = 5
    else:
        size = 3 if level <= 2 else 4
        shuffle_moves = 10 + (level * 10)
    
    # Create solved board
    board = [[r * size + c + 1 for c in range(size)] for r in range(size)]
    board[size-1][size-1] = 0 # 0 is the empty tile
    empty_r, empty_c = size - 1, size - 1
    
    for _ in range(shuffle_moves):
        # find valid neighbors
        neighbors = []
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr, nc = empty_r + dr, empty_c + dc
            if 0 <= nr < size and 0 <= nc < size:
                neighbors.append((nr, nc))
        
        # Pick random neighbor to slide into empty spot
        nr, nc = random.choice(neighbors)
        board[empty_r][empty_c], board[nr][nc] = board[nr][nc], board[empty_r][empty_c]
        empty_r, empty_c = nr, nc
        
    # 3. Use A* to find the OPTIMAL shortest path for the generated board
    optimal_solution = solve_sliding_puzzle(board, size)
    
    return {
        "game_type": "sliding",
        "size": size,
        "board": board,
        "solved_state": [i for i in range(1, size*size)] + [0], # flat
        "solution": optimal_solution,
        "min_moves_required": len(optimal_solution)
    }

def solve_rushhour(initial_vehicles, grid_size, exit_y, limit=50000):
    """
    BFS algorithm to find the shortest path to solve the Rush Hour Puzzle.
    """
    def is_solved(state):
        # State is tuple of (v.x, v.y)
        # Red car is always index 0
        red_x, red_y = state[0]
        # Red car front reaches col 6 (grid_size)
        # red_car.w is 2
        return red_x + 2 == grid_size

    def get_moves(state, vehicles_info):
        moves = []
        # Occupancy map
        occ = [[None for _ in range(grid_size)] for _ in range(grid_size)]
        for idx, (vx, vy) in enumerate(state):
            v = vehicles_info[idx]
            for r in range(vy, vy + v['h']):
                for c in range(vx, vx + v['w']):
                    if 0 <= r < grid_size and 0 <= c < grid_size:
                        occ[r][c] = idx
        
        for idx, (vx, vy) in enumerate(state):
            v = vehicles_info[idx]
            is_horiz = v['w'] > v['h']
            
            if is_horiz:
                # Try left
                nx = vx - 1
                while nx >= 0 and occ[vy][nx] is None:
                    moves.append((idx, nx, vy))
                    nx -= 1
                # Try right
                nx = vx + v['w']
                while nx < grid_size and occ[vy][nx] is None:
                    moves.append((idx, nx - v['w'] + 1, vy))
                    nx += 1
            else:
                # Try up
                ny = vy - 1
                while ny >= 0 and occ[ny][vx] is None:
                    moves.append((idx, vx, ny))
                    ny -= 1
                # Try down
                ny = vy + v['h']
                while ny < grid_size and occ[ny][vx] is None:
                    moves.append((idx, vx, ny - v['h'] + 1))
                    ny += 1
        return moves

    # initial_vehicles is list of dicts
    v_info = [{"w": v["w"], "h": v["h"]} for v in initial_vehicles]
    start_state = tuple((v["x"], v["y"]) for v in initial_vehicles)
    
    if is_solved(start_state): return []
    
    queue = deque([(start_state, [])])
    visited = {start_state}
    
    states_processed = 0
    
    while queue and states_processed < limit:
        states_processed += 1
        state, path = queue.popleft()
        
        for v_idx, nx, ny in get_moves(state, v_info):
            new_state_list = list(state)
            new_state_list[v_idx] = (nx, ny)
            new_state = tuple(new_state_list)
            
            if new_state not in visited:
                new_path = path + [{"v_idx": v_idx, "nx": nx, "ny": ny}]
                if is_solved(new_state):
                    return new_path
                visited.add(new_state)
                queue.append((new_state, new_path))
                
    return None

# --- Rush Hour Generator ---
def get_rushhour_initial_state(level: int):
    grid_size = 6
    exit_y = 2
    
    # We want at least `min_moves` steps for this level
    # Easy mode for level 1: require fewer moves and fewer obstacles
    if level == 1:
        min_moves = 2
    else:
        min_moves = min(3 + level, 20)
    best_vehicles = None
    best_solution = []
    
    for attempt in range(50):
        # Red car starts randomly far away
        red_start_x = random.choice([0, 1]) 
        vehicles = [
            {"id": "red", "x": red_start_x, "y": exit_y, "w": 2, "h": 1, "type": "player"}
        ]
        
        num_obstacles = min(5 + level, 12)
        cells_used = {(red_start_x, exit_y), (red_start_x+1, exit_y)}
        
        for _ in range(50):
            if len(vehicles) - 1 >= num_obstacles:
                break
            is_horiz = random.choice([True, False])
            size = random.choice([2, 3])
            
            x = random.randint(0, grid_size - (size if is_horiz else 1))
            y = random.randint(0, grid_size - (1 if is_horiz else size))
            
            overlap = False
            car_cells = set()
            for i in range(size):
                car_cells.add((x + (i if is_horiz else 0), y + (i if not is_horiz else 0)))
                
            if car_cells.intersection(cells_used):
                overlap = True
                
            if not overlap:
                vehicles.append({
                    "id": f"obs_{len(vehicles)}",
                    "x": x, "y": y,
                    "w": size if is_horiz else 1, "h": 1 if is_horiz else size,
                    "type": "obstacle"
                })
                cells_used.update(car_cells)
                
        # Fast solvable check cap at 2000 states to keep generation fast
        solution = solve_rushhour(vehicles, grid_size, exit_y, limit=2000)
        
        if solution is not None:
            if len(solution) > len(best_solution):
                best_solution = solution
                best_vehicles = vehicles
                
            if len(solution) >= min_moves:
                break
                
    if not best_vehicles:
        # Extreme fallback
        best_vehicles = vehicles
        best_solution = []
        
    return {
        "game_type": "rushhour",
        "grid_size": grid_size,
        "exit_y": exit_y,
        "vehicles": best_vehicles,
        "solution": best_solution,
        "min_moves_required": len(best_solution)
    }

def calculate_rushhour_similarity(current_vehicles: list[dict], grid_size: int, exit_y: int, initial_min_moves: int) -> float:
    # Use BFS solver to find distance from current state
    current_solution = solve_rushhour(current_vehicles, grid_size, exit_y)
    current_dist = len(current_solution)
    
    if initial_min_moves <= 0: return 1.0
    # similarity = 1 - (remaining_moves / total_moves)
    # Caps at 0.0 if user makes it much harder
    return max(0.0, round(1.0 - (current_dist / initial_min_moves), 4))
            
    # Reverse history for solution
    solution = history[::-1]
    
    # The player piece (cyan) is naturally pulled back deeply into the matrix by the scramble.
    return {
        "game_type": "rushhour",
        "grid_size": grid_size,
        "exit_y": exit_y,
        "vehicles": vehicles,
        "solution": solution,
        "min_moves_required": len(solution)
    }

def solve_pegsolitaire(board, limit=200000):
    """
    DFS algorithm to find a solution path for Peg Solitaire.
    DFS is massively faster than BFS because path depth is fixed.
    State is cached as a bitmask for performance.
    """
    import sys
    sys.setrecursionlimit(2000)

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

    visited = {initial_mask}
    states_processed = [0]
    
    def dfs(mask, path):
        states_processed[0] += 1
        if states_processed[0] > limit:
            return None
        
        if is_solved(mask):
            return path
            
        # Optional: heuristic to prioritize jumps that move towards center 
        # (increases chance of finding a path faster)
        # For simplicity, standard iteration often suffices for typical boards.
        
        for i, j, k in jumps:
            if (mask & (1 << i)) and (mask & (1 << j)) and not (mask & (1 << k)):
                new_mask = mask ^ (1 << i) ^ (1 << j) ^ (1 << k)
                if new_mask not in visited:
                    visited.add(new_mask)
                    move = {
                        "from": list(bit_to_coord[i]),
                        "jumped": list(bit_to_coord[j]),
                        "to": list(bit_to_coord[k])
                    }
                    path.append(move)
                    
                    res = dfs(new_mask, path)
                    if res is not None:
                        return res
                        
                    path.pop()
        return None

    return dfs(initial_mask, [])

# --- Peg Solitaire Generator ---
def get_pegsolitaire_initial_state(level: int):
    # Standard English Board: 7x7, with four 2x2 corners missing
    # 0 = empty hole, 1 = peg, -1 = invalid wall
    board = [[0 for _ in range(7)] for _ in range(7)]
    for r in range(7):
        for c in range(7):
            if (r < 2 or r > 4) and (c < 2 or c > 4):
                board[r][c] = -1
                
    # Start with a single peg at the center (Solved state)
    board[3][3] = 1
    
    # Procedural Reverse Jump: 
    # A reverse jump takes a peg, leaps it over an empty space to another empty space,
    # and "creates" a peg in the middle. (Increases total pegs by 1).
    # Easy mode for level 1: fewer reverse jumps
    if level == 1:
        num_jumps = 2
    else:
        num_jumps = min(5 + (level * 2), 30)
    history = []
    
    for _ in range(num_jumps):
        # find all possible reverse jumps
        valid_jumps = []
        for r in range(7):
            for c in range(7):
                if board[r][c] == 1:
                    for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                        mid_r, mid_c = r + dr, c + dc
                        dest_r, dest_c = r + 2*dr, c + 2*dc
                        
                        if (0 <= dest_r < 7 and 0 <= dest_c < 7 
                            and board[dest_r][dest_c] == 0 
                            and board[mid_r][mid_c] == 0):
                            valid_jumps.append((r, c, mid_r, mid_c, dest_r, dest_c))
                            
        if not valid_jumps:
            break
            
        # Execute random valid reverse jump
        r, c, mr, mc, dr, dc = random.choice(valid_jumps)
        board[r][c] = 0
        board[mr][mc] = 1
        board[dr][dc] = 1
        # The solving move is dr,dc -> r,c (jumping over mr,mc)
        history.append({"from": [dr, dc], "to": [r, c], "jumped": [mr, mc]})
    
    # Reverse history for solution
    solution = history[::-1]
    
    # Count pegs to estimate min moves
    peg_count = sum(1 for r in range(7) for c in range(7) if board[r][c] == 1)
    
    return {
        "game_type": "pegsolitaire",
        "board": board,
        "solution": solution,
        "min_moves_required": peg_count - 1 # Each jump removes 1 peg. Goal is 1 peg.
    }

# --- Sokoban Generator & Solver ---
def solve_sokoban(layout, player, boxes, limit=30000):
    size = len(layout)
    import heapq
    from collections import deque

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
        queue = deque([(pr, pc)])
        visited = {(pr, pc)}
        min_r, min_c = pr, pc
        
        while queue:
            r, c = queue.popleft()
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

    def resolve_first_step(start_r, start_c, boxes_set, macro_path):
        if not macro_path: return []
        target_r, target_c = macro_path[0][0]
        push_dr, push_dc = macro_path[0][1]
        
        if start_r == target_r and start_c == target_c:
            return [{"dir": [push_dr, push_dc]}]
            
        q = deque([[(start_r, start_c)]])
        visited = {(start_r, start_c)}
        while q:
            p = q.popleft()
            r, c = p[-1]
            if r == target_r and c == target_c:
                nr, nc = p[1]
                return [{"dir": [nr - start_r, nc - start_c]}]
                
            for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nr, nc = r + dr, c + dc
                if layout[nr][nc] != 1 and (nr, nc) not in boxes_set:
                    if (nr, nc) not in visited:
                        visited.add((nr, nc))
                        q.append(p + [(nr, nc)])
        return None

    initial_canonical, _ = get_reachable_and_canonical(player[0], player[1], set(start_boxes_tuple))
    start_state = (initial_canonical[0], initial_canonical[1], start_boxes_tuple)
    
    queue = [(get_heuristic(start_boxes_tuple), 0, 0, start_state, (player[0], player[1]), [])]
    visited_states = {start_state: 0}
    states_processed = 0
    counter = 0

    while queue and states_processed < limit:
        states_processed += 1
        f, g, _, state, actual_pr_pc, path = heapq.heappop(queue)
        cpr, cpc, current_boxes = state
        
        boxes_set = set(current_boxes)
        _, reachable = get_reachable_and_canonical(actual_pr_pc[0], actual_pr_pc[1], boxes_set)
        
        for br, bc in current_boxes:
            for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                push_r, push_c = br - dr, bc - dc
                if (push_r, push_c) in reachable:
                    nbr, nbc = br + dr, bc + dc
                    if layout[nbr][nbc] != 1 and (nbr, nbc) not in boxes_set:
                        new_boxes = list(current_boxes)
                        new_boxes.remove((br, bc))
                        new_boxes.append((nbr, nbc))
                        new_boxes_tuple = tuple(sorted(new_boxes))
                        
                        new_pr, new_pc = br, bc 
                        new_cpr, new_cpc = get_reachable_and_canonical(new_pr, new_pc, set(new_boxes_tuple))[0]
                        new_state = (new_cpr, new_cpc, new_boxes_tuple)
                        new_g = g + 1
                        
                        if new_state not in visited_states or new_g < visited_states[new_state]:
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
                                    if wu or wd:
                                        if (layout[xbr][xbc-1] == 1 and layout[xbr][xbc+1] == 1): deadlocked = True
                                    if wl or wr:
                                        if (layout[xbr-1][xbc] == 1 and layout[xbr+1][xbc] == 1): deadlocked = True
                            if deadlocked: continue
                            
                            visited_states[new_state] = new_g
                            counter += 1
                            h = get_heuristic(new_boxes_tuple)
                            new_path = path + [((push_r, push_c), (dr, dc))]
                            
                            if is_solved(new_boxes_tuple):
                                return resolve_first_step(player[0], player[1], set(start_boxes_tuple), new_path)
                            
                            heapq.heappush(queue, (new_g + h, new_g, counter, new_state, (new_pr, new_pc), new_path))
                            
    return None

def get_sokoban_initial_state(level: int):
    size = min(6 + level, 12)
    layout = [[0 for _ in range(size)] for _ in range(size)]
    
    for i in range(size):
        layout[0][i] = layout[size-1][i] = layout[i][0] = layout[i][size-1] = 1
        
    num_boxes = min(1 + (level // 2), 5)
    
    available_cells = [(r, c) for r in range(2, size-2) for c in range(2, size-2)]
    if len(available_cells) < num_boxes:
        available_cells = [(r, c) for r in range(1, size-1) for c in range(1, size-1)]
        
    import random
    target_locs = random.sample(available_cells, num_boxes)
    for (r, c) in target_locs:
        layout[r][c] = 2 
        
    boxes = list(target_locs)
    
    # Initialize player at a guaranteed empty floor cell (non-target)
    empty_cells = [c for c in available_cells if c not in target_locs]
    if empty_cells:
        player_r, player_c = random.choice(empty_cells)
    else:
        # Fallback if the room is too small
        player_r, player_c = 1, 1

    # Pull backwards aggressively
    pull_iters = 40 + (level * 25)
    reverse_steps = []
    stuck_counter = 0

    for i in range(pull_iters):
        options = []
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr, nc = player_r + dr, player_c + dc
            if nr < 0 or nr >= size or nc < 0 or nc >= size or layout[nr][nc] == 1: continue 
            
            if (nr, nc) not in boxes:
                options.append({"type": "walk", "pr": nr, "pc": nc, "dr": dr, "dc": dc})
                
                # Check for pull opportunity
                # Box to be pulled is at player_r - dr, player_c - dc
                box_r, box_c = player_r - dr, player_c - dc
                if (box_r, box_c) in boxes:
                    # Space where player moves (nr, nc) must be clear (already checked)
                    is_flat_trap = False
                    if (box_r == 1 or box_r == size-2) and dc != 0: is_flat_trap = True
                    if (box_c == 1 or box_c == size-2) and dr != 0: is_flat_trap = True
                    
                    if not is_flat_trap:
                        options.append({
                            "type": "pull", 
                            "pr": nr, "pc": nc, 
                            "old_box": (box_r, box_c),
                            "new_box": (player_r, player_c),
                            "dr": dr, "dc": dc
                        })
                    
        if options:
            pulls = [o for o in options if o["type"] == "pull"]
            walks = [o for o in options if o["type"] == "walk"]
            
            # Prioritize pulling. If no pulls, walk.
            if pulls and random.random() < 0.90:
                action = random.choice(pulls)
                stuck_counter = 0
            else:
                action = random.choice(walks) if walks else random.choice(pulls)
                if action["type"] == "walk":
                    stuck_counter += 1
                else:
                    stuck_counter = 0
                
            if action["type"] == "pull":
                reverse_steps.append({"type": "push", "dir": [-action["dr"], -action["dc"]]})
                boxes.remove(action["old_box"])
                boxes.append(action["new_box"])
            else:
                reverse_steps.append({"type": "move", "dir": [-action["dr"], -action["dc"]]})
                
            player_r, player_c = action["pr"], action["pc"]
        else:
            # Genuinely stuck (boxed in)
            stuck_counter = 10 
            
        # Teleport player if stuck (i.e. wandering too long without pulling)
        if stuck_counter >= 8:
            # Teleport player to a random spot adjacent to a random box to resume pulling
            target_box = random.choice(boxes)
            for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                tr, tc = target_box[0] + dr, target_box[1] + dc
                if 0 < tr < size-1 and 0 < tc < size-1 and layout[tr][tc] != 1 and (tr, tc) not in boxes:
                    player_r, player_c = tr, tc
                    stuck_counter = 0
                    break

    # Final check: Boxes and player must be disjoint
    for _ in range(5):
        if (player_r, player_c) in boxes:
             # Move player one step away
             for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                 nr, nc = player_r + dr, player_c + dc
                 if 0 < nr < size-1 and 0 < nc < size-1 and layout[nr][nc] != 1 and (nr, nc) not in boxes:
                     player_r, player_c = nr, nc
                     break

    # The solution is the REVERSE of the reverse_steps
    solution = reverse_steps[::-1]
                
    # 10. Check if it's already solved (all boxes on targets)
    # Convert boxes to set of tuples for comparison
    boxes_tuples = set(tuple(b) for b in boxes)
    targets_set = set(target_locs)
    
    if boxes_tuples == targets_set:
        # Extremely unlikely given many pulls, but if it happens, re-scramble
        return get_sokoban_initial_state(level)
                
    return {
        "game_type": "sokoban",
        "size": size,
        "layout": layout,
        "boxes": [list(b) for b in boxes],
        "player": [player_r, player_c],
        "solution": solution,
        "min_moves_required": max(num_boxes * 2, int(pull_iters * 0.4))
    }

# --- Nonogram (Picross) Generator ---
def get_nonogram_initial_state(level: int):
    # Depending on level: 5x5 to 10x10
    # Easy mode for level 1: smaller nonogram grid
    if level == 1:
        size = 4
    else:
        size = min(5 + (level // 2), 10)
    
    # Generate a random binary image
    grid = [[random.choice([0, 1]) for _ in range(size)] for _ in range(size)]
    
    # Calculate row hints
    row_hints = []
    for r in range(size):
        hints = []
        count = 0
        for c in range(size):
            if grid[r][c] == 1:
                count += 1
            else:
                if count > 0:
                    hints.append(count)
                count = 0
        if count > 0:
            hints.append(count)
        row_hints.append(hints if hints else [0])
        
    # Calculate column hints
    col_hints = []
    for c in range(size):
        hints = []
        count = 0
        for r in range(size):
            if grid[r][c] == 1:
                count += 1
            else:
                if count > 0:
                    hints.append(count)
                count = 0
        if count > 0:
            hints.append(count)
        col_hints.append(hints if hints else [0])
        
    return {
        "game_type": "nonogram",
        "size": size,
        "row_hints": row_hints,
        "col_hints": col_hints,
        "solution": grid,
        "min_moves_required": sum(sum(row) for row in grid)
    }

# --- Operator Lab (Programming Logic) Generator ---
def generate_operator_puzzle():
    """
    Generates a 4-number math puzzle that requires Python operators.
    Ensures standard Python precedence and safe calculation results.
    """
    ops_pool = ['+', '-', '*', '/', '//', '%', '**']
    
    while True:
        # Pick 4 numbers between 1 and 12
        nums = [random.randint(1, 12) for _ in range(4)]
        
        # Try to find a valid operator set that results in a 'nice' target
        # We'll try up to 20 random op combinations for these numbers
        for _ in range(20):
            ops = [random.choice(ops_pool) for _ in range(3)]
            
            # Preventive check for massive numbers (Power operator safety)
            # Power can't have an exponent > 5 or a base > 10 in this lab context
            invalid = False
            for i, op in enumerate(ops):
                if op == '**':
                    exponent = nums[i+1]
                    base = nums[i]
                    if exponent > 5 or base > 10: invalid = True; break
            if invalid: continue
            
            # Construct expression string
            expr = f"{nums[0]} {ops[0]} {nums[1]} {ops[1]} {nums[2]} {ops[2]} {nums[3]}"
            
            try:
                # Evaluate using Python rules
                res = eval(expr, {"__builtins__": {}}, {})
                
                # Check if result is a valid "Level-friendly" target
                # We prefer Integers between 1 and 500
                if isinstance(res, (int, float)) and 1 <= res <= 500:
                    # If it's a float like 10.0, convert to 10
                    if isinstance(res, float) and res.is_integer():
                        res = int(res)
                    
                    # We return as soon as we find a valid integer target
                    if isinstance(res, int):
                        return {
                            "game_type": "operator_lab",
                            "numbers": nums,
                            "target": res,
                            "operators_pool": ops_pool
                        }
            except (ZeroDivisionError, OverflowError):
                continue
            except:
                continue

def solve_operator_puzzle(numbers: list, target: int):
    """
    Brute-force solver for the operator lab.
    Returns the first valid operator combination.
    """
    ops_pool = ['+', '-', '*', '/', '//', '%', '**']
    import itertools
    
    # Check all 7^3 = 343 combinations
    for ops in itertools.product(ops_pool, repeat=3):
        # Power safety (same as generator)
        invalid = False
        for i, op in enumerate(ops):
            if op == '**':
                exponent = numbers[i+1]
                base = numbers[i]
                if exponent > 5 or base > 10: invalid = True; break
        if invalid: continue
        
        expr = f"{numbers[0]} {ops[0]} {numbers[1]} {ops[1]} {numbers[2]} {ops[2]} {numbers[3]}"
        try:
            res = eval(expr, {"__builtins__": {}}, {})
            if res == target:
                return list(ops)
        except:
            continue
    return None

