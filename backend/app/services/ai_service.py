import requests
import json

class AIService:
    def __init__(self):
        pass

    def generate_letter(self, employee_data, letter_type):
        """
        Generates the exact agreement template as requested without AI hallucination.
        """
        return self._fallback_template(employee_data, letter_type)

    def _fallback_template(self, data, letter_type):
        """
        The EXACT premium agreement template based on the provided PDF format.
        """
        company = data.get('company_name', 'Arah Infotech Pvt Ltd')
        partner_company = data.get('name', 'Partner Company')
        percentage = data.get('percentage', 0)
        address = data.get('address', 'Partner Address')
        joining_date = data.get('joining_date')
        if not joining_date:
            joining_date = data.get('current_date', '')
        
        # If the date includes time (from a raw datetime), cleanly format it
        if joining_date and " " in str(joining_date):
            joining_date = str(joining_date).split(" ")[0]
            
        replacement = data.get('replacement')
        if not replacement:
            replacement = 60
            
        invoice_post_joining = data.get('invoice_post_joining')
        if not invoice_post_joining:
            invoice_post_joining = 45
            
        signature = data.get('signature')
        if not signature:
            signature = 'Authorized Signatory'
        
        return f"""
        <div style="font-family: 'Arial', sans-serif; color: #000; line-height: 1.6; max-width: 800px; margin: 0 auto; text-align: justify; padding-bottom: 50px;">
            <h3 style="text-align: center; text-decoration: underline;">AGREEMENT B/W {company.upper()} - {partner_company.upper()}</h3>
            
            <p>This Agreement is made and entered into on <strong>{joining_date}</strong> by and between:</p>
            
            <p><strong>{company.upper()}</strong><br>
            (Hereinafter referred to as "{company}" or the "Service Provider") AND</p>
            
            <p><strong>{partner_company.upper()}</strong><br>
            {address}<br>
            "Parties."</p>

            <h4 style="text-decoration: underline;">RECITALS</h4>
            <p>WHEREAS, the Client is engaged in the field of Information Technology and Services;</p>
            <p>WHEREAS, {company} is engaged in human resource management and consultancy services, including recruitment, training, and business process outsourcing;</p>
            <p>WHEREAS, the Client desires to avail recruitment services, and {company} has represented that it possesses the skills, expertise, and resources to provide such services;</p>
            <p>NOW, THEREFORE, in consideration of the mutual covenants herein, the Parties agree as follows:</p>

            <h4 style="text-decoration: underline;">1. CONTRACT TERM</h4>
            <ul>
                <li>This Agreement shall remain valid for 12 months from the date of signing unless terminated earlier as per Clause 11.</li>
                <li>Upon expiry, this Agreement may be extended by mutual written consent.</li>
                <li>The Client reserves the right to appoint multiple vendors. {company} acknowledges that its appointment is non-exclusive.</li>
            </ul>

            <h4 style="text-decoration: underline;">2. PROFESSIONAL FEES</h4>
            <ul>
                <li>The Client shall pay {company} professional charges as follows:</li>
                <li>All Levels – {percentage}% of Annual CTC (Applicable GST extra).</li>
                <li>Annual CTC shall include Basic Salary, HRA, PF, LTA, Medical, Conveyance, and other fixed allowances. It shall exclude sales incentives, performance bonuses, and stock options.</li>
            </ul>

            <h4 style="text-decoration: underline;">3. SERVICE METHODOLOGY</h4>
            <ul>
                <li>The Client shall share requirements via email/telephone.</li>
                <li>{company} shall confirm within 7 working days its ability to provide candidates.</li>
                <li>{company} shall shortlist and submit resumes matching the Client’s requirements.</li>
                <li>The Client shall review resumes and provide feedback within 2 working days. During this time, {company} shall not propose the same candidates elsewhere.</li>
                <li>If the Client confirms a candidate already exists in its database, no fee shall apply.</li>
                <li>{company} shall coordinate interviews and follow up until candidate joining.</li>
                <li>If a candidate is hired within 3 months of initial submission (including via Client advertisements), service charges shall apply.</li>
            </ul>

            <h4 style="text-decoration: underline;">4. INVOICES & PAYMENT TERMS</h4>
            <ul>
                <li>On confirmation of candidate joining, {company} shall raise an invoice {invoice_post_joining} days post joining.</li>
                <li>The Client shall process payment within 15 days of invoice date, after deduction of applicable taxes.</li>
                <li>Fees are payable irrespective of whether the candidate is on trial or probation.</li>
                <li>No payment is due if a candidate absconds or resigns within 90 days of joining.</li>
                <li>In case of duplicate referrals, payment shall be made to the vendor whose reference was received first.</li>
            </ul>

            <h4 style="text-decoration: underline;">5. REPLACEMENT GUARANTEE</h4>
            <ul>
                <li>If a candidate absconds in {replacement} Days replacement is applicable and {company} shall provide a replacement within 10 working days.</li>
                <li>If the candidate is terminated due to misconduct, breach of confidentiality, or non-performance by the company after 60 days, {company} shall not provide a replacement, but, if he is terminated in 60 Days {company} will provide replacement.</li>
                <li>If replacement is not provided, the professional fee shall be refunded or adjusted against future invoices.</li>
                <li>This guarantee does not apply if the Client terminates for business reasons.</li>
                <li>The Client shall provide 1-week prior notice to {company} before termination for this guarantee to apply.</li>
            </ul>

            <h4 style="text-decoration: underline;">6. RESPONSIBILITIES OF {company.upper()}</h4>
            <ul>
                <li>Deliver services diligently and promote the Client’s interests.</li>
                <li>Not forward selected candidates to other clients until released by the Client.</li>
                <li>Arrange interviews at mutually convenient times.</li>
                <li>Notify the Client if a proposed candidate accepts another assignment.</li>
            </ul>

            <h4 style="text-decoration: underline;">7. CONFIDENTIALITY & NON-SOLICITATION</h4>
            <ul>
                <li>{company} shall not disclose Client’s confidential information or business practices.</li>
                <li>{company} shall not solicit or influence Client employees.</li>
                <li>This clause survives the termination of this Agreement.</li>
            </ul>

            <h4 style="text-decoration: underline;">8. NON-ASSIGNMENT</h4>
            <ul>
                <li>This Agreement shall not be assigned by {company} to any third party without prior written consent of the Client.</li>
            </ul>

            <h4 style="text-decoration: underline;">9. DISPUTE RESOLUTION & ARBITRATION</h4>
            <ul>
                <li>Any dispute shall be referred to arbitration under the Arbitration and Conciliation Act, 1996.</li>
                <li>A sole arbitrator shall be appointed with mutual consent.</li>
                <li>The arbitration shall be conducted in Hyderabad, in the English language.</li>
            </ul>

            <h4 style="text-decoration: underline;">10. GOVERNING LAW & JURISDICTION</h4>
            <ul>
                <li>This Agreement shall be governed by the laws of India. Courts at Hyderabad and Secunderabad shall have exclusive jurisdiction.</li>
            </ul>

            <h4 style="text-decoration: underline;">11. TERMINATION</h4>
            <ul>
                <li>Either Party may terminate this Agreement with 30 days’ prior written notice.</li>
                <li>The Client may terminate immediately without notice if {company} breaches terms.</li>
                <li>No service fee shall be payable for placements made after termination unless the Agreement is renewed.</li>
            </ul>

            <h4 style="text-decoration: underline;">12. ENTIRE AGREEMENT</h4>
            <ul>
                <li>This Agreement constitutes the entire understanding between the Parties and supersedes all prior discussions. Any amendments shall be in writing and signed by both Parties.</li>
            </ul>

            <br>
            <p>IN WITNESS WHEREOF, the Parties hereto have executed this Agreement on the date first above written.</p>
            
            <table style="width: 100%; margin-top: 30px; border: none;">
                <tbody>
                    <tr>
                        <td style="text-align: left; width: 50%; border: none; vertical-align: top;">
                            <strong>For {company.upper()}</strong><br><br><br><br>
                            Authorized Signatory
                        </td>
                        <td style="text-align: left; width: 50%; border: none; vertical-align: top;">
                            <strong>For {partner_company.upper()}</strong><br><br><br><br>
                            {signature}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        """

# Singleton instance
ai_engine = AIService()
