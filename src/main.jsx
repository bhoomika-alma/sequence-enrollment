import { useState } from "react";
import { createRoot } from "react-dom/client";

const WEBHOOK_URL = "https://almabase.app.n8n.cloud/webhook/almabase-enroll-v2";

const FONT = "'Playfair Display', Georgia, serif";

// Inject the Playfair Display font + a minimal CSS reset, matching the live site.
const styleEl = document.createElement("style");
styleEl.textContent =
  "@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; }";
document.head.appendChild(styleEl);

const MODULES = [
  "Alumni Networking",
  "Giving / Fundraising",
  "Events",
  "Auctions",
  "Communications",
  "DEP",
  "Full Platform",
];

const MODULE_TITLES = {
  "Alumni Networking": [
    "Director of Alumni Relations",
    "VP Alumni Engagement",
    "Alumni Affairs Manager",
  ],
  "Giving / Fundraising": [
    "Director of Annual Giving",
    "Chief Advancement Officer",
    "VP Development",
  ],
  Events: ["Events Manager", "Director of Events", "Student Affairs Director"],
  Auctions: [
    "Director of Development",
    "Special Events Coordinator",
    "Gala Chair",
  ],
  Communications: [
    "Director of Communications",
    "VP Marketing",
    "Chief Marketing Officer",
  ],
  DEP: [
    "Planned Giving Officer",
    "Major Gifts Officer",
    "Donor Engagement Manager",
  ],
  "Full Platform": ["President", "Chancellor", "Chief Advancement Officer"],
};

const STEPS = ["Sequence", "POC Rules", "Review"];

const SEQUENCE_FIELDS = [
  {
    key: "email",
    label: "Your Email",
    placeholder: "e.g. you@almabase.com",
    hint: "Enter your Slack email — you'll get the workflow-related updates here.",
  },
  { key: "repId", label: "Rep HubSpot User ID", placeholder: "e.g. 12345678" },
  { key: "sequenceId", label: "Sequence ID", placeholder: "e.g. seq_abc123" },
  { key: "segmentId", label: "Segment ID", placeholder: "e.g. ILS_123456" },
  {
    key: "sequenceName",
    label: "Sequence Name",
    placeholder: "e.g. Alumni Networking Q2 2026",
    hint: "Claude uses this to infer the target module.",
  },
  {
    key: "seasonContext",
    label: "Season Context",
    placeholder: "e.g. Spring — K12 Gala + Auctions",
    hint: "Optional — helps Claude browse the right pages.",
  },
];

const WHAT_HAPPENS = [
  "Each company checked for open deals & negative signals",
  "Right POC identified by job title and sequence module",
  "Opt-out, bounce and DND contacts skipped automatically",
  "Companies with 10+ contacts get top 2 POCs enrolled",
  "First email scheduled at 9am contact's local timezone",
  "Every outcome logged as a note on the company record",
  "Skipped companies trigger a task assigned to you",
];

const EMPTY_FORM = {
  email: "",
  repId: "",
  sequenceId: "",
  segmentId: "",
  sequenceName: "",
  seasonContext: "",
};

export default function App() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);
  const [customRules, setCustomRules] = useState(false);
  const [targetModule, setTargetModule] = useState("");
  const [titles, setTitles] = useState([]);
  const [titleInput, setTitleInput] = useState("");
  const [school, setSchool] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState({});
  const [focused, setFocused] = useState(null);

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const addTitle = (val) => {
    const t = val.trim();
    if (t && !titles.includes(t)) setTitles((arr) => [...arr, t]);
    setTitleInput("");
  };

  const validateSequence = () => {
    const e = {};
    ["repId", "sequenceId", "segmentId", "sequenceName"].forEach((key) => {
      if (!form[key].trim()) e[key] = "Required";
    });
    if (!form.email.trim()) {
      e.email = "Required";
    } else if (!/^[^\s@]+@(almabase|getalmabase)\.com$/i.test(form.email.trim())) {
      e.email = "Use your Slack email (@almabase.com or @getalmabase.com)";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateRules = () => {
    if (customRules && !titles.length) {
      setErrors({ titles: "Add at least one title" });
      return false;
    }
    setErrors({});
    return true;
  };

  const searchSchool = async () => {
    if (!school.trim()) return;
    setSearching(true);
    setSearchError("");
    setSearchResult(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          system:
            'You are a sales assistant for Almabase. Search the staff directory for the given institution and find contacts relevant to alumni, giving, events, communications, and advancement. Return ONLY valid JSON, no markdown: {"institution":"name","found_contacts":[{"name":"","title":"","email":""}],"suggested_titles":["5-8 titles"],"notes":"brief context"}',
          messages: [
            {
              role: "user",
              content: `Find relevant staff at: ${school}. Return JSON only.`,
            },
          ],
        }),
      });
      const data = await res.json();
      const text = (
        (data.content || [])
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("") || ""
      )
        .replace(/```json|```/g, "")
        .trim()
        .match(/\{[\s\S]*\}/);
      if (!text) throw new Error();
      setSearchResult(JSON.parse(text[0]));
    } catch {
      setSearchError(
        "Could not load results. Try a full name like 'University of Michigan'.",
      );
    }
    setSearching(false);
  };

  const runEnrollment = async () => {
    setRunning(true);
    const payload = {
      email: form.email.trim(),
      rep_hs_id: form.repId,
      sequence_id: form.sequenceId,
      segment_id: form.segmentId,
      sequence_name: form.sequenceName,
      season_context: form.seasonContext,
      custom_rules: customRules
        ? { enabled: true, target_module: targetModule, job_titles: titles }
        : { enabled: false },
    };
    try {
      await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        mode: "no-cors",
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("Webhook error:", err);
    }
    setRunning(false);
    setDone(true);
  };

  const reset = () => {
    setStep(0);
    setForm(EMPTY_FORM);
    setCustomRules(false);
    setTargetModule("");
    setTitles([]);
    setSearchResult(null);
    setDone(false);
    setErrors({});
  };

  const inputStyle = (key) => ({
    width: "100%",
    padding: "11px 14px",
    fontSize: 15,
    fontFamily: FONT,
    color: "#1a1a1a",
    background: "white",
    border: `1.5px solid ${
      errors[key] ? "#e05454" : focused === key ? "#0957b8" : "#e4e4e4"
    }`,
    borderRadius: 8,
    outline: "none",
    transition: "border-color 0.15s",
  });

  const labelStyle = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#555",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: "0.4px",
  };

  const h2Style = {
    fontSize: 22,
    fontWeight: 700,
    color: "#1a1a1a",
    marginBottom: 4,
  };

  const subStyle = { fontSize: 14, color: "#999", marginBottom: 28 };

  return (
    <div
      style={{
        fontFamily: FONT,
        minHeight: "100vh",
        background: "#f7f7f5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 500 }}>
        {/* Logo */}
        <div
          style={{
            marginBottom: 36,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              background: "#0957b8",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M2 4h12M2 8h8M2 12h10"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#1a1a1a",
              letterSpacing: "-0.2px",
            }}
          >
            Almabase
          </span>
        </div>

        {/* Stepper */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 32 }}>
          {STEPS.map((label, i) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                flex: i < STEPS.length - 1 ? 1 : "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: step >= i ? "#0957b8" : "#d4d4d4",
                    transition: "background 0.2s",
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    color: step === i ? "#0957b8" : "#aaa",
                    fontWeight: step === i ? 600 : 400,
                    whiteSpace: "nowrap",
                    letterSpacing: "0.2px",
                  }}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: 1,
                    background: step > i ? "#0957b8" : "#e4e4e4",
                    margin: "0 10px",
                    marginBottom: 18,
                    transition: "background 0.2s",
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div
          style={{
            background: "white",
            borderRadius: 14,
            border: "1px solid #ececec",
            padding: "32px 30px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
          }}
        >
          {/* Step 0 — Sequence details */}
          {step === 0 && !done && (
            <div>
              <h2 style={h2Style}>Sequence details</h2>
              <p style={subStyle}>Fill in the IDs for this enrollment run.</p>
              {SEQUENCE_FIELDS.map(({ key, label, placeholder, hint }) => (
                <div key={key} style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>{label}</label>
                  {hint && (
                    <p style={{ fontSize: 12, color: "#bbb", marginBottom: 6 }}>
                      {hint}
                    </p>
                  )}
                  <input
                    value={form[key]}
                    onChange={(e) => setField(key, e.target.value)}
                    placeholder={placeholder}
                    onFocus={() => setFocused(key)}
                    onBlur={() => setFocused(null)}
                    style={inputStyle(key)}
                  />
                  {errors[key] && (
                    <p style={{ fontSize: 12, color: "#e05454", marginTop: 4 }}>
                      {errors[key]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Step 1 — POC rules */}
          {step === 1 && !done && (
            <div>
              <h2 style={h2Style}>POC rules</h2>
              <p style={subStyle}>
                Claude auto-selects POCs from the sequence name. Add custom
                titles if needed.
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: 22,
                  marginBottom: 22,
                  borderBottom: "1px solid #f0f0f0",
                }}
              >
                <div>
                  <div
                    style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}
                  >
                    Custom job title rules
                  </div>
                  <div style={{ fontSize: 13, color: "#bbb", marginTop: 2 }}>
                    Restrict enrollment to specific titles
                  </div>
                </div>
                <button
                  onClick={() => setCustomRules((v) => !v)}
                  style={{
                    width: 42,
                    height: 24,
                    borderRadius: 12,
                    background: customRules ? "#0957b8" : "#e4e4e4",
                    border: "none",
                    cursor: "pointer",
                    position: "relative",
                    transition: "background 0.2s",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 3,
                      left: customRules ? 21 : 3,
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: "white",
                      transition: "left 0.2s",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    }}
                  />
                </button>
              </div>

              {!customRules && (
                <p style={{ fontSize: 14, color: "#bbb", lineHeight: 1.8 }}>
                  Claude will automatically infer the right POC based on your
                  sequence name and season context.
                </p>
              )}

              {customRules && (
                <div>
                  {/* Target Module */}
                  <div style={{ marginBottom: 22 }}>
                    <label style={{ ...labelStyle, marginBottom: 10 }}>
                      Target Module
                    </label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                      {MODULES.map((m) => (
                        <button
                          key={m}
                          onClick={() => {
                            setTargetModule(m);
                            setTitles(MODULE_TITLES[m] || []);
                          }}
                          style={{
                            padding: "6px 13px",
                            fontSize: 13,
                            fontFamily: FONT,
                            borderRadius: 6,
                            border: `1.5px solid ${
                              targetModule === m ? "#0957b8" : "#e4e4e4"
                            }`,
                            background: targetModule === m ? "#0957b8" : "white",
                            color: targetModule === m ? "white" : "#555",
                            cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Target Job Titles */}
                  <div style={{ marginBottom: 22 }}>
                    <label style={labelStyle}>Target Job Titles</label>
                    <p style={{ fontSize: 12, color: "#bbb", marginBottom: 8 }}>
                      Type and press Enter to add.
                    </p>
                    <div
                      onClick={(e) =>
                        e.currentTarget.querySelector("input")?.focus()
                      }
                      style={{
                        minHeight: 52,
                        padding: "8px 10px",
                        background: "white",
                        border: `1.5px solid ${
                          errors.titles ? "#e05454" : "#e4e4e4"
                        }`,
                        borderRadius: 8,
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        alignItems: "center",
                        cursor: "text",
                      }}
                    >
                      {titles.map((t) => (
                        <span
                          key={t}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            background: "#eef3fd",
                            color: "#0957b8",
                            borderRadius: 5,
                            padding: "3px 9px",
                            fontSize: 13,
                          }}
                        >
                          {t}
                          <button
                            onClick={() =>
                              setTitles((arr) => arr.filter((x) => x !== t))
                            }
                            style={{
                              background: "none",
                              border: "none",
                              color: "#0957b8",
                              cursor: "pointer",
                              padding: 0,
                              fontSize: 15,
                              lineHeight: 1,
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <input
                        value={titleInput}
                        onChange={(e) => setTitleInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTitle(titleInput);
                          }
                        }}
                        placeholder={titles.length ? "" : "Add a job title..."}
                        style={{
                          border: "none",
                          outline: "none",
                          fontSize: 14,
                          fontFamily: FONT,
                          color: "#1a1a1a",
                          flex: 1,
                          minWidth: 140,
                          background: "transparent",
                        }}
                      />
                    </div>
                    {errors.titles && (
                      <p
                        style={{ fontSize: 12, color: "#e05454", marginTop: 4 }}
                      >
                        {errors.titles}
                      </p>
                    )}
                  </div>

                  {/* Browse by School */}
                  <div
                    style={{ borderTop: "1px solid #f0f0f0", paddingTop: 22 }}
                  >
                    <label style={labelStyle}>Browse by School</label>
                    <p style={{ fontSize: 12, color: "#bbb", marginBottom: 10 }}>
                      Look up real contacts at a specific institution.
                    </p>
                    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                      <input
                        value={school}
                        onChange={(e) => setSchool(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && searchSchool()}
                        placeholder="e.g. University of Michigan"
                        onFocus={() => setFocused("domain")}
                        onBlur={() => setFocused(null)}
                        style={{ ...inputStyle("domain"), flex: 1, fontSize: 14 }}
                      />
                      <button
                        onClick={searchSchool}
                        disabled={searching || !school.trim()}
                        style={{
                          padding: "11px 18px",
                          background: school.trim() ? "#0957b8" : "#e4e4e4",
                          color: school.trim() ? "white" : "#aaa",
                          border: "none",
                          borderRadius: 8,
                          fontSize: 14,
                          fontFamily: FONT,
                          fontWeight: 600,
                          cursor: school.trim() ? "pointer" : "default",
                        }}
                      >
                        {searching ? "..." : "Search"}
                      </button>
                    </div>

                    {searchError && (
                      <p
                        style={{
                          fontSize: 13,
                          color: "#e05454",
                          marginBottom: 10,
                        }}
                      >
                        {searchError}
                      </p>
                    )}

                    {searchResult && (
                      <div
                        style={{
                          background: "#fafafa",
                          borderRadius: 8,
                          border: "1px solid #ececec",
                          padding: 16,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "#1a1a1a",
                            marginBottom: 14,
                          }}
                        >
                          {searchResult.institution}
                        </div>

                        {searchResult.found_contacts?.length > 0 && (
                          <div style={{ marginBottom: 14 }}>
                            <p
                              style={{
                                fontSize: 11,
                                color: "#bbb",
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                                marginBottom: 10,
                              }}
                            >
                              Contacts found
                            </p>
                            {searchResult.found_contacts.map((c, i) => (
                              <div
                                key={i}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: "9px 0",
                                  borderBottom:
                                    i < searchResult.found_contacts.length - 1
                                      ? "1px solid #f0f0f0"
                                      : "none",
                                }}
                              >
                                <div>
                                  <div
                                    style={{
                                      fontSize: 14,
                                      color: "#1a1a1a",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {c.name}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 12,
                                      color: "#aaa",
                                      marginTop: 1,
                                    }}
                                  >
                                    {c.title}
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    if (!titles.includes(c.title))
                                      setTitles((arr) => [...arr, c.title]);
                                  }}
                                  style={{
                                    fontSize: 12,
                                    padding: "5px 12px",
                                    background: titles.includes(c.title)
                                      ? "#f0fdf4"
                                      : "#eef3fd",
                                    color: titles.includes(c.title)
                                      ? "#16a34a"
                                      : "#0957b8",
                                    border: `1px solid ${
                                      titles.includes(c.title)
                                        ? "#16a34a"
                                        : "#0957b8"
                                    }`,
                                    borderRadius: 6,
                                    cursor: "pointer",
                                    fontFamily: FONT,
                                  }}
                                >
                                  {titles.includes(c.title) ? "Added ✓" : "+ Add"}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {searchResult.suggested_titles?.length > 0 && (
                          <div>
                            <p
                              style={{
                                fontSize: 11,
                                color: "#bbb",
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                                marginBottom: 8,
                              }}
                            >
                              Suggested titles
                            </p>
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 6,
                              }}
                            >
                              {searchResult.suggested_titles.map((t) => (
                                <button
                                  key={t}
                                  onClick={() => {
                                    if (!titles.includes(t))
                                      setTitles((arr) => [...arr, t]);
                                  }}
                                  style={{
                                    fontSize: 12,
                                    padding: "5px 11px",
                                    background: titles.includes(t)
                                      ? "#f0fdf4"
                                      : "white",
                                    color: titles.includes(t)
                                      ? "#16a34a"
                                      : "#555",
                                    border: `1px solid ${
                                      titles.includes(t) ? "#16a34a" : "#e4e4e4"
                                    }`,
                                    borderRadius: 6,
                                    cursor: "pointer",
                                    fontFamily: FONT,
                                  }}
                                >
                                  {titles.includes(t) ? `${t} ✓` : `+ ${t}`}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {searchResult.notes && (
                          <p
                            style={{
                              fontSize: 13,
                              color: "#999",
                              marginTop: 12,
                              paddingTop: 12,
                              borderTop: "1px solid #f0f0f0",
                              lineHeight: 1.6,
                            }}
                          >
                            {searchResult.notes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2 — Review */}
          {step === 2 && !done && (
            <div>
              <h2 style={h2Style}>Review</h2>
              <p style={subStyle}>
                Confirm everything looks right before running.
              </p>
              <div style={{ marginBottom: 24 }}>
                {[
                  ["Email", form.email],
                  ["Rep ID", form.repId],
                  ["Sequence ID", form.sequenceId],
                  ["Segment ID", form.segmentId],
                  ["Sequence Name", form.sequenceName],
                  form.seasonContext && ["Season Context", form.seasonContext],
                  [
                    "POC Rules",
                    customRules
                      ? `Custom — ${titles.length} title${
                          titles.length !== 1 ? "s" : ""
                        }`
                      : "Auto (Claude)",
                  ],
                ]
                  .filter(Boolean)
                  .map(([label, value]) => (
                    <div
                      key={label}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        padding: "11px 0",
                        borderBottom: "1px solid #f5f5f5",
                        gap: 20,
                      }}
                    >
                      <span
                        style={{ fontSize: 13, color: "#aaa", flexShrink: 0 }}
                      >
                        {label}
                      </span>
                      <span
                        style={{
                          fontSize: 14,
                          color: "#1a1a1a",
                          fontWeight: 600,
                          textAlign: "right",
                          wordBreak: "break-all",
                        }}
                      >
                        {value}
                      </span>
                    </div>
                  ))}
              </div>

              {customRules && titles.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <p
                    style={{
                      fontSize: 11,
                      color: "#bbb",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      marginBottom: 10,
                    }}
                  >
                    Target titles
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {titles.map((t) => (
                      <span
                        key={t}
                        style={{
                          background: "#eef3fd",
                          color: "#0957b8",
                          borderRadius: 5,
                          padding: "3px 10px",
                          fontSize: 13,
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div
                style={{
                  background: "#fafafa",
                  borderRadius: 8,
                  border: "1px solid #ececec",
                  padding: "14px 16px",
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    color: "#bbb",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginBottom: 10,
                  }}
                >
                  What happens
                </p>
                {WHAT_HAPPENS.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 13,
                      color: "#777",
                      padding: "3px 0",
                      display: "flex",
                      gap: 10,
                      lineHeight: 1.5,
                    }}
                  >
                    <span style={{ color: "#d4d4d4", flexShrink: 0 }}>—</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Done */}
          {done && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "#f0fdf4",
                  border: "1.5px solid #16a34a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 18px",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M4 10l5 5 7-8"
                    stroke="#16a34a"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#1a1a1a",
                  marginBottom: 8,
                }}
              >
                Enrollment running
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: "#999",
                  lineHeight: 1.7,
                  marginBottom: 28,
                }}
              >
                Check HubSpot company records for notes as the workflow processes
                your segment. Skipped companies will appear as tasks in your
                queue.
              </p>
              <button
                onClick={reset}
                style={{
                  padding: "11px 24px",
                  background: "#0957b8",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 14,
                  fontFamily: FONT,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Run another
              </button>
            </div>
          )}

          {/* Nav */}
          {!done && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 28,
                paddingTop: 22,
                borderTop: "1px solid #f5f5f5",
              }}
            >
              <button
                onClick={() => {
                  setErrors({});
                  setStep((s) => s - 1);
                }}
                disabled={step === 0}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 14,
                  color: step === 0 ? "transparent" : "#aaa",
                  cursor: step === 0 ? "default" : "pointer",
                  fontFamily: FONT,
                  padding: 0,
                }}
              >
                ← Back
              </button>
              {step < 2 ? (
                <button
                  onClick={() => {
                    if (step === 0 && !validateSequence()) return;
                    if (step === 1 && !validateRules()) return;
                    setErrors({});
                    setStep((s) => s + 1);
                  }}
                  style={{
                    padding: "11px 26px",
                    background: "#0957b8",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 14,
                    fontFamily: FONT,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={runEnrollment}
                  disabled={running}
                  style={{
                    padding: "11px 26px",
                    background: running ? "#aac4e8" : "#0957b8",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 14,
                    fontFamily: FONT,
                    fontWeight: 600,
                    cursor: running ? "default" : "pointer",
                  }}
                >
                  {running ? "Running..." : "Run enrollment"}
                </button>
              )}
            </div>
          )}
        </div>

        <p
          style={{
            textAlign: "center",
            marginTop: 20,
            fontSize: 12,
            color: "#ccc",
          }}
        >
          Almabase · Enrollment Automation
        </p>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
