from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def home():
    return {
        "message": "Welcome to Jest Agent 🚀"
    }


@router.get("/about")
def about():
    return {
        "project": "Jest Agent",
        "version": "0.1.0"
    }