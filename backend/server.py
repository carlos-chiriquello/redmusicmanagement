from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, File, UploadFile, status
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from bson import ObjectId
import asyncio
import resend
from io import BytesIO
import base64

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {"sub": user_id, "email": email, "role": role, "exp": datetime.now(timezone.utc) + timedelta(minutes=15), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user["id"] = user["_id"]
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") == "Voluntário":
        raise HTTPException(status_code=403, detail="Acesso restrito à liderança")
    return current_user

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: Optional[str] = "Voluntário"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class VolunteerCreate(BaseModel):
    name: str
    birth_date: str
    email: EmailStr
    phone: str
    photo_url: Optional[str] = ""
    instruments: List[str] = []
    functions: List[str] = []
    phase: str = "Em Teste"
    status: str = "Ativo"
    tags: List[str] = []

class VolunteerUpdate(BaseModel):
    name: Optional[str] = None
    birth_date: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    photo_url: Optional[str] = None
    instruments: Optional[List[str]] = None
    functions: Optional[List[str]] = None
    phase: Optional[str] = None
    status: Optional[str] = None
    tags: Optional[List[str]] = None

class UnavailabilityDate(BaseModel):
    date: str
    reason: Optional[str] = ""

class SongCreate(BaseModel):
    name: str
    artist: Optional[str] = ""
    original_key: str
    bpm: Optional[int] = None
    tempo: str = "4/4"
    tags: List[str] = []
    link_original: Optional[str] = ""
    link_pt_br: Optional[str] = ""
    link_intro_arrangement: Optional[str] = ""
    sheet_music_url: Optional[str] = ""
    notes: Optional[str] = ""

class SongUpdate(BaseModel):
    name: Optional[str] = None
    artist: Optional[str] = None
    original_key: Optional[str] = None
    bpm: Optional[int] = None
    tempo: Optional[str] = None
    tags: Optional[List[str]] = None
    link_original: Optional[str] = None
    link_pt_br: Optional[str] = None
    link_intro_arrangement: Optional[str] = None
    sheet_music_url: Optional[str] = None
    notes: Optional[str] = None

class ScheduleCreate(BaseModel):
    name: str
    date: str
    time: str
    event_type: str = "Domingo"
    ministry: str = "Red Music"
    has_choir: bool = False
    has_orchestra: bool = False
    status: str = "Rascunho"

class ScheduleBatchCreate(BaseModel):
    dates: List[str]
    time: str = "19:00"
    event_type: str = "Domingo"
    ministry: str = "Red Music"
    name_prefix: str = "Culto"
    has_choir: bool = False
    has_orchestra: bool = False

class AvailabilityMark(BaseModel):
    schedule_id: str
    available: bool

class ScheduleUpdate(BaseModel):
    name: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    event_type: Optional[str] = None
    ministry: Optional[str] = None
    has_choir: Optional[bool] = None
    has_orchestra: Optional[bool] = None
    status: Optional[str] = None

class ScheduleMemberAdd(BaseModel):
    volunteer_id: str
    function: str

class ScheduleMemberUpdate(BaseModel):
    confirmation_status: str

class SetlistSongAdd(BaseModel):
    song_id: str
    key_for_this_event: Optional[str] = ""
    main_vocal_volunteer_id: Optional[str] = ""
    order: int

class NotificationRequest(BaseModel):
    recipient_email: Optional[EmailStr] = None
    recipient_phone: Optional[str] = None
    subject: str
    message: str
    channel: str

class ChatMessageCreate(BaseModel):
    to_user_id: str
    message: str

@api_router.post("/auth/register")
async def register(request: RegisterRequest, response: Response):
    email_lower = request.email.lower()
    existing = await db.users.find_one({"email": email_lower})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # SEGURANÇA: Bloqueia autocadastro como Administrador via endpoint público
    safe_role = request.role if request.role in ("Voluntário", "Líder") else "Voluntário"
    
    hashed = hash_password(request.password)
    user_doc = {
        "email": email_lower,
        "password_hash": hashed,
        "name": request.name,
        "role": safe_role,
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    access_token = create_access_token(user_id, email_lower, safe_role)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {"id": user_id, "email": email_lower, "name": request.name, "role": safe_role}

class PublicVolunteerRegister(BaseModel):
    name: str
    birth_date: str
    email: EmailStr
    phone: str
    photo_url: Optional[str] = ""
    instruments: List[str] = []
    password: str

@api_router.post("/public/volunteers/register")
async def public_volunteer_register(data: PublicVolunteerRegister):
    email_lower = data.email.lower()
    existing_user = await db.users.find_one({"email": email_lower})
    if existing_user:
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")
    
    from dateutil import parser
    birth_date_obj = parser.parse(data.birth_date)
    if birth_date_obj.tzinfo is None:
        birth_date_obj = birth_date_obj.replace(tzinfo=timezone.utc)
    age = (datetime.now(timezone.utc) - birth_date_obj).days // 365
    
    # Cria voluntário
    vol_doc = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "birth_date": data.birth_date,
        "email": email_lower,
        "phone": data.phone,
        "photo_url": data.photo_url or "",
        "instruments": data.instruments,
        "functions": [],
        "phase": "Em Teste",
        "status": "Ativo",
        "tags": [],
        "age": age,
        "unavailability_dates": [],
        "created_at": datetime.now(timezone.utc)
    }
    await db.volunteers.insert_one(vol_doc)
    
    # Cria user vinculado com role Voluntário (nunca admin)
    hashed = hash_password(data.password)
    await db.users.insert_one({
        "email": email_lower,
        "password_hash": hashed,
        "name": data.name,
        "role": "Voluntário",
        "created_at": datetime.now(timezone.utc)
    })
    
    return {"message": "Cadastro realizado com sucesso! Aguarde aprovação da liderança.", "volunteer_id": vol_doc["id"]}

@api_router.get("/public/monthly/{ministry}/{year_month}")
async def get_public_monthly(ministry: str, year_month: str):
    """Retorna todas as escalas de um ministério em um mês para visualização pública."""
    schedules = await db.schedules.find({
        "ministry": ministry,
        "date": {"$regex": f"^{year_month}"}
    }, {"_id": 0}).to_list(1000)
    
    if not schedules:
        return {"ministry": ministry, "year_month": year_month, "schedules": []}
    
    schedules.sort(key=lambda s: s.get("date", ""))
    
    for schedule in schedules:
        members = await db.schedule_members.find({"schedule_id": schedule["id"]}, {"_id": 0}).to_list(1000)
        schedule["members"] = members
        
        setlist = await db.setlists.find_one({"schedule_id": schedule["id"]}, {"_id": 0})
        schedule["setlist"] = setlist.get("songs", []) if setlist else []
        
        # Enriquecer setlist
        for entry in schedule["setlist"]:
            song = await db.songs.find_one({"id": entry.get("song_id")}, {"_id": 0})
            if song:
                entry["song_full"] = song
    
    return {"ministry": ministry, "year_month": year_month, "schedules": schedules}

@api_router.post("/auth/login")
async def login(request: LoginRequest, response: Response):
    email_lower = request.email.lower()
    user = await db.users.find_one({"email": email_lower})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email_lower, user.get("role", "Voluntário"))
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {"id": user_id, "email": email_lower, "name": user.get("name", ""), "role": user.get("role", "Voluntário")}

@api_router.post("/auth/logout")
async def logout(response: Response, current_user: dict = Depends(get_current_user)):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out successfully"}

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

@api_router.post("/volunteers")
async def create_volunteer(volunteer: VolunteerCreate, current_user: dict = Depends(require_admin)):
    from dateutil import parser
    birth_date_obj = parser.parse(volunteer.birth_date)
    if birth_date_obj.tzinfo is None:
        birth_date_obj = birth_date_obj.replace(tzinfo=timezone.utc)
    age = (datetime.now(timezone.utc) - birth_date_obj).days // 365
    
    vol_doc = volunteer.model_dump()
    vol_doc["id"] = str(uuid.uuid4())
    vol_doc["age"] = age
    vol_doc["unavailability_dates"] = []
    vol_doc["created_at"] = datetime.now(timezone.utc)
    
    result = await db.volunteers.insert_one(vol_doc)
    vol_doc.pop("_id", None)
    return vol_doc

@api_router.get("/volunteers")
async def get_volunteers(current_user: dict = Depends(get_current_user)):
    volunteers = await db.volunteers.find({}).to_list(1000)
    result = []
    for vol in volunteers:
        vol_id = vol.get("id")
        if not vol_id:
            vol_id = str(vol.get("_id", uuid.uuid4()))
            await db.volunteers.update_one({"_id": vol["_id"]}, {"$set": {"id": vol_id}})
            vol["id"] = vol_id
        vol.pop("_id", None)
        result.append(vol)
    return result

@api_router.get("/volunteers/{volunteer_id}")
async def get_volunteer(volunteer_id: str, current_user: dict = Depends(get_current_user)):
    volunteer = await db.volunteers.find_one({"id": volunteer_id}, {"_id": 0})
    if not volunteer:
        raise HTTPException(status_code=404, detail="Volunteer not found")
    return volunteer

@api_router.put("/volunteers/{volunteer_id}")
async def update_volunteer(volunteer_id: str, updates: VolunteerUpdate, current_user: dict = Depends(require_admin)):
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    
    if "birth_date" in update_data:
        from dateutil import parser
        birth_date_obj = parser.parse(update_data["birth_date"])
        if birth_date_obj.tzinfo is None:
            birth_date_obj = birth_date_obj.replace(tzinfo=timezone.utc)
        age = (datetime.now(timezone.utc) - birth_date_obj).days // 365
        update_data["age"] = age
    
    if update_data:
        await db.volunteers.update_one({"id": volunteer_id}, {"$set": update_data})
    
    updated = await db.volunteers.find_one({"id": volunteer_id}, {"_id": 0})
    return updated

@api_router.delete("/volunteers/{volunteer_id}")
async def delete_volunteer(volunteer_id: str, current_user: dict = Depends(require_admin)):
    result = await db.volunteers.delete_one({"id": volunteer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Volunteer not found")
    return {"message": "Volunteer deleted successfully"}

@api_router.post("/volunteers/{volunteer_id}/unavailability")
async def add_unavailability(volunteer_id: str, unavail: UnavailabilityDate, current_user: dict = Depends(require_admin)):
    await db.volunteers.update_one(
        {"id": volunteer_id},
        {"$push": {"unavailability_dates": unavail.model_dump()}}
    )
    return {"message": "Unavailability added"}

@api_router.delete("/volunteers/{volunteer_id}/unavailability/{date}")
async def remove_unavailability(volunteer_id: str, date: str, current_user: dict = Depends(require_admin)):
    await db.volunteers.update_one(
        {"id": volunteer_id},
        {"$pull": {"unavailability_dates": {"date": date}}}
    )
    return {"message": "Unavailability removed"}

@api_router.post("/songs")
async def create_song(song: SongCreate, current_user: dict = Depends(require_admin)):
    song_doc = song.model_dump()
    song_doc["id"] = str(uuid.uuid4())
    song_doc["last_played_date"] = None
    song_doc["play_count"] = 0
    song_doc["created_at"] = datetime.now(timezone.utc)
    
    await db.songs.insert_one(song_doc)
    song_doc.pop("_id", None)
    return song_doc

@api_router.get("/songs")
async def get_songs(current_user: dict = Depends(get_current_user)):
    songs = await db.songs.find({}, {"_id": 0}).to_list(1000)
    return songs

@api_router.get("/songs/{song_id}")
async def get_song(song_id: str, current_user: dict = Depends(get_current_user)):
    song = await db.songs.find_one({"id": song_id}, {"_id": 0})
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    return song

@api_router.put("/songs/{song_id}")
async def update_song(song_id: str, updates: SongUpdate, current_user: dict = Depends(require_admin)):
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    if update_data:
        await db.songs.update_one({"id": song_id}, {"$set": update_data})
    updated = await db.songs.find_one({"id": song_id}, {"_id": 0})
    return updated

@api_router.delete("/songs/{song_id}")
async def delete_song(song_id: str, current_user: dict = Depends(require_admin)):
    result = await db.songs.delete_one({"id": song_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Song not found")
    return {"message": "Song deleted successfully"}

@api_router.post("/schedules")
async def create_schedule(schedule: ScheduleCreate, current_user: dict = Depends(require_admin)):
    schedule_doc = schedule.model_dump()
    schedule_doc["id"] = str(uuid.uuid4())
    schedule_doc["share_token"] = str(uuid.uuid4())
    schedule_doc["created_at"] = datetime.now(timezone.utc)
    schedule_doc["created_by"] = current_user["_id"]
    schedule_doc["team_slots"] = {
        "Vocal": 6, "Violão": 2, "Guitarra": 2, "Teclado": 2,
        "Baixo": 1, "Bateria": 1, "Percussão": 1
    }
    
    await db.schedules.insert_one(schedule_doc)
    schedule_doc.pop("_id", None)
    return schedule_doc

@api_router.post("/schedules/batch")
async def create_schedules_batch(batch: ScheduleBatchCreate, current_user: dict = Depends(require_admin)):
    from dateutil import parser as dateparser
    today = datetime.now(timezone.utc).date()
    created = []
    skipped = []
    
    for date_str in batch.dates:
        try:
            date_obj = dateparser.parse(date_str).date()
        except Exception:
            skipped.append({"date": date_str, "reason": "invalid_date"})
            continue
        
        if date_obj < today:
            skipped.append({"date": date_str, "reason": "past_date"})
            continue
        
        weekday_names_pt = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]
        weekday = weekday_names_pt[date_obj.weekday()]
        
        schedule_doc = {
            "id": str(uuid.uuid4()),
            "share_token": str(uuid.uuid4()),
            "name": f"{batch.name_prefix} - {date_obj.strftime('%d/%m/%Y')}",
            "date": date_obj.isoformat(),
            "time": batch.time,
            "event_type": batch.event_type,
            "ministry": batch.ministry,
            "has_choir": batch.has_choir,
            "has_orchestra": batch.has_orchestra,
            "status": "Rascunho",
            "created_at": datetime.now(timezone.utc),
            "created_by": current_user["_id"],
            "team_slots": {
                "Vocal": 6, "Violão": 2, "Guitarra": 2, "Teclado": 2,
                "Baixo": 1, "Bateria": 1, "Percussão": 1
            }
        }
        await db.schedules.insert_one(schedule_doc)
        schedule_doc.pop("_id", None)
        created.append(schedule_doc)
    
    return {"created": created, "skipped": skipped, "total_created": len(created)}

@api_router.post("/schedules/{schedule_id}/availability")
async def mark_availability(schedule_id: str, mark: AvailabilityMark, current_user: dict = Depends(get_current_user)):
    schedule = await db.schedules.find_one({"id": schedule_id}, {"_id": 0})
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # Encontrar o voluntário associado a este usuário (por email)
    volunteer = await db.volunteers.find_one({"email": current_user["email"]}, {"_id": 0})
    if not volunteer:
        raise HTTPException(status_code=404, detail="Voluntário não encontrado para este usuário")
    
    await db.availability.update_one(
        {"schedule_id": schedule_id, "volunteer_id": volunteer["id"]},
        {"$set": {
            "schedule_id": schedule_id,
            "volunteer_id": volunteer["id"],
            "volunteer_name": volunteer["name"],
            "available": mark.available,
            "marked_at": datetime.now(timezone.utc)
        }},
        upsert=True
    )
    return {"message": "Disponibilidade registrada"}

@api_router.get("/schedules/{schedule_id}/available-volunteers")
async def get_available_volunteers_for_schedule(schedule_id: str, current_user: dict = Depends(get_current_user)):
    schedule = await db.schedules.find_one({"id": schedule_id}, {"_id": 0})
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    schedule_date = schedule.get("date", "")
    
    availabilities = await db.availability.find({"schedule_id": schedule_id, "available": True}, {"_id": 0}).to_list(1000)
    available_ids = [a["volunteer_id"] for a in availabilities]
    
    all_volunteers = await db.volunteers.find({"status": "Ativo"}).to_list(1000)
    
    result = []
    for vol in all_volunteers:
        # Backfill: ensure 'id' field exists (legacy documents may only have _id)
        vol_id = vol.get("id")
        if not vol_id:
            vol_id = str(vol.get("_id", uuid.uuid4()))
            await db.volunteers.update_one({"_id": vol["_id"]}, {"$set": {"id": vol_id}})
            vol["id"] = vol_id
        vol.pop("_id", None)
        
        is_unavailable = any(u.get("date") == schedule_date for u in vol.get("unavailability_dates", []))
        if is_unavailable:
            continue
        
        has_availability_records = len(availabilities) > 0
        if has_availability_records and vol_id not in available_ids:
            continue
        
        # Contar escalas no mês
        year_month = schedule_date[:7] if schedule_date else ""
        monthly_count = 0
        if year_month:
            monthly_members = await db.schedule_members.find({"volunteer_id": vol_id}, {"_id": 0}).to_list(1000)
            for m in monthly_members:
                m_schedule = await db.schedules.find_one({"id": m["schedule_id"]}, {"_id": 0})
                if m_schedule and m_schedule.get("date", "").startswith(year_month) and m_schedule.get("status") in ["Em Validação", "Fechada"]:
                    monthly_count += 1
        
        vol["monthly_schedule_count"] = monthly_count
        vol["is_exhausted"] = monthly_count >= 2
        vol["explicitly_available"] = vol_id in available_ids
        result.append(vol)
    
    return result

@api_router.get("/volunteers/{volunteer_id}/monthly-count/{year_month}")
async def get_volunteer_monthly_count(volunteer_id: str, year_month: str, current_user: dict = Depends(get_current_user)):
    members = await db.schedule_members.find({"volunteer_id": volunteer_id}, {"_id": 0}).to_list(1000)
    count = 0
    for m in members:
        m_schedule = await db.schedules.find_one({"id": m["schedule_id"]}, {"_id": 0})
        if m_schedule and m_schedule.get("date", "").startswith(year_month) and m_schedule.get("status") in ["Em Validação", "Fechada"]:
            count += 1
    return {"volunteer_id": volunteer_id, "year_month": year_month, "count": count}

@api_router.get("/schedules")
async def get_schedules(current_user: dict = Depends(get_current_user)):
    schedules = await db.schedules.find({}, {"_id": 0}).to_list(1000)
    # Backfill share_token para escalas antigas
    for s in schedules:
        if not s.get("share_token"):
            token = str(uuid.uuid4())
            await db.schedules.update_one({"id": s["id"]}, {"$set": {"share_token": token}})
            s["share_token"] = token
        if not s.get("ministry"):
            await db.schedules.update_one({"id": s["id"]}, {"$set": {"ministry": "Red Music"}})
            s["ministry"] = "Red Music"
    return schedules

@api_router.get("/public/schedules/{share_token}")
async def get_public_schedule(share_token: str):
    schedule = await db.schedules.find_one({"share_token": share_token}, {"_id": 0})
    if not schedule:
        raise HTTPException(status_code=404, detail="Escala não encontrada ou link inválido")
    
    members = await db.schedule_members.find({"schedule_id": schedule["id"]}, {"_id": 0}).to_list(1000)
    schedule["members"] = members
    
    setlist = await db.setlists.find_one({"schedule_id": schedule["id"]}, {"_id": 0})
    schedule["setlist"] = setlist.get("songs", []) if setlist else []
    
    # Enriquecer setlist com dados completos das músicas
    for entry in schedule["setlist"]:
        song = await db.songs.find_one({"id": entry.get("song_id")}, {"_id": 0})
        if song:
            entry["song_full"] = song
    
    return schedule

@api_router.get("/schedules/{schedule_id}")
async def get_schedule(schedule_id: str, current_user: dict = Depends(get_current_user)):
    schedule = await db.schedules.find_one({"id": schedule_id}, {"_id": 0})
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    members = await db.schedule_members.find({"schedule_id": schedule_id}, {"_id": 0}).to_list(1000)
    schedule["members"] = members
    
    setlist = await db.setlists.find_one({"schedule_id": schedule_id}, {"_id": 0})
    schedule["setlist"] = setlist.get("songs", []) if setlist else []
    
    return schedule

@api_router.put("/schedules/{schedule_id}")
async def update_schedule(schedule_id: str, updates: ScheduleUpdate, current_user: dict = Depends(require_admin)):
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    if update_data:
        await db.schedules.update_one({"id": schedule_id}, {"$set": update_data})
    updated = await db.schedules.find_one({"id": schedule_id}, {"_id": 0})
    return updated

@api_router.delete("/schedules/{schedule_id}")
async def delete_schedule(schedule_id: str, current_user: dict = Depends(require_admin)):
    await db.schedules.delete_one({"id": schedule_id})
    await db.schedule_members.delete_many({"schedule_id": schedule_id})
    await db.setlists.delete_one({"schedule_id": schedule_id})
    return {"message": "Schedule deleted successfully"}

@api_router.post("/schedules/{schedule_id}/members")
async def add_schedule_member(schedule_id: str, member: ScheduleMemberAdd, current_user: dict = Depends(require_admin)):
    volunteer = await db.volunteers.find_one({"id": member.volunteer_id}, {"_id": 0})
    if not volunteer:
        raise HTTPException(status_code=404, detail="Volunteer not found")
    
    schedule = await db.schedules.find_one({"id": schedule_id}, {"_id": 0})
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # Verificar indisponibilidade
    schedule_date = schedule.get("date", "")
    unavail_dates = volunteer.get("unavailability_dates", [])
    for unavail in unavail_dates:
        if unavail.get("date") == schedule_date:
            return {"warning": f"Voluntário {volunteer['name']} está indisponível nesta data: {unavail.get('reason', 'Sem motivo especificado')}"}
    
    # Verificar limite de vagas
    team_slots = schedule.get("team_slots", {})
    function_normalized = "Vocal" if "vocal" in member.function.lower() else member.function
    
    if function_normalized in team_slots:
        limit = team_slots[function_normalized]
        current_count = await db.schedule_members.count_documents({
            "schedule_id": schedule_id,
            "function": {"$regex": f"^{function_normalized.replace('ã', '[ãa]').replace('ç', '[çc]')}", "$options": "i"} if function_normalized == "Vocal" else function_normalized
        })
        
        # Contagem mais simples: apenas mesma função exata
        if function_normalized == "Vocal":
            current_count = await db.schedule_members.count_documents({
                "schedule_id": schedule_id,
                "function": {"$in": ["Vocal", "Backing Vocal"]}
            })
        else:
            current_count = await db.schedule_members.count_documents({
                "schedule_id": schedule_id,
                "function": function_normalized
            })
        
        if current_count >= limit:
            raise HTTPException(
                status_code=400, 
                detail=f"Limite de {limit} vaga(s) para {function_normalized} já atingido"
            )
    
    member_doc = {
        "id": str(uuid.uuid4()),
        "schedule_id": schedule_id,
        "volunteer_id": member.volunteer_id,
        "volunteer_name": volunteer["name"],
        "function": member.function,
        "confirmation_status": "Pendente",
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.schedule_members.insert_one(member_doc)
    member_doc.pop("_id", None)
    return member_doc
    
    member_doc = {
        "id": str(uuid.uuid4()),
        "schedule_id": schedule_id,
        "volunteer_id": member.volunteer_id,
        "volunteer_name": volunteer["name"],
        "function": member.function,
        "confirmation_status": "Pendente",
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.schedule_members.insert_one(member_doc)
    member_doc.pop("_id", None)
    return member_doc

@api_router.put("/schedules/{schedule_id}/members/{member_id}")
async def update_schedule_member(schedule_id: str, member_id: str, updates: ScheduleMemberUpdate, current_user: dict = Depends(require_admin)):
    await db.schedule_members.update_one(
        {"id": member_id, "schedule_id": schedule_id},
        {"$set": {"confirmation_status": updates.confirmation_status}}
    )
    updated = await db.schedule_members.find_one({"id": member_id}, {"_id": 0})
    return updated

@api_router.delete("/schedules/{schedule_id}/members/{member_id}")
async def delete_schedule_member(schedule_id: str, member_id: str, current_user: dict = Depends(require_admin)):
    result = await db.schedule_members.delete_one({"id": member_id, "schedule_id": schedule_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"message": "Member removed from schedule"}

@api_router.post("/setlists/{schedule_id}/songs")
async def add_setlist_song(schedule_id: str, song_data: SetlistSongAdd, current_user: dict = Depends(require_admin)):
    song = await db.songs.find_one({"id": song_data.song_id}, {"_id": 0})
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    setlist = await db.setlists.find_one({"schedule_id": schedule_id})
    
    song_entry = {
        "id": str(uuid.uuid4()),
        "song_id": song_data.song_id,
        "song_name": song["name"],
        "original_key": song["original_key"],
        "key_for_this_event": song_data.key_for_this_event or song["original_key"],
        "main_vocal_volunteer_id": song_data.main_vocal_volunteer_id,
        "order": song_data.order
    }
    
    if setlist:
        await db.setlists.update_one(
            {"schedule_id": schedule_id},
            {"$push": {"songs": song_entry}}
        )
    else:
        setlist_doc = {
            "schedule_id": schedule_id,
            "songs": [song_entry],
            "created_at": datetime.now(timezone.utc)
        }
        await db.setlists.insert_one(setlist_doc)
    
    await db.songs.update_one(
        {"id": song_data.song_id},
        {
            "$set": {"last_played_date": datetime.now(timezone.utc)},
            "$inc": {"play_count": 1}
        }
    )
    
    return song_entry

@api_router.get("/setlists/{schedule_id}")
async def get_setlist(schedule_id: str, current_user: dict = Depends(get_current_user)):
    setlist = await db.setlists.find_one({"schedule_id": schedule_id}, {"_id": 0})
    if not setlist:
        return {"schedule_id": schedule_id, "songs": []}
    return setlist

@api_router.delete("/setlists/{schedule_id}/songs/{song_entry_id}")
async def remove_setlist_song(schedule_id: str, song_entry_id: str, current_user: dict = Depends(require_admin)):
    await db.setlists.update_one(
        {"schedule_id": schedule_id},
        {"$pull": {"songs": {"id": song_entry_id}}}
    )
    return {"message": "Song removed from setlist"}

class SetlistReorder(BaseModel):
    songs: List[dict]

@api_router.put("/setlists/{schedule_id}/reorder")
async def reorder_setlist(schedule_id: str, data: SetlistReorder, current_user: dict = Depends(require_admin)):
    await db.setlists.update_one(
        {"schedule_id": schedule_id},
        {"$set": {"songs": data.songs}}
    )
    return {"message": "Setlist reordered successfully"}

@api_router.get("/schedules/{schedule_id}/vocals")
async def get_schedule_vocals(schedule_id: str, current_user: dict = Depends(get_current_user)):
    members = await db.schedule_members.find(
        {"schedule_id": schedule_id, "function": {"$regex": "vocal", "$options": "i"}},
        {"_id": 0}
    ).to_list(1000)
    return members

@api_router.get("/volunteers/{volunteer_id}/participation-history")
async def get_volunteer_participation(volunteer_id: str, current_user: dict = Depends(get_current_user)):
    schedules = await db.schedules.find({}, {"_id": 0}).to_list(1000)
    
    participation = []
    for schedule in schedules:
        members = await db.schedule_members.find(
            {"schedule_id": schedule["id"], "volunteer_id": volunteer_id},
            {"_id": 0}
        ).to_list(1000)
        
        if members:
            for member in members:
                participation.append({
                    "schedule_id": schedule["id"],
                    "schedule_name": schedule["name"],
                    "schedule_date": schedule["date"],
                    "schedule_time": schedule["time"],
                    "function": member["function"],
                    "confirmation_status": member["confirmation_status"]
                })
    
    participation.sort(key=lambda x: x["schedule_date"], reverse=True)
    return participation

@api_router.get("/dashboard/metrics")
async def get_dashboard_metrics(current_user: dict = Depends(require_admin)):
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    schedules_count = await db.schedules.count_documents({})
    volunteers_count = await db.volunteers.count_documents({"status": "Ativo"})
    songs_count = await db.songs.count_documents({})
    
    volunteers = await db.volunteers.find({"status": "Ativo"}, {"_id": 0, "birth_date": 1, "name": 1}).to_list(1000)
    birthdays = []
    for vol in volunteers:
        if vol.get("birth_date"):
            from dateutil import parser
            bd = parser.parse(vol["birth_date"])
            if bd.month == now.month:
                birthdays.append({"name": vol["name"], "date": bd.day})
    
    return {
        "total_schedules": schedules_count,
        "active_volunteers": volunteers_count,
        "total_songs": songs_count,
        "birthdays_this_month": birthdays
    }

@api_router.get("/dashboard/top-songs")
async def get_top_songs(current_user: dict = Depends(require_admin)):
    songs = await db.songs.find({}, {"_id": 0}).sort("play_count", -1).limit(10).to_list(10)
    return songs

@api_router.get("/dashboard/burnout-alert")
async def get_burnout_alert(current_user: dict = Depends(require_admin)):
    all_schedules = await db.schedules.find({}, {"_id": 0}).sort("date", -1).to_list(1000)
    
    volunteer_participation = {}
    for schedule in all_schedules:
        members = await db.schedule_members.find({"schedule_id": schedule["id"]}, {"_id": 0}).to_list(1000)
        for member in members:
            vol_id = member["volunteer_id"]
            if vol_id not in volunteer_participation:
                volunteer_participation[vol_id] = {"name": member["volunteer_name"], "dates": []}
            volunteer_participation[vol_id]["dates"].append(schedule["date"])
    
    burnout_list = []
    for vol_id, data in volunteer_participation.items():
        if len(data["dates"]) >= 4:
            burnout_list.append({"volunteer_id": vol_id, "name": data["name"], "consecutive_schedules": len(data["dates"])})
    
    return burnout_list

@api_router.post("/notifications/send")
async def send_notification(notif: NotificationRequest, current_user: dict = Depends(require_admin)):
    result = {"email_sent": False, "sms_sent": False}
    
    if notif.channel in ["email", "both"] and notif.recipient_email:
        resend.api_key = os.environ.get("RESEND_API_KEY", "")
        if resend.api_key:
            try:
                params = {
                    "from": os.environ.get("SENDER_EMAIL", "onboarding@resend.dev"),
                    "to": [notif.recipient_email],
                    "subject": notif.subject,
                    "html": f"<p>{notif.message}</p>"
                }
                email = await asyncio.to_thread(resend.Emails.send, params)
                result["email_sent"] = True
            except Exception as e:
                result["email_error"] = str(e)
    
    if notif.channel in ["sms", "both"] and notif.recipient_phone:
        pass
    
    notif_doc = notif.model_dump()
    notif_doc["id"] = str(uuid.uuid4())
    notif_doc["sent_at"] = datetime.now(timezone.utc)
    notif_doc["sent_by"] = current_user["id"]
    notif_doc["result"] = result
    await db.notifications.insert_one(notif_doc)
    
    return result

@api_router.post("/chat/messages")
async def send_chat_message(message: ChatMessageCreate, current_user: dict = Depends(get_current_user)):
    msg_doc = {
        "id": str(uuid.uuid4()),
        "from_user_id": current_user["id"],
        "from_user_name": current_user["name"],
        "to_user_id": message.to_user_id,
        "message": message.message,
        "read": False,
        "timestamp": datetime.now(timezone.utc)
    }
    await db.chat_messages.insert_one(msg_doc)
    msg_doc.pop("_id", None)
    return msg_doc

@api_router.get("/chat/messages/{other_user_id}")
async def get_chat_messages(other_user_id: str, current_user: dict = Depends(get_current_user)):
    messages = await db.chat_messages.find(
        {
            "$or": [
                {"from_user_id": current_user["id"], "to_user_id": other_user_id},
                {"from_user_id": other_user_id, "to_user_id": current_user["id"]}
            ]
        },
        {"_id": 0}
    ).sort("timestamp", 1).to_list(1000)
    return messages

@api_router.post("/volunteers/{volunteer_id}/upload-photo")
async def upload_volunteer_photo(volunteer_id: str, file: UploadFile = File(...), current_user: dict = Depends(require_admin)):
    contents = await file.read()
    base64_image = base64.b64encode(contents).decode('utf-8')
    photo_url = f"data:{file.content_type};base64,{base64_image}"
    
    await db.volunteers.update_one(
        {"id": volunteer_id},
        {"$set": {"photo_url": photo_url}}
    )
    
    return {"photo_url": photo_url}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    await db.users.create_index("email", unique=True)
    await db.volunteers.create_index("id", unique=True)
    await db.songs.create_index("id", unique=True)
    await db.schedules.create_index("id", unique=True)
    await db.schedule_members.create_index("id", unique=True)
    
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@redmusic.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@2026")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hashed,
            "name": "Administrador",
            "role": "Administrador",
            "created_at": datetime.now(timezone.utc)
        })
        logger.info(f"Admin user created: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )
        logger.info(f"Admin password updated")
    
    Path("/app/memory").mkdir(exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write("# Test Credentials\n\n")
        f.write("## Admin Account\n")
        f.write(f"- Email: {admin_email}\n")
        f.write(f"- Password: {admin_password}\n")
        f.write(f"- Role: Administrador\n\n")
        f.write("## Auth Endpoints\n")
        f.write("- POST /api/auth/register\n")
        f.write("- POST /api/auth/login\n")
        f.write("- POST /api/auth/logout\n")
        f.write("- GET /api/auth/me\n")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
