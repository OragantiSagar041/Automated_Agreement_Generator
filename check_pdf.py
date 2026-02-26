import fitz
with open('pdf_info.txt', 'w') as f:
    doc = fitz.open('C:/Users/sagar/Downloads/Automated_Agreement_generator/agreement_letter/DYNAPIX Digital Media agreement.pdf')
    f.write(f"Total Pages: {len(doc)}\n")
    page = doc[0]
    blocks = page.get_text('dict')['blocks']
    for b in blocks:
        if 'lines' in b:
            for l in b['lines']:
                for s in l['spans']:
                    f.write(f"Text: '{s['text'][:50]}', Size={s['size']:.1f}, Font={s['font']}, Origin={s['origin']}\n")
