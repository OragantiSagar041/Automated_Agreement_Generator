import fitz
doc = fitz.open('C:/Users/sagar/Downloads/Automated_Agreement_generator/agreement_letter/DYNAPIX Digital Media agreement.pdf')
page = doc[0]
text_instances = page.get_text("dict")["blocks"]
for block in text_instances:
    if "lines" in block:
        for line in block["lines"]:
            for span in line["spans"]:
                if span["text"].strip():
                    print(f"Text: {span['text'][:30]} | Origin: {span['origin']} | Size: {span['size']:.1f}")
                    break
            break
