from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def home():
    return {
        "message": "Welcome to AI Stylist 🚀"
    }


@router.get("/about")
def about():
    return {
        "project": "AI Stylist",
        "version": "0.1.0"
    }