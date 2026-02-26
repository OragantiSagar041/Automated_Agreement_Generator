from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from fastapi.responses import StreamingResponse
from typing import List
from .. import database, schemas
from bson import ObjectId
from datetime import datetime, date
import pandas as pd
import io

router = APIRouter(
    prefix="/employees",
    tags=["employees"]
)

# Helper to fix ObjectId in response if not using Pydantic v2 alias generator fully or for manual dicts
def fix_id(doc):
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
    return doc

@router.post("/", response_model=schemas.Employee)
def create_employee(employee: schemas.EmployeeCreate, db = Depends(database.get_db)):
    # Check if email exists
    if db.companies.find_one({"email": employee.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    emp_data = employee.dict()
    percentage = emp_data.pop('percentage', 0.0)

    # Fix: Convert date objects to datetime for MongoDB
    # MongoDB cannot store 'date' objects directly, only 'datetime'
    if emp_data.get('joining_date') and isinstance(emp_data['joining_date'], date):
        d = emp_data['joining_date']
        # Check if it's already a datetime (which is a subclass of date), if so, leave it (or ensure encoding)
        if not isinstance(d, datetime):
            emp_data['joining_date'] = datetime(d.year, d.month, d.day)
            print(f"Converted joining_date: {emp_data['joining_date']} (type: {type(emp_data['joining_date'])})")
    
    # Auto-generate emp_id if missing
    if not emp_data.get('emp_id'):
        # Simple sequence strategy: Count + 1 (Note: Not concurrency safe but okay for MVP)
        count = db.companies.count_documents({})
        emp_data['emp_id'] = f"EMP{count + 1:03d}" 

    # Construct Document
    new_employee_doc = {
        **emp_data,
        "status": "Pending",
        "created_at": datetime.utcnow(),
        "compensation": {
            "percentage": percentage
        }
    }
    
    # Insert
    result = db.companies.insert_one(new_employee_doc)
    new_employee_doc["_id"] = result.inserted_id
    
    return fix_id(new_employee_doc)

@router.get("/", response_model=List[schemas.Employee])
def read_employees(skip: int = 0, limit: int = 100, db = Depends(database.get_db)):
    cursor = db.companies.find().skip(skip).limit(limit)
    employees = [fix_id(doc) for doc in cursor]
    return employees

@router.get("/template")
def download_template():
    """
    Download Excel Template for Bulk Import.
    """
    headers = [
        "Employee ID", "Full Name", "Email Address", "Designation", 
        "Department", "Joining Date", "Location", "Employment Type", 
        "Annual CTC", "Basic Salary"
    ]
    df = pd.DataFrame(columns=headers)
    stream = io.BytesIO()
    df.to_excel(stream, index=False, engine='openpyxl')
    stream.seek(0)
    
    return StreamingResponse(
        stream, 
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
        headers={"Content-Disposition": "attachment; filename=Employee_Import_Template.xlsx"}
    )

@router.get("/{employee_id}", response_model=schemas.Employee)
def read_employee(employee_id: str, db = Depends(database.get_db)):
    if not ObjectId.is_valid(employee_id):
        raise HTTPException(status_code=400, detail="Invalid ObjectId")
        
    employee = db.companies.find_one({"_id": ObjectId(employee_id)})
    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    return fix_id(employee)

@router.delete("/{employee_id}", status_code=204)
def delete_employee(employee_id: str, db = Depends(database.get_db)):
    if not ObjectId.is_valid(employee_id):
        raise HTTPException(status_code=400, detail="Invalid ObjectId")

    result = db.companies.delete_one({"_id": ObjectId(employee_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Cascade delete generated letters
    db.generated_agreements.delete_many({"employee_id": ObjectId(employee_id)})
    return

@router.put("/{employee_id}", response_model=schemas.Employee)
def update_employee(employee_id: str, employee_update: schemas.EmployeeCreate, db = Depends(database.get_db)):
    if not ObjectId.is_valid(employee_id):
        raise HTTPException(status_code=400, detail="Invalid ObjectId")

    existing = db.companies.find_one({"_id": ObjectId(employee_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Employee not found")

    update_data = employee_update.dict()
    new_percentage = update_data.pop('percentage', None)

    # Handle Compensation Update if percentage changed
    if new_percentage is not None and new_percentage != existing.get("compensation", {}).get("percentage"):
        update_data["compensation"] = {
            "percentage": new_percentage
        }
    
    # Perform Update
    db.companies.update_one(
        {"_id": ObjectId(employee_id)},
        {"$set": update_data}
    )
    
    updated_doc = db.companies.find_one({"_id": ObjectId(employee_id)})
    return fix_id(updated_doc)

@router.post("/upload")
async def upload_employees_bulk(file: UploadFile = File(...), db = Depends(database.get_db)):
    """
    Bulk Upload Employees to MongoDB.
    """
    try:
        content = await file.read()
        if file.filename.endswith('.xlsx'):
            df = pd.read_excel(io.BytesIO(content))
        elif file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail="Invalid file format")
        
        # Normalize Headers
        df.columns = [str(c).lower().strip().replace(' ', '_') for c in df.columns]
        
        def find_col(aliases):
            for alias in aliases:
                if alias in df.columns: return alias
            return None

        success_count = 0
        errors = []

        for index, row in df.iterrows():
            try:
                # 1. Email
                col_email = find_col(['email', 'email_id', 'email_address'])
                email = row.get(col_email)
                if pd.isna(email) or not email:
                    errors.append(f"Row {index+2}: Email missing")
                    continue
                
                if db.companies.find_one({"email": email}):
                    errors.append(f"Skipped {email}: Exists")
                    continue

                # 2. Basic Fields
                col_name = find_col(['name', 'full_name'])
                name = row.get(col_name, "Unknown")
                
                col_desg = find_col(['designation', 'role'])
                desg = row.get(col_desg, "TBD")
                
                col_dept = find_col(['department'])
                dept = row.get(col_dept, "General")

                # 3. Joining Date
                col_date = find_col(['joining_date', 'doj'])
                jd = row.get(col_date)
                try:
                    j_date = pd.to_datetime(jd).strftime("%Y-%m-%d") if not pd.isna(jd) else datetime.now().strftime("%Y-%m-%d")
                except:
                    j_date = datetime.now().strftime("%Y-%m-%d")

                # 4. ID
                col_id = find_col(['emp_id'])
                emp_id = row.get(col_id)
                if pd.isna(emp_id) or not emp_id:
                    count = db.companies.count_documents({})
                    emp_id = f"EMP{count + 1 + success_count:03d}" 

                # 5. CTC & Compensation
                col_ctc = find_col(['ctc', 'annual_ctc'])
                ctc_val = row.get(col_ctc, 0)
                ctc = float(ctc_val) if not pd.isna(ctc_val) else 0

                basic = ctc * 0.5
                hra = basic * 0.5
                pf = basic * 0.12
                pt = 2400
                special = ctc - (basic + hra + pf)
                if special < 0: special = 0

                doc = {
                    "emp_id": str(emp_id),
                    "name": name,
                    "email": email,
                    "designation": desg,
                    "department": dept,
                    "joining_date": j_date, # storing as string for simplicity in bulk, or convert to datetime
                    "location": row.get('location', 'Remote'),
                    "employment_type": row.get('employment_type', 'Full Time'),
                    "status": "Pending",
                    "created_at": datetime.utcnow(),
                    "compensation": {
                        "ctc": ctc,
                        "basic_salary": round(basic, 2),
                        "hra": round(hra, 2),
                        "allowances": round(special, 2),
                        "deductions": round(pf + pt, 2),
                        "net_salary": ctc
                    }
                }
                
                db.companies.insert_one(doc)
                success_count += 1

            except Exception as e:
                errors.append(f"Row {index+2}: {str(e)}")
        
        return {"status": "success", "imported_count": success_count, "errors": errors}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
