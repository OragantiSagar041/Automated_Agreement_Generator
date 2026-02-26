from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.responses import Response
from .. import database, schemas
from ..services.ai_service import ai_engine
from bson import ObjectId
from datetime import datetime, date
import tempfile
import io
from htmldocx import HtmlToDocx
from docx import Document

router = APIRouter(
    prefix="/letters",
    tags=["letters"]
)

@router.post("/generate", response_model=schemas.LetterResponse)
def generate_letter(request: schemas.LetterRequest, db = Depends(database.get_db)):
    if not ObjectId.is_valid(request.employee_id):
        raise HTTPException(status_code=400, detail="Invalid ObjectId")

    # 1. Fetch Employee Data
    employee = db.companies.find_one({"_id": ObjectId(request.employee_id)})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # 2. Fetch Payroll Data (From Embedded Compensation)
    comp = employee.get("compensation", {})
    
    data_context = {
        "name": employee.get("name"),
        "company_name": request.company_name,
        "percentage": comp.get("percentage", 0.0),
        "address": employee.get("address", ""),
        "joining_date": employee.get("joining_date", date.today().strftime('%Y-%m-%d')),
        "replacement": employee.get("replacement", 60),
        "invoice_post_joining": employee.get("invoice_post_joining", 45),
        "signature": employee.get("signature", "Authorized Signatory")
    }
    
    # Add Current Date for the Letter Header
    data_context["current_date"] = date.today().strftime('%Y-%m-%d')

    # 4. Call AI Service
    generated_text = ai_engine.generate_letter(data_context, request.letter_type)
    
    # 5. Save History
    new_letter = {
        "employee_id": ObjectId(request.employee_id), # Link to employee
        "emp_id": employee.get("emp_id"), # Store human readable ID too
        "letter_type": request.letter_type,
        "content": generated_text,
        "file_path": None,
        "generated_on": datetime.utcnow()
    }
    db.generated_agreements.insert_one(new_letter)

    return {"content": generated_text, "file_path": None}

@router.post("/download-docx")
def download_docx(html_content: str = Body(..., embed=True)):
    # Convert HTML to DOCX
    document = Document()
    new_parser = HtmlToDocx()
    
    # Simple strip out <html>, <body> if present
    content_to_parse = html_content
    # The HtmlToDocx library handles standard HTML fairly well
    new_parser.add_html_to_document(content_to_parse, document)
    
    doc_io = io.BytesIO()
    document.save(doc_io)
    doc_io.seek(0)
    
    return Response(
        content=doc_io.read(),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": "attachment; filename=Agreement.docx"}
    )
