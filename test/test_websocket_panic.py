#!/usr/bin/env python3

import asyncio
import websockets
import json
import signal
import sys
import time
import requests
from concurrent.futures import ThreadPoolExecutor

API_URL = "http://localhost:8080"
WS_URL = "ws://localhost:8080"

def get_token():
    """Get JWT token from the API"""
    response = requests.post(f"{API_URL}/auth/login", 
                           json={"username": "admin", "password": "admin123"})
    return response.json()["data"]["token"]

async def abrupt_disconnect_test(endpoint, subscribe_msg, token):
    """Connect to WebSocket and disconnect abruptly"""
    uri = f"{WS_URL}{endpoint}"
    
    try:
        async with websockets.connect(uri) as websocket:
            # Send auth
            auth_msg = json.dumps({"type": "auth", "token": token})
            await websocket.send(auth_msg)
            
            # Wait for auth response
            response = await websocket.recv()
            print(f"Auth response: {response}")
            
            # Send subscribe
            await websocket.send(subscribe_msg)
            
            # Receive a few messages
            for i in range(3):
                try:
                    msg = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                    print(f"Received: {msg[:100]}...")
                except asyncio.TimeoutError:
                    break
            
            # Simulate abrupt disconnection by closing without proper shutdown
            print(f"Abruptly disconnecting from {endpoint}")
            # Force close the underlying socket
            websocket.transport.close()
            
    except Exception as e:
        print(f"Connection error (expected): {e}")

async def test_resize_and_disconnect():
    """Test terminal resize followed by abrupt disconnect"""
    token = get_token()
    uri = f"{WS_URL}/ws/terminal"
    
    try:
        async with websockets.connect(uri) as websocket:
            # Authenticate
            await websocket.send(json.dumps({"type": "auth", "token": token}))
            await websocket.recv()
            
            # Subscribe to terminal
            await websocket.send(json.dumps({"type": "subscribe", "channel": "terminal"}))
            
            # Wait a bit
            await asyncio.sleep(0.5)
            
            # Send resize
            resize_msg = json.dumps({
                "type": "resize",
                "cols": 120,
                "rows": 40
            })
            print("Sending resize command...")
            await websocket.send(resize_msg)
            
            # Send some input
            await websocket.send(json.dumps({
                "type": "input",
                "data": "echo 'test'\n"
            }))
            
            # Receive output
            for i in range(3):
                try:
                    msg = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                    print(f"Terminal output: {msg}")
                except asyncio.TimeoutError:
                    break
            
            # Abrupt disconnect
            print("Abruptly disconnecting from terminal...")
            websocket.transport.close()
            
    except Exception as e:
        print(f"Terminal test error (expected): {e}")

async def parallel_disconnect_test(num_clients=10):
    """Test multiple clients disconnecting simultaneously"""
    token = get_token()
    
    async def client_task(client_id):
        uri = f"{WS_URL}/ws/metrics"
        try:
            async with websockets.connect(uri) as websocket:
                # Auth
                await websocket.send(json.dumps({"type": "auth", "token": token}))
                await websocket.recv()
                
                # Subscribe
                await websocket.send(json.dumps({"type": "subscribe", "channel": "metrics"}))
                
                # Receive some data
                for i in range(2):
                    await asyncio.wait_for(websocket.recv(), timeout=1.0)
                
                # Abrupt close
                websocket.transport.close()
                print(f"Client {client_id} disconnected")
                
        except Exception as e:
            print(f"Client {client_id} error: {e}")
    
    # Create and run all clients
    tasks = [client_task(i) for i in range(num_clients)]
    await asyncio.gather(*tasks, return_exceptions=True)

def check_server_health():
    """Check if server is still responding"""
    try:
        response = requests.get(f"{API_URL}/health", timeout=2)
        return response.status_code == 200
    except:
        return False

async def main():
    print("=== WebSocket Panic Test ===")
    print("This test will simulate various abrupt disconnection scenarios")
    print()
    
    # Check server is running
    if not check_server_health():
        print("❌ Server is not running. Please start it with: make run")
        sys.exit(1)
    
    print("✅ Server is running")
    
    try:
        # Get token
        token = get_token()
        print(f"✅ Got authentication token")
        
        # Test 1: Metrics endpoint disconnection
        print("\n--- Test 1: Metrics WebSocket Abrupt Disconnect ---")
        await abrupt_disconnect_test("/ws/metrics", 
                                   json.dumps({"type": "subscribe", "channel": "metrics"}), 
                                   token)
        time.sleep(1)
        assert check_server_health(), "Server crashed after metrics disconnect!"
        print("✅ Server survived metrics disconnect")
        
        # Test 2: Logs endpoint disconnection
        print("\n--- Test 2: Logs WebSocket Abrupt Disconnect ---")
        await abrupt_disconnect_test("/ws/logs", 
                                   json.dumps({"type": "subscribe", "channel": "logs", "options": {"lines": 10}}), 
                                   token)
        time.sleep(1)
        assert check_server_health(), "Server crashed after logs disconnect!"
        print("✅ Server survived logs disconnect")
        
        # Test 3: Terminal with resize
        print("\n--- Test 3: Terminal Resize and Disconnect ---")
        await test_resize_and_disconnect()
        time.sleep(1)
        assert check_server_health(), "Server crashed after terminal disconnect!"
        print("✅ Server survived terminal disconnect")
        
        # Test 4: Multiple simultaneous disconnects
        print("\n--- Test 4: Multiple Simultaneous Disconnects ---")
        print("Connecting 10 clients and disconnecting them all at once...")
        await parallel_disconnect_test(10)
        time.sleep(2)
        assert check_server_health(), "Server crashed after multiple disconnects!"
        print("✅ Server survived multiple simultaneous disconnects")
        
        print("\n=== All Tests Passed! ===")
        print("Check server logs for any panic messages.")
        print("Expected: 'WebSocket client panic recovered' messages (handled panics)")
        print("Not expected: Unhandled panic stack traces")
        
    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
