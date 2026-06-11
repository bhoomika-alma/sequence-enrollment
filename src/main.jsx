import { useState } from "react";

const WEBHOOK_URL = "https://almabase.app.n8n.cloud/webhook/almabase-enroll";

const S = {
  page: {
    minHeight: "100vh",
    background: "#F7F8FA",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Inter', -apple-system, sans-serif",
    padding: "24px",
  },
  card: {
    background: "#fff",
    borderRadius: "16px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.06)",
    padding: "40px 44px",
    width: "100%",
    maxWidth: "500px",
  },
  logo: {
    fontSize: "13px",
    fontWeight: "600",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#0957b8",
    marginBottom: "28px",
  },
  heading: { fontSize: "22px", fontWeight: "700", color: "#111", margin: "0 0 4px" },
  sub: { fontSize: "14px", color: "#6B7280", margin: "0 0 32px" },
  fields: { display: "flex", flexDirection: "column", gap: "18px" },
  field: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "13px", fontWeight: "600", color: "#374151", letterSpacing: "0.01em" },
  required: { color: "#0957b8", marginLeft: "2px" },
  input: {
    padding: "10px 14px",
    fontSize: "14px",
    color: "#111",
    background: "#F9FAFB",
    border: "1.5px solid #E5E7EB",
    borderRadius: "8px",
    outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
    width: "100%",
    boxSizing: "border-box",
  },
  inputFocus: { borderColor: "#0957b8", boxShadow: "0 0 0 3px rgba(9,87,184,0.1)", background: "#fff" },
  inputError: { borderColor: "#EF4444", background: "#fff" },
  hint: { fontSize: "12px", color: "#9CA3AF", marginTop: "2px" },
  errorText: { fontSize: "12px", color: "#EF4444", marginTop: "2px" },
  divider: { height: "1px", background: "#F3F4F6", margin: "8px 0" },
  checkGroup: {
    border: "1.5px solid #E5E7EB",
    borderRadius: "8px",
    background: "#F9FAFB",
    overflow: "hidden",
  },
  checkGroupError: { borderColor: "#EF4444" },
  checkItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 14px",
    cursor: "pointer",
    transition: "background 0.1s",
    borderBottom: "1px solid #F3F4F6",
    userSelect: "none",
  },
  checkItemLast: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 14px",
    cursor: "pointer",
    userSelect: "none",
  },
  checkBox: {
    width: "16px",
    height: "16px",
    borderRadius: "4px",
    border: "1.5px solid #D1D5DB",
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "all 0.1s",
  },
  checkBoxChecked: {
    background: "#0957b8",
    borderColor: "#0957b8",
  },
  checkLabel: { fontSize: "13.5px", color: "#374151", lineHeight: "1.4" },
  btn: {
    marginTop: "28px",
    width: "100%",
    padding: "13px",
    fontSize: "15px",
    fontWeight: "600",
    color: "#fff",
    background: "#0957b8",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    letterSpacing: "0.01em",
  },
  btnDisabled: { background: "#93B8E8", cursor: "not-allowed" },
  successBox: {
    marginTop: "20px",
    padding: "14px 16px",
    background: "#F0FDF4",
    border: "1.5px solid #86EFAC",
    borderRadius: "10px",
    fontSize: "14px",
    color: "#166534",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  errorBox: {
    marginTop: "20px",
    padding: "14px 16px",
    background: "#FEF2F2",
    border: "1.5px solid #FECACA",
    borderRadius: "10px",
    fontSize: "14px",
    color: "#991B1B",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
};

const JOB_TITLES = [
  "Director/VP of Advancement/Development",
  "Associate Director/VP of Advancement/Development",
  "Director of Advancement Services",
  "Director of Alumni Relations/Annual Fund/Community Engagement",
  "Alumni Relations/Annual Fund/Community Engagement Managers/Associate",
  "Others",
];

const TEXT_FIELDS = [
  { key: "repId", label: "HubSpot Rep ID", placeholder: "e.g. 12345678", hint: "Your numeric HubSpot user ID" },
  { key: "segmentId", label: "Segment ID", placeholder: "e.g. 9876543", hint: "The HubSpot contact list ID" },
  { key: "sequenceId", label: "Sequence ID", placeholder: "e.g. 55123", hint: "The HubSpot sequence to enroll into" },
  { key: "sequenceName", label: "Sequence Name", placeholder: "e.g. Q2 Re-engagement", hint: "A readable name for logging" },
];

const EMPTY = { repId: "", segmentId: "", sequenceId: "", sequenceName: "", jobTitles: [] };

export default function App() {
  const [form, setForm] = useState(EMPTY);
  const [focus, setFocus] = useState({});
  const [errors, setErrors] = useState({});
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const setField = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: "" }));
  };

  const toggleTitle = (title) => {
    setForm(f => {
      const exists = f.jobTitles.includes(title);
      return { ...f, jobTitles: exists ? f.jobTitles.filter(t => t !== title) : [...f.jobTitles, title] };
    });
    if (errors.jobTitles) setErrors(e => ({ ...e, jobTitles: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.repId.trim()) e.repId = "Required";
    if (!form.segmentId.trim()) e.segmentId = "Required";
    if (!form.sequenceId.trim()) e.sequenceId = "Required";
    if (!form.sequenceName.trim()) e.sequenceName = "Required";
    if (form.jobTitles.length === 0) e.jobTitles = "Select at least one job title";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const run = async () => {
    if (!validate()) return;
    setRunning(true);
    setStatus(null);
    try {
      await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        mode: "no-cors",
        body: JSON.stringify({
          rep_hs_id: form.repId,
          segment_id: form.segmentId,
          sequence_id: form.sequenceId,
          sequence_name: form.sequenceName,
          job_titles: form.jobTitles,
        }),
      });
      setStatus("success");
      setForm(EMPTY);
    } catch (err) {
      setStatus("error");
      setErrorMsg("Could not reach the workflow. Check your connection and try again.");
    } finally {
      setRunning(false);
    }
  };

  const inputStyle = (key) => ({
    ...S.input,
    ...(focus[key] ? S.inputFocus : {}),
    ...(errors[key] ? S.inputError : {}),
  });

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo}>Almabase</div>
        <h1 style={S.heading}>Enroll into Sequence</h1>
        <p style={S.sub}>Fill in the details below to trigger the enrollment workflow.</p>

        <div style={S.fields}>
          {TEXT_FIELDS.map(({ key, label, placeholder, hint }) => (
            <div key={key} style={S.field}>
              <label style={S.label}>{label}<span style={S.required}>*</span></label>
              <input
                style={inputStyle(key)}
                value={form[key]}
                placeholder={placeholder}
                onChange={e => setField(key, e.target.value)}
                onFocus={() => setFocus(f => ({ ...f, [key]: true }))}
                onBlur={() => setFocus(f => ({ ...f, [key]: false }))}
              />
              {errors[key]
                ? <span style={S.errorText}>{errors[key]}</span>
                : <span style={S.hint}>{hint}</span>}
            </div>
          ))}

          <div style={S.divider} />

          <div style={S.field}>
            <label style={S.label}>
              Job Title<span style={S.required}>*</span>
            </label>
            <div style={{ fontSize: "12px", color: "#9CA3AF", marginBottom: "6px" }}>
              Select all that apply
            </div>
            <div style={{ ...S.checkGroup, ...(errors.jobTitles ? S.checkGroupError : {}) }}>
              {JOB_TITLES.map((title, i) => {
                const checked = form.jobTitles.includes(title);
                const isLast = i === JOB_TITLES.length - 1;
                return (
                  <div
                    key={title}
                    style={{
                      ...(isLast ? S.checkItemLast : S.checkItem),
                      background: checked ? "#EFF6FF" : "transparent",
                    }}
                    onClick={() => toggleTitle(title)}
                  >
                    <div style={{ ...S.checkBox, ...(checked ? S.checkBoxChecked : {}) }}>
                      {checked && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span style={{ ...S.checkLabel, color: checked ? "#1D4ED8" : "#374151", fontWeight: checked ? "500" : "400" }}>
                      {title}
                    </span>
                  </div>
                );
              })}
            </div>
            {errors.jobTitles && <span style={S.errorText}>{errors.jobTitles}</span>}
          </div>
        </div>

        <button
          style={{ ...S.btn, ...(running ? S.btnDisabled : {}) }}
          onClick={run}
          disabled={running}
        >
          {running ? "Triggering workflow…" : "Run Enrollment"}
        </button>

        {status === "success" && (
          <div style={S.successBox}>
            <span>✓</span>
            <span>Workflow triggered — enrollment is running in the background.</span>
          </div>
        )}
        {status === "error" && (
          <div style={S.errorBox}>
            <span>✕</span>
            <span>{errorMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
