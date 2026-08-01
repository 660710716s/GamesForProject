import random
import time
from collections import deque

def solve_rushhour(initial_vehicles, grid_size, exit_y, limit=50000):
    def is_solved(state):
        red_x, red_y = state[0]
        return red_x + 2 == grid_size

    def get_moves(state, vehicles_info):
        moves = []
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
                nx = vx - 1
                while nx >= 0 and occ[vy][nx] is None:
                    moves.append((idx, nx, vy))
                    nx -= 1
                nx = vx + v['w']
                while nx < grid_size and occ[vy][nx] is None:
                    moves.append((idx, nx - v['w'] + 1, vy))
                    nx += 1
            else:
                ny = vy - 1
                while ny >= 0 and occ[ny][vx] is None:
                    moves.append((idx, vx, ny))
                    ny -= 1
                ny = vy + v['h']
                while ny < grid_size and occ[ny][vx] is None:
                    moves.append((idx, vx, ny - v['h'] + 1))
                    ny += 1
        return moves

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

def generate_hard_rushhour(level):
    grid_size = 8
    exit_y = 3
    
    min_moves = min(3 + level, 20)
    best_vehicles = None
    best_solution = []
    
    for attempt in range(50):
        red_start_x = random.choice([0, 1, 2])
        vehicles = [
            {"id": "red", "x": red_start_x, "y": exit_y, "w": 2, "h": 1, "type": "player"}
        ]
        
        num_obstacles = 20
        cells_used = {(red_start_x, exit_y), (red_start_x+1, exit_y)}
        
        for _ in range(150):
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
                
        solution = solve_rushhour(vehicles, grid_size, exit_y, limit=3000)
        
        if solution is not None:
            if len(solution) > len(best_solution):
                best_solution = solution
                best_vehicles = vehicles
                
            if len(solution) >= min_moves:
                print(f"Met goal on attempt {attempt}, moves: {len(solution)}")
                return grid_size, best_vehicles, best_solution
                
    print(f"Fallback to best found. Moves: {len(best_solution)}")
    return grid_size, best_vehicles, best_solution

start_time = time.time()
grid_size, vehicles, sol = generate_hard_rushhour(10)
print(f"Grid Size: {grid_size}x{grid_size}")
print(f"Time: {time.time() - start_time:.2f}s, sol length: {len(sol)}")
