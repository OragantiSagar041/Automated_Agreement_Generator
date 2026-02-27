from pydantic import BaseModel, Field, BeforeValidator, EmailStr
from datetime import date
from typing import Optional, List, Annotated

# Helper for MongoDB ObjectId
PyObjectId = Annotated[str, BeforeValidator(str)]

# Employee Schemas
class EmployeeBase(BaseModel):
    emp_id: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None  # Relaxed: not EmailStr, handles old imports with phone numbers
    designation: Optional[str] = None
    department: Optional[str] = None
    joining_date: Optional[date] = None
    location: Optional[str] = "Remote"
    employment_type: Optional[str] = "Full Time"
    address: Optional[str] = ""
    replacement: Optional[str] = ""
    signature: Optional[str] = ""
    invoice_post_joining: Optional[str] = ""

class EmployeeCreate(EmployeeBase):
    percentage: float

class Compensation(BaseModel):
    percentage: float
    
class Employee(EmployeeBase):
    id: Optional[str] = None
    status: Optional[str] = "Pending"
    compensation: Optional[Compensation] = None

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            # Handle ObjectId serialization if needed in custom dumps
        }

# Payroll Schemas (Deprecated/Adapted)
class PayrollBase(BaseModel):
    basic_salary: float
    hra: float
    allowances: float
    deductions: float
    net_salary: float

class PayrollCreate(PayrollBase):
    emp_id: str

class Payroll(PayrollBase):
    id: Optional[str] = None
    emp_id: str

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True

# Letter Schemas
class LetterRequest(BaseModel):
    employee_id: str 
    letter_type: str 
    tone: Optional[str] = "Professional"
    company_name: Optional[str] = "Arah Infotech Pvt Ltd"

    class Config:
        arbitrary_types_allowed = True

class EmailRequest(BaseModel):
    employee_id: str
    letter_content: str
    pdf_base64: str
    custom_message: Optional[str] = None
    subject: Optional[str] = None
    company_name: Optional[str] = "Arah Infotech Pvt Ltd"

    class Config:
        arbitrary_types_allowed = True

class LetterResponse(BaseModel):
    content: str
    file_path: Optional[str] = None
