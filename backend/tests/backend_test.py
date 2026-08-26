"""Backend tests for Red Music - schedules batch, availability, exhaustion, chat, notifications, slot limits."""
import os
import uuid
from datetime import date, timedelta
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://repertoire-admin.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@redmusic.com"
ADMIN_PASSWORD = "Admin@2026"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="session")
def test_volunteer(session):
    """Create a test volunteer whose email matches admin so availability can be tested."""
    payload = {
        "name": "TEST Voluntario Admin",
        "birth_date": "1990-01-15",
        "email": ADMIN_EMAIL,  # matches admin so mark_availability works
        "phone": "11999999999",
        "instruments": ["Vocal", "Violão"],
        "functions": ["Vocal"],
        "status": "Ativo",
    }
    r = session.post(f"{API}/volunteers", json=payload)
    assert r.status_code == 200, r.text
    vol = r.json()
    yield vol
    session.delete(f"{API}/volunteers/{vol['id']}")


@pytest.fixture()
def extra_volunteers(session):
    """Create extra volunteers for slot limit tests."""
    created = []
    for i in range(8):
        r = session.post(f"{API}/volunteers", json={
            "name": f"TEST Vol {i}",
            "birth_date": "1990-05-05",
            "email": f"testvol{i}_{uuid.uuid4().hex[:6]}@example.com",
            "phone": "11988887777",
            "instruments": ["Vocal", "Violão", "Baixo"],
            "functions": ["Vocal"],
            "status": "Ativo",
        })
        assert r.status_code == 200, r.text
        created.append(r.json())
    yield created
    for v in created:
        session.delete(f"{API}/volunteers/{v['id']}")


# ---------- Auth ----------
class TestAuth:
    def test_auth_me_returns_id_and_underscore_id(self, session):
        r = session.get(f"{API}/auth/me")
        assert r.status_code == 200
        data = r.json()
        assert "_id" in data and "id" in data
        assert data["_id"] == data["id"]
        assert data["email"] == ADMIN_EMAIL


# ---------- Schedules Batch ----------
class TestSchedulesBatch:
    def test_batch_create_with_past_and_future_dates(self, session):
        today = date.today()
        past = (today - timedelta(days=5)).isoformat()
        fut1 = (today + timedelta(days=10)).isoformat()
        fut2 = (today + timedelta(days=17)).isoformat()

        r = session.post(f"{API}/schedules/batch", json={
            "dates": [fut1, past, fut2],
            "time": "19:00",
            "event_type": "Domingo",
            "ministry": "Pulse Music",
            "name_prefix": "TEST Culto",
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert len(data["created"]) == 2
        assert len(data["skipped"]) == 1
        assert data["skipped"][0]["reason"] == "past_date"
        share_tokens = set()
        for s in data["created"]:
            assert s["status"] == "Rascunho"
            assert s["ministry"] == "Pulse Music"
            assert "share_token" in s and s["share_token"]
            share_tokens.add(s["share_token"])
            assert "team_slots" in s and s["team_slots"]["Vocal"] == 6
        assert len(share_tokens) == 2, "share_tokens must be unique"
        # cleanup
        for s in data["created"]:
            session.delete(f"{API}/schedules/{s['id']}")


# ---------- Iteration 3: Ministry + share_token + public endpoint + validated ----------
class TestMinistryAndPublicShare:
    def test_create_schedule_has_ministry_and_share_token(self, session):
        today = date.today()
        r = session.post(f"{API}/schedules", json={
            "name": "TEST Ministry",
            "date": (today + timedelta(days=30)).isoformat(),
            "time": "19:00",
            "event_type": "Domingo",
            "ministry": "Pulse Music",
        })
        assert r.status_code == 200, r.text
        s = r.json()
        try:
            assert s.get("ministry") == "Pulse Music"
            assert s.get("share_token"), "share_token must be auto-generated"
            assert s.get("status") == "Rascunho"
        finally:
            session.delete(f"{API}/schedules/{s['id']}")

    def test_create_schedule_default_ministry_red_music(self, session):
        today = date.today()
        r = session.post(f"{API}/schedules", json={
            "name": "TEST Default Ministry",
            "date": (today + timedelta(days=31)).isoformat(),
            "time": "19:00",
        })
        s = r.json()
        try:
            assert s.get("ministry") == "Red Music"
        finally:
            session.delete(f"{API}/schedules/{s['id']}")

    def test_get_schedules_backfills_share_token_and_ministry(self, session):
        r = session.get(f"{API}/schedules")
        assert r.status_code == 200
        schedules = r.json()
        for s in schedules:
            assert s.get("share_token"), f"schedule {s.get('id')} missing share_token after backfill"
            assert s.get("ministry"), f"schedule {s.get('id')} missing ministry after backfill"

    def test_public_endpoint_no_auth(self, session):
        today = date.today()
        # Create schedule
        r = session.post(f"{API}/schedules", json={
            "name": "TEST Public",
            "date": (today + timedelta(days=33)).isoformat(),
            "time": "19:00",
            "ministry": "Red Music",
        })
        sched = r.json()
        token = sched["share_token"]
        # Create a song and add to setlist
        song_r = session.post(f"{API}/songs", json={
            "name": "TEST Song Public",
            "artist": "TEST Artist",
            "original_key": "G",
            "bpm": 120,
            "tempo": "4/4",
            "link_original": "https://youtube.com/orig",
            "link_pt_br": "https://youtube.com/ptbr",
            "link_intro_arrangement": "https://youtube.com/intro",
            "notes": "test notes",
        })
        song = song_r.json()
        session.post(f"{API}/setlists/{sched['id']}/songs", json={
            "song_id": song["id"],
            "key_for_this_event": "A",
            "order": 1,
        })
        try:
            # Call public endpoint WITHOUT auth
            anon = requests.Session()
            rr = anon.get(f"{API}/public/schedules/{token}")
            assert rr.status_code == 200, f"public endpoint failed: {rr.status_code} {rr.text}"
            data = rr.json()
            assert data["id"] == sched["id"]
            assert data["ministry"] == "Red Music"
            assert "members" in data
            assert "setlist" in data
            assert len(data["setlist"]) == 1
            entry = data["setlist"][0]
            assert "song_full" in entry, "setlist entry must have song_full enriched"
            sf = entry["song_full"]
            for f in ["artist", "bpm", "tempo", "link_original", "link_pt_br", "link_intro_arrangement", "notes"]:
                assert f in sf, f"song_full missing {f}"
            assert sf["artist"] == "TEST Artist"
            assert sf["bpm"] == 120
        finally:
            session.delete(f"{API}/songs/{song['id']}")
            session.delete(f"{API}/schedules/{sched['id']}")

    def test_public_endpoint_invalid_token_404(self):
        anon = requests.Session()
        r = anon.get(f"{API}/public/schedules/invalid-token-nonexistent-xyz")
        assert r.status_code == 404

    def test_update_schedule_status_validado(self, session):
        today = date.today()
        r = session.post(f"{API}/schedules", json={
            "name": "TEST Validado",
            "date": (today + timedelta(days=34)).isoformat(),
            "time": "19:00",
        })
        sched = r.json()
        try:
            rr = session.put(f"{API}/schedules/{sched['id']}", json={"status": "Validado"})
            assert rr.status_code == 200, rr.text
            updated = rr.json()
            assert updated["status"] == "Validado"
        finally:
            session.delete(f"{API}/schedules/{sched['id']}")


# ---------- Availability & Exhaustion ----------
@pytest.fixture()
def sample_schedule(session):
    today = date.today()
    d = (today + timedelta(days=14)).isoformat()
    r = session.post(f"{API}/schedules", json={
        "name": "TEST Escala Avail",
        "date": d,
        "time": "19:00",
        "event_type": "Domingo",
        "status": "Rascunho",
    })
    assert r.status_code == 200, r.text
    sched = r.json()
    yield sched
    session.delete(f"{API}/schedules/{sched['id']}")


class TestAvailability:
    def test_mark_availability(self, session, sample_schedule, test_volunteer):
        r = session.post(f"{API}/schedules/{sample_schedule['id']}/availability", json={
            "schedule_id": sample_schedule["id"],
            "available": True,
        })
        assert r.status_code == 200, r.text
        assert "message" in r.json()

    def test_get_available_volunteers(self, session, sample_schedule, test_volunteer):
        # mark available
        session.post(f"{API}/schedules/{sample_schedule['id']}/availability", json={
            "schedule_id": sample_schedule["id"], "available": True,
        })
        r = session.get(f"{API}/schedules/{sample_schedule['id']}/available-volunteers")
        assert r.status_code == 200, r.text
        vols = r.json()
        assert isinstance(vols, list)
        me = next((v for v in vols if v["id"] == test_volunteer["id"]), None)
        assert me is not None, "test volunteer should be in available list"
        assert "monthly_schedule_count" in me
        assert "is_exhausted" in me
        assert "explicitly_available" in me
        assert me["explicitly_available"] is True

    def test_respects_unavailability(self, session, sample_schedule, test_volunteer):
        # add unavailability matching schedule date
        session.post(f"{API}/volunteers/{test_volunteer['id']}/unavailability", json={
            "date": sample_schedule["date"], "reason": "TEST reason",
        })
        # clear existing availability records for this schedule so filter is different
        r = session.get(f"{API}/schedules/{sample_schedule['id']}/available-volunteers")
        assert r.status_code == 200
        vols = r.json()
        me = next((v for v in vols if v["id"] == test_volunteer["id"]), None)
        assert me is None, "volunteer with unavailability should be filtered out"
        # cleanup
        session.delete(f"{API}/volunteers/{test_volunteer['id']}/unavailability/{sample_schedule['date']}")


class TestMonthlyCount:
    def test_monthly_count_endpoint(self, session, test_volunteer):
        today = date.today()
        ym = today.strftime("%Y-%m")
        r = session.get(f"{API}/volunteers/{test_volunteer['id']}/monthly-count/{ym}")
        assert r.status_code == 200
        data = r.json()
        assert data["volunteer_id"] == test_volunteer["id"]
        assert data["year_month"] == ym
        assert isinstance(data["count"], int)
        assert data["count"] >= 0


# ---------- Chat / Notifications (bug fix) ----------
class TestChatAndNotifications:
    def test_send_notification_no_resend_key(self, session):
        r = session.post(f"{API}/notifications/send", json={
            "recipient_email": "someone@example.com",
            "subject": "TEST",
            "message": "hello",
            "channel": "email",
        })
        assert r.status_code == 200, r.text
        data = r.json()
        # No RESEND key => email_sent False, no KeyError
        assert data.get("email_sent") is False

    def test_send_chat_message(self, session):
        # send to self (admin) - just verify no 500 and shape
        me = session.get(f"{API}/auth/me").json()
        r = session.post(f"{API}/chat/messages", json={
            "to_user_id": me["id"],
            "message": "TEST hi",
        })
        assert r.status_code == 200, r.text
        d = r.json()
        for f in ["id", "from_user_id", "from_user_name", "to_user_id", "message", "timestamp"]:
            assert f in d, f"missing field {f}"
        assert d["message"] == "TEST hi"


# ---------- Slot Limits ----------
class TestSlotLimits:
    def test_vocal_limit_6(self, session, extra_volunteers):
        today = date.today()
        r = session.post(f"{API}/schedules", json={
            "name": "TEST Slot Vocal", "date": (today + timedelta(days=20)).isoformat(),
            "time": "19:00", "event_type": "Domingo",
        })
        sched = r.json()
        try:
            # Add 6 Vocal
            for i in range(6):
                rr = session.post(f"{API}/schedules/{sched['id']}/members", json={
                    "volunteer_id": extra_volunteers[i]["id"], "function": "Vocal",
                })
                assert rr.status_code == 200, f"Vocal {i}: {rr.status_code} {rr.text}"
            # 7th as Backing Vocal should fail (Vocal group full)
            rr = session.post(f"{API}/schedules/{sched['id']}/members", json={
                "volunteer_id": extra_volunteers[6]["id"], "function": "Backing Vocal",
            })
            assert rr.status_code == 400, f"expected 400 got {rr.status_code}: {rr.text}"
        finally:
            session.delete(f"{API}/schedules/{sched['id']}")

    def test_violao_limit_2(self, session, extra_volunteers):
        today = date.today()
        r = session.post(f"{API}/schedules", json={
            "name": "TEST Slot Violao", "date": (today + timedelta(days=21)).isoformat(),
            "time": "19:00", "event_type": "Domingo",
        })
        sched = r.json()
        try:
            for i in range(2):
                rr = session.post(f"{API}/schedules/{sched['id']}/members", json={
                    "volunteer_id": extra_volunteers[i]["id"], "function": "Violão",
                })
                assert rr.status_code == 200, rr.text
            rr = session.post(f"{API}/schedules/{sched['id']}/members", json={
                "volunteer_id": extra_volunteers[2]["id"], "function": "Violão",
            })
            assert rr.status_code == 400
        finally:
            session.delete(f"{API}/schedules/{sched['id']}")

    def test_baixo_limit_1(self, session, extra_volunteers):
        today = date.today()
        r = session.post(f"{API}/schedules", json={
            "name": "TEST Slot Baixo", "date": (today + timedelta(days=22)).isoformat(),
            "time": "19:00", "event_type": "Domingo",
        })
        sched = r.json()
        try:
            rr = session.post(f"{API}/schedules/{sched['id']}/members", json={
                "volunteer_id": extra_volunteers[0]["id"], "function": "Baixo",
            })
            assert rr.status_code == 200, rr.text
            rr = session.post(f"{API}/schedules/{sched['id']}/members", json={
                "volunteer_id": extra_volunteers[1]["id"], "function": "Baixo",
            })
            assert rr.status_code == 400
        finally:
            session.delete(f"{API}/schedules/{sched['id']}")


# ---------- Unavailability warning ----------
class TestUnavailabilityWarning:
    def test_add_member_with_unavailability_returns_warning(self, session, extra_volunteers):
        today = date.today()
        d = (today + timedelta(days=25)).isoformat()
        r = session.post(f"{API}/schedules", json={
            "name": "TEST Unav", "date": d, "time": "19:00", "event_type": "Domingo",
        })
        sched = r.json()
        vol = extra_volunteers[0]
        try:
            session.post(f"{API}/volunteers/{vol['id']}/unavailability", json={
                "date": d, "reason": "viagem",
            })
            rr = session.post(f"{API}/schedules/{sched['id']}/members", json={
                "volunteer_id": vol["id"], "function": "Vocal",
            })
            assert rr.status_code == 200, rr.text
            data = rr.json()
            assert "warning" in data, f"expected warning in {data}"
        finally:
            session.delete(f"{API}/volunteers/{vol['id']}/unavailability/{d}")
            session.delete(f"{API}/schedules/{sched['id']}")
