#!/usr/bin/env python3
import requests
import json
import time

def test_railway_deployment(base_url):
    """Test Railway deployment endpoints"""
    print(f"Testing Railway deployment at: {base_url}")
    
    # Test 1: Root endpoint
    print("\n1. Testing root endpoint...")
    try:
        response = requests.get(f"{base_url}/", timeout=30)
        if response.status_code == 200:
            print(f"✅ Root endpoint: {response.json()}")
        else:
            print(f"❌ Root endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Root endpoint error: {e}")
    
    # Test 2: Health check endpoint
    print("\n2. Testing health check endpoint...")
    try:
        response = requests.get(f"{base_url}/health", timeout=30)
        if response.status_code == 200:
            health_data = response.json()
            print(f"✅ Health check: {health_data}")
            
            if health_data.get('database') == 'connected':
                print("✅ Database connection is healthy")
            else:
                print(f"⚠️  Database status: {health_data.get('database')}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Health check error: {e}")
    
    # Test 3: History endpoint
    print("\n3. Testing history endpoint...")
    try:
        response = requests.get(f"{base_url}/history", timeout=30)
        if response.status_code == 200:
            history_data = response.json()
            print(f"✅ History endpoint: Found {len(history_data.get('history', []))} records")
        else:
            print(f"❌ History endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"❌ History endpoint error: {e}")
    
    # Test 4: Static file serving (React frontend)
    print("\n4. Testing frontend static files...")
    try:
        response = requests.get(base_url, timeout=30)
        if response.status_code == 200 and 'text/html' in response.headers.get('content-type', ''):
            print("✅ Frontend is serving properly")
        else:
            print(f"❌ Frontend serving failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Frontend serving error: {e}")

if __name__ == "__main__":
    # Replace with your actual Railway deployment URL
    railway_url = "https://siwake-app-production.up.railway.app"  # Update with actual URL
    
    print("Railway Deployment Test")
    print("=" * 50)
    
    test_railway_deployment(railway_url)
    
    print("\n" + "=" * 50)
    print("Test completed!")
    print("\nIf database connection is failing:")
    print("1. Check Railway dashboard for postgres service status") 
    print("2. Verify DATABASE_URL environment variable")
    print("3. Check logs with: railway logs --service siwake-app")
    print("4. Ensure postgres service is fully initialized")