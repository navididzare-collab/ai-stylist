from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.database.session import get_db
from app.repositories.customer_repository import CustomerRepository
from app.services.recommendation_service import RecommendationService

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])

customer_repository = CustomerRepository()
recommendation_service = RecommendationService()


@router.get("/{customer_id}")
def recommend(
    customer_id: int,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
):
    customer = customer_repository.get_by_id(db, customer_id)

    if customer is None:
        return {"message": "مشتری پیدا نشد."}

    products = recommendation_service.recommend(db, customer)

    return products