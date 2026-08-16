import os
import asyncio
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel
import uvicorn

# Telegram Bot Imports
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton

# Google GenAI SDK Import
from google import genai

# ==========================================================================
# CONFIGURATION
# ==========================================================================
BOT_TOKEN = os.getenv("BOT_TOKEN", "8645952849:AAGxvNpsrX-a2Nf5OKyB-fGDdtqK05OHSxE")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AQ.Ab8RN6ItD3Gg80CPOSTmqXpW-Ff2ywLkhAHJfb2jjD0SJyHAmg")
MINI_APP_URL = os.getenv("MINI_APP_URL", "https://your-vercel-or-ngrok-url.com")

# Initialize Gemini Client
ai_client = genai.Client(api_key=GEMINI_API_KEY)

# Initialize Telegram Bot
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# Initialize FastAPI App
app = FastAPI(title="CRAX AI Mini App Server")

# Mount Static Files (index.html, style.css, app.js in current dir)
app.mount("/static", StaticFiles(directory="."), name="static")

# ==========================================================================
# TELEGRAM BOT HANDLERS
# ==========================================================================
@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    """Отправляет кнопку открытия Mini App"""
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="✨ Открыть CRAX AI App",
                    web_app=WebAppInfo(url=MINI_APP_URL)
                )
            ]
        ]
    )
    await message.answer(
        f"Привет, {message.from_user.first_name}! 👋\n\n"
        "Нажми кнопку ниже, чтобы открыть Mini App с нейросетью Gemini!",
        reply_markup=keyboard
    )

# ==========================================================================
# FASTAPI API ENDPOINTS FOR MINI APP
# ==========================================================================
class ChatRequest(BaseModel):
    message: str
    system_prompt: str = "Ты — умный ИИ-помощник."

@app.get("/", response_class=HTMLResponse)
async def serve_index():
    """Раздаёт главное веб-приложение"""
    with open("index.html", "r", encoding="utf-8") as f:
        return f.read()

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    """Обрабатывает запросы из Mini App и отправляет их в Gemini API"""
    try:
        response = ai_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=req.message,
            config={
                "system_instruction": req.system_prompt
            }
        )
        return JSONResponse({"reply": response.text})
    except Exception as e:
        print(f"Error in Gemini API: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

# ==========================================================================
# MAIN RUNNER
# ==========================================================================
async def main():
    # Запуск сервера FastAPI в отдельной таске
    config = uvicorn.Config(app, host="0.0.0.0", port=8000, log_level="info")
    server = uvicorn.Server(config)
    
    asyncio.create_task(server.serve())
    print("🚀 FastAPI Сервер запущен на http://localhost:8000")
    print("🤖 Запуск Telegram Бота...")
    
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
