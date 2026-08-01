import random

def test_sliding():
    size = 3
    board = [[r * size + c + 1 for c in range(size)] for r in range(size)]
    board[size-1][size-1] = 0
    
    empty_r, empty_c = size - 1, size - 1
    history = []
    
    for _ in range(5):
        neighbors = []
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr, nc = empty_r + dr, empty_c + dc
            if 0 <= nr < size and 0 <= nc < size:
                neighbors.append((nr, nc))
        
        nr, nc = random.choice(neighbors)
        board[empty_r][empty_c], board[nr][nc] = board[nr][nc], board[empty_r][empty_c]
        history.append({"r": empty_r, "c": empty_c})
        empty_r, empty_c = nr, nc
        
    solution = history[::-1]
    
    # Simulate JS Step Solve
    newBoard = [row[:] for row in board]
    print("Initial Board:", newBoard)
    
    for step in range(len(solution)):
        move = solution[step]
        r = move["r"]
        c = move["c"]
        
        emptyR, emptyC = -1, -1
        for i in range(size):
            for j in range(size):
                if newBoard[i][j] == 0:
                    emptyR, emptyC = i, j
                    break
            if emptyR != -1: break
            
        print(f"Step {step}: move {r},{c}, empty {emptyR},{emptyC}")
        
        isAdjacent = (abs(r - emptyR) == 1 and c == emptyC) or (abs(c - emptyC) == 1 and r == emptyR)
        if isAdjacent:
            newBoard[emptyR][emptyC] = newBoard[r][c]
            newBoard[r][c] = 0
        else:
            print("ERROR: Not Adjacent!")
            
    print("Final Board:", newBoard)

test_sliding()
