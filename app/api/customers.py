from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.repositories.customer_repository import CustomerRepository
from app.schemas.customer import CustomerCreate, CustomerUpdate

router = APIRouter(prefix="/customers", tags=["Customers"])

repository = CustomerRepository()


@router.post("/")
def create_customer(
    customer: CustomerCreate,
    db: Session = Depends(get_db),
):
    db_customer = repository.create(db, customer)

    return {
        "id": db_customer.id,
        "message": "مشتری با موفقیت ثبت شد."
    }


@router.get("/")
def get_customers(
    db: Session = Depends(get_db),
):
    return repository.get_all(db)


@router.get("/{customer_id}")
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
):
    customer = repository.get_by_id(db, customer_id)

    if customer is None:
        return {
            "message": "مشتری پیدا نشد."
        }

    return customer


@router.put("/{customer_id}")
def update_customer(
    customer_id: int,
    customer: CustomerUpdate,
    db: Session = Depends(get_db),
):
    updated_customer = repository.update(db, customer_id, customer)

    if updated_customer is None:
        return {
            "message": "مشتری پیدا نشد."
        }

    return {
        "message": "مشتری با موفقیت ویرایش شد."
    }


@router.delete("/{customer_id}")
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
):
    deleted = repository.delete(db, customer_id)

    if not deleted:
        return {
            "message": "مشتری پیدا نشد."
        }

    return {
        "message": "مشتری با موفقیت حذف شد."
    }