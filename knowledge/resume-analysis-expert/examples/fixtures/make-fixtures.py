"""Generate SYNTHETIC resumes for tests (ADR 0004: never use real resumes).
Run from this folder: python3 -I make-fixtures.py   (needs reportlab and python-docx)"""
from reportlab.lib.pagesizes import LETTER
from reportlab.pdfgen import canvas
import docx

LINES = [
    "Jordan Example", "Orlando, FL", "",
    "EXPERIENCE",
    "Senior Financial Analyst, Example Resorts, Orlando FL  Jan 2022 - Present",
    "- Built driver-based forecast in Excel and Adaptive Planning for $40M business unit",
    "- Led monthly variance analysis and close reporting",
    "Staff Accountant, Example Bank, Lake Mary FL  Jun 2019 - Mar 2022",
    "- Reconciled 120 GL accounts monthly under GAAP",
    "", "EDUCATION", "B.S. Finance, University of Central Florida, 2019",
    "", "CERTIFICATIONS", "CFA Level II Candidate",
    "", "SKILLS", "Excel (VBA, Power Query), SQL, Power BI, SAP, Financial modeling",
]
c = canvas.Canvas("synthetic-resume.pdf", pagesize=LETTER)
y = 740
for line in LINES:
    c.drawString(72, y, line); y -= 16
c.save()
d = docx.Document()
for line in LINES:
    d.add_paragraph(line)
d.save("synthetic-resume.docx")
print("wrote synthetic-resume.pdf and synthetic-resume.docx")
