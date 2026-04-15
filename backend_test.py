#!/usr/bin/env python3
"""
Red Music Backend API Testing
Tests all backend endpoints for the Red Music ministry management system
"""

import requests
import sys
import json
from datetime import datetime, timedelta

class RedMusicAPITester:
    def __init__(self, base_url="https://repertoire-admin.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_user = None
        self.test_volunteer_id = None
        self.test_song_id = None
        self.test_schedule_id = None

    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        self.log(f"🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=test_headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    self.log(f"   Error: {error_data}")
                except:
                    self.log(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            self.log(f"❌ {name} - Exception: {str(e)}")
            return False, {}

    def test_auth_flow(self):
        """Test complete authentication flow"""
        self.log("\n=== TESTING AUTHENTICATION ===")
        
        # Test login with admin credentials
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@redmusic.com", "password": "Admin@2026"}
        )
        
        if success:
            self.admin_user = response
            self.log(f"   Admin user: {response.get('name')} ({response.get('role')})")
        else:
            self.log("❌ Admin login failed - cannot continue with authenticated tests")
            return False

        # Test get current user
        success, _ = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )

        return success

    def test_volunteers_crud(self):
        """Test volunteer CRUD operations"""
        self.log("\n=== TESTING VOLUNTEERS CRUD ===")
        
        # Create volunteer
        volunteer_data = {
            "name": "João Silva",
            "birth_date": "1990-05-15",
            "email": "joao.silva@test.com",
            "phone": "(11) 99999-9999",
            "instruments": ["Guitarra", "Violão"],
            "functions": ["Músico"],
            "phase": "Em Teste",
            "status": "Ativo",
            "tags": ["Novo"]
        }
        
        success, response = self.run_test(
            "Create Volunteer",
            "POST",
            "volunteers",
            200,
            data=volunteer_data
        )
        
        if success:
            self.test_volunteer_id = response.get('id')
            self.log(f"   Created volunteer ID: {self.test_volunteer_id}")
            # Verify age calculation
            if 'age' in response:
                self.log(f"   Age calculated: {response['age']} years")
        
        # Get all volunteers
        success, response = self.run_test(
            "Get All Volunteers",
            "GET",
            "volunteers",
            200
        )
        
        if success:
            self.log(f"   Found {len(response)} volunteers")
        
        # Get specific volunteer
        if self.test_volunteer_id:
            success, _ = self.run_test(
                "Get Specific Volunteer",
                "GET",
                f"volunteers/{self.test_volunteer_id}",
                200
            )
            
            # Update volunteer
            update_data = {"phone": "(11) 88888-8888"}
            success, _ = self.run_test(
                "Update Volunteer",
                "PUT",
                f"volunteers/{self.test_volunteer_id}",
                200,
                data=update_data
            )

    def test_songs_crud(self):
        """Test songs CRUD operations"""
        self.log("\n=== TESTING SONGS CRUD ===")
        
        # Create song
        song_data = {
            "name": "Amazing Grace",
            "original_key": "G",
            "bpm": 120,
            "tempo": "Moderado",
            "tags": ["Clássico", "Adoração"],
            "links": ["https://youtube.com/example"],
            "notes": "Música clássica de adoração"
        }
        
        success, response = self.run_test(
            "Create Song",
            "POST",
            "songs",
            200,
            data=song_data
        )
        
        if success:
            self.test_song_id = response.get('id')
            self.log(f"   Created song ID: {self.test_song_id}")
        
        # Get all songs
        success, response = self.run_test(
            "Get All Songs",
            "GET",
            "songs",
            200
        )
        
        if success:
            self.log(f"   Found {len(response)} songs")
        
        # Get specific song
        if self.test_song_id:
            success, _ = self.run_test(
                "Get Specific Song",
                "GET",
                f"songs/{self.test_song_id}",
                200
            )

    def test_schedules_crud(self):
        """Test schedules CRUD operations"""
        self.log("\n=== TESTING SCHEDULES CRUD ===")
        
        # Create schedule
        schedule_data = {
            "date": "2026-02-15",
            "time": "19:00",
            "name": "Culto de Domingo"
        }
        
        success, response = self.run_test(
            "Create Schedule",
            "POST",
            "schedules",
            200,
            data=schedule_data
        )
        
        if success:
            self.test_schedule_id = response.get('id')
            self.log(f"   Created schedule ID: {self.test_schedule_id}")
        
        # Get all schedules
        success, response = self.run_test(
            "Get All Schedules",
            "GET",
            "schedules",
            200
        )
        
        if success:
            self.log(f"   Found {len(response)} schedules")
        
        # Add member to schedule
        if self.test_schedule_id and self.test_volunteer_id:
            member_data = {
                "volunteer_id": self.test_volunteer_id,
                "function": "Guitarrista"
            }
            success, _ = self.run_test(
                "Add Schedule Member",
                "POST",
                f"schedules/{self.test_schedule_id}/members",
                200,
                data=member_data
            )

    def test_dashboard_endpoints(self):
        """Test dashboard metrics endpoints"""
        self.log("\n=== TESTING DASHBOARD ENDPOINTS ===")
        
        # Get dashboard metrics
        success, response = self.run_test(
            "Get Dashboard Metrics",
            "GET",
            "dashboard/metrics",
            200
        )
        
        if success:
            metrics = response
            self.log(f"   Schedules: {metrics.get('total_schedules', 0)}")
            self.log(f"   Active Volunteers: {metrics.get('active_volunteers', 0)}")
            self.log(f"   Total Songs: {metrics.get('total_songs', 0)}")
            self.log(f"   Birthdays this month: {len(metrics.get('birthdays_this_month', []))}")
        
        # Get top songs
        success, response = self.run_test(
            "Get Top Songs",
            "GET",
            "dashboard/top-songs",
            200
        )
        
        if success:
            self.log(f"   Top songs returned: {len(response)}")
        
        # Get burnout alert
        success, response = self.run_test(
            "Get Burnout Alert",
            "GET",
            "dashboard/burnout-alert",
            200
        )
        
        if success:
            self.log(f"   Volunteers with burnout risk: {len(response)}")

    def test_setlist_operations(self):
        """Test setlist operations"""
        self.log("\n=== TESTING SETLIST OPERATIONS ===")
        
        if self.test_schedule_id and self.test_song_id:
            # Add song to setlist
            setlist_data = {
                "song_id": self.test_song_id,
                "key_for_this_event": "A",
                "order": 1
            }
            success, _ = self.run_test(
                "Add Song to Setlist",
                "POST",
                f"setlists/{self.test_schedule_id}/songs",
                200,
                data=setlist_data
            )
            
            # Get setlist
            success, response = self.run_test(
                "Get Setlist",
                "GET",
                f"setlists/{self.test_schedule_id}",
                200
            )
            
            if success:
                songs = response.get('songs', [])
                self.log(f"   Setlist has {len(songs)} songs")

    def test_logout(self):
        """Test logout"""
        self.log("\n=== TESTING LOGOUT ===")
        
        success, _ = self.run_test(
            "Logout",
            "POST",
            "auth/logout",
            200
        )
        
        return success

    def run_all_tests(self):
        """Run all tests"""
        self.log("🚀 Starting Red Music Backend API Tests")
        self.log(f"Testing against: {self.base_url}")
        
        # Test authentication first
        if not self.test_auth_flow():
            self.log("❌ Authentication failed - stopping tests")
            return False
        
        # Test CRUD operations
        self.test_volunteers_crud()
        self.test_songs_crud()
        self.test_schedules_crud()
        
        # Test dashboard
        self.test_dashboard_endpoints()
        
        # Test setlist operations
        self.test_setlist_operations()
        
        # Test logout
        self.test_logout()
        
        # Print summary
        self.log(f"\n📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        self.log(f"Success Rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = RedMusicAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())