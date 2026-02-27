import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { API_URL } from '../config';

const InputGroup = ({ label, name, type = "text", placeholder, value, onChange, disabled, required = false, options = null, error = false }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{
            fontSize: '0.8rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontWeight: '700',
            color: 'var(--text-muted)'
        }}>
            {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
        {options ? (
            <div style={{ position: 'relative' }}>
                <select
                    name={name}
                    value={value}
                    onChange={onChange}
                    style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        color: 'var(--text-primary)',
                        fontSize: '1rem',
                        outline: 'none',
                        cursor: 'pointer',
                        appearance: 'none',
                        transition: 'all 0.2s'
                    }}
                >
                    {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }}>
                    ▼
                </div>
            </div>
        ) : (
            <input
                type={type}
                name={name}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                disabled={disabled}
                required={required}
                autoComplete="off"
                style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: disabled ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                    border: error ? '2px solid #ef4444' : '1px solid var(--border-color)',
                    borderRadius: '12px',
                    color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'all 0.2s',
                    cursor: disabled ? 'not-allowed' : 'text'
                }}
                onFocus={(e) => { if (!disabled && !error) { e.target.style.borderColor = 'var(--accent-color)'; e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)' } }}
                onBlur={(e) => { if (!error) e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none' }}
            />
        )}
    </div>
);

const AddEmployeeModal = ({ onClose, onSave, initialData }) => {
    const [formData, setFormData] = useState(() => {
        if (initialData) {
            // Split existing signature into name + designation
            const existingSig = initialData.signature || '';
            const sigParts = existingSig.includes(' - ') ? existingSig.split(' - ') : [existingSig, ''];

            // Extract percentage from compensation object (API nests it there)
            const pct = initialData.compensation?.percentage ?? initialData.percentage ?? 0;

            // Format joining_date for date input (needs YYYY-MM-DD)
            let jd = initialData.joining_date || '';
            if (jd && jd.includes('T')) jd = jd.split('T')[0]; // strip time part

            // Only pick form-relevant fields — NOT id, status, compensation, created_at
            return {
                emp_id: initialData.emp_id || '',
                name: initialData.name || '',
                email: initialData.email || '',
                percentage: pct,
                joining_date: jd,
                address: initialData.address || '',
                replacement: initialData.replacement || '',
                invoice_post_joining: initialData.invoice_post_joining || '',
                sig_name: sigParts[0]?.trim() || '',
                sig_designation: sigParts[1]?.trim() || '',
            };
        }
        return {
            emp_id: '',
            name: '',
            email: '',
            percentage: '',
            joining_date: '',
            address: '',
            replacement: '',
            sig_name: '',
            sig_designation: '',
            invoice_post_joining: ''
        };
    });

    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        let { name, value } = e.target;

        if (name === 'email') {
            const lowerVal = value.toLowerCase();
            const dotComIndex = lowerVal.indexOf('.com');
            if (dotComIndex !== -1 && value.length > dotComIndex + 4) {
                value = value.substring(0, dotComIndex + 4);
            }
        }

        // Name field: letters & spaces only, auto-capitalize first letter of each word
        if (name === 'name') {
            value = value.replace(/[^a-zA-Z\s]/g, ''); // strip numbers & special chars
            if (value.length > 0) {
                value = value.replace(/\b\w/g, c => c.toUpperCase()); // capitalize each word
            }
        }

        // sig_name: letters & spaces only, auto-capitalize
        if (name === 'sig_name') {
            value = value.replace(/[^a-zA-Z\s]/g, '');
            if (value.length > 0) {
                value = value.replace(/\b\w/g, c => c.toUpperCase());
            }
        }

        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Combine sig_name + sig_designation into signature field
        const sigName = formData.sig_name?.trim() || '';
        const sigDesig = formData.sig_designation?.trim() || '';
        const signature = sigDesig ? `${sigName} - ${sigDesig}` : sigName;

        // Send ONLY the fields the backend's EmployeeCreate schema expects
        // Do NOT send id, status, compensation, created_at etc.
        const payload = {
            emp_id: formData.emp_id || '',
            name: formData.name || '',
            email: formData.email || '',
            percentage: formData.percentage ? parseFloat(formData.percentage) : 0,
            joining_date: formData.joining_date || null,
            address: formData.address || '',
            replacement: formData.replacement || '',
            invoice_post_joining: formData.invoice_post_joining || '',
            signature,
        };
        onSave(payload);
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'var(--modal-overlay)',
            backdropFilter: 'blur(10px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 2000
        }}>
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                style={{
                    background: 'var(--card-bg)',
                    padding: '3rem',
                    borderRadius: '32px',
                    width: '800px',
                    maxWidth: '95vw',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    border: '1px solid var(--border-color)',
                    boxShadow: 'var(--card-shadow)'
                }}
            >
                {/* Header */}
                <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
                    <h2 style={{
                        margin: 0,
                        fontSize: '2.2rem',
                        fontWeight: '800',
                        color: 'var(--text-primary)',
                        marginBottom: '0.5rem'
                    }}>
                        {initialData ? 'Update Company Details' : 'Add New Company'}
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '1rem', fontWeight: '500' }}>
                        {initialData ? 'Refine details for business agreement.' : 'Onboard a new company for agreement generation.'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '2.5rem' }}>
                    <div style={{ background: 'var(--bg-primary)', padding: '2rem', borderRadius: '24px', border: '1px solid var(--border-color)' }}>
                        <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-primary)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '1.4rem' }}>🏢</span>
                            <span style={{ borderBottom: '2px solid var(--accent-color)', paddingBottom: '4px', fontWeight: 'bold' }}>Company Information</span>
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem', alignItems: 'end' }}>
                                <div style={{ gridColumn: 'span 4' }}>
                                    <InputGroup label="Partner ID (Optional)" name="emp_id" placeholder="Optional — auto-generated" value={formData.emp_id} onChange={handleChange} />
                                </div>
                                <div style={{ gridColumn: 'span 8' }}>
                                    <InputGroup label="Company Name" name="name" placeholder="e.g. Acme Corp" value={formData.name} onChange={handleChange} required />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem', alignItems: 'end' }}>
                                <div style={{ gridColumn: 'span 8' }}>
                                    <InputGroup label="Email Address" name="email" type="email" placeholder="contact@acme.com" value={formData.email} onChange={handleChange} required />
                                </div>
                                <div style={{ gridColumn: 'span 4' }}>
                                    <InputGroup label="Revenue Share Percentage (%)" name="percentage" type="number" placeholder="20" value={formData.percentage} onChange={handleChange} required />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem', alignItems: 'end', marginTop: '1.5rem' }}>
                                <div style={{ gridColumn: 'span 12' }}>
                                    <InputGroup label="Address" name="address" placeholder="e.g. 123 Main St, New York..." value={formData.address} onChange={handleChange} required />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem', alignItems: 'end', marginTop: '1.5rem' }}>
                                <div style={{ gridColumn: 'span 4' }}>
                                    <InputGroup label="Agreement Date" name="joining_date" type="date" value={formData.joining_date} onChange={handleChange} required />
                                </div>
                                <div style={{ gridColumn: 'span 4' }}>
                                    <InputGroup label="Replacement (Days)" name="replacement" type="number" placeholder="e.g. 60" value={formData.replacement} onChange={handleChange} required />
                                </div>
                                <div style={{ gridColumn: 'span 4' }}>
                                    <InputGroup label="Invoice Post Joining (Days)" name="invoice_post_joining" type="number" placeholder="e.g. 45" value={formData.invoice_post_joining} onChange={handleChange} required />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem', alignItems: 'end', marginTop: '1.5rem' }}>
                                <div style={{ gridColumn: 'span 6' }}>
                                    <InputGroup label="Signatory Name" name="sig_name" placeholder="e.g. Navya S" value={formData.sig_name} onChange={handleChange} required />
                                </div>
                                <div style={{ gridColumn: 'span 6' }}>
                                    <InputGroup label="Designation" name="sig_designation" placeholder="e.g. Managing Director" value={formData.sig_designation} onChange={handleChange} required />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', paddingTop: '2rem', borderTop: '2px solid var(--border-color)' }}>
                        <button type="button" onClick={onClose} style={{
                            flex: 1,
                            padding: '16px',
                            background: 'transparent',
                            border: '2px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            borderRadius: '16px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)' }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent' }}
                        >
                            Cancel
                        </button>
                        <button type="submit" style={{
                            flex: 2,
                            padding: '16px',
                            background: 'var(--accent-color)',
                            border: 'none',
                            color: 'white',
                            fontSize: '1.1rem',
                            fontWeight: '800',
                            borderRadius: '16px',
                            cursor: 'pointer',
                            boxShadow: '0 8px 20px -5px rgba(99, 102, 241, 0.4)',
                            transition: 'transform 0.1s, background 0.2s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                        }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'var(--accent-hover)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'var(--accent-color)'}
                            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            {initialData ? 'Update Partner' : 'Add Partner'}
                            <span style={{ fontSize: '1.3rem' }}>→</span>
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default AddEmployeeModal;
