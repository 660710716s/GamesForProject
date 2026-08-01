import requests
import time

url = "http://localhost:8000/login"

print("Test 1: Valid poweruser")
r = requests.post(url, json={"username": "adminnaew", "password": "x"})
print(r.status_code, r.json())

print("Test 2: Invalid text ID")
r = requests.post(url, json={"username": "testuser", "password": "x"})
print(r.status_code, r.json())

print("Test 3: Invalid long ID")
r = requests.post(url, json={"username": "1234567890", "password": "x"})
print(r.status_code, r.json())

print("Test 4: Valid numeric ID")
r = requests.post(url, json={"username": "123456789", "password": "x"})
print(r.status_code, r.json())

print("Test 5: Spam limit")
for i in range(12):
    r = requests.post(url, json={"username": "12345", "password": "x"})
    if r.status_code == 429:
        print(f"Blocked at attempt {i+1}:", r.json())
        break
