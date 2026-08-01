import sys
sys.path.append('./backend')
from puzzle_generator import solve_watersort
tubes = [[1, 2, 1, 2], [2, 1, 2, 1], []]
res = solve_watersort(tubes, 4, limit=1000)
print("Solver success! Length:", len(res))
