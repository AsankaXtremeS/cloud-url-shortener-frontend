"use client";

import { FormEvent, useState, useEffect } from "react";

interface ShortenResponse {
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  qrCode?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function Home() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<ShortenResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<ShortenResponse[]>([]);

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cloud_link_history");
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch {
      // Ignore
    }
  }, []);

  const saveToHistory = (item: ShortenResponse) => {
    try {
      setHistory((prev) => {
        const filtered = prev.filter((h) => h.shortCode !== item.shortCode);
        const updated = [item, ...filtered].slice(0, 3);
        localStorage.setItem("cloud_link_history", JSON.stringify(updated));
        return updated;
      });
    } catch {
      // Ignore
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    let targetUrl = url.trim();
    if (!targetUrl) return;

    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = "https://" + targetUrl;
    }

    setError("");
    setResult(null);
    setCopied(false);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/shorten`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalUrl: targetUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to shorten URL");
      }

      if (!data.qrCode && data.shortCode) {
        data.qrCode = `${API_BASE}/api/qr/${data.shortCode}`;
      }

      setResult(data);
      saveToHistory(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to reach backend server. Please verify the backend is running.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (textToCopy: string) => {
    if (!textToCopy) return;

    let copiedSuccessfully = false;

    // 1. Try modern Clipboard API (supported on HTTPS & localhost)
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        copiedSuccessfully = true;
      } catch (err) {
        console.warn("navigator.clipboard failed, attempting fallback:", err);
      }
    }

    // 2. Fallback for HTTP / non-secure contexts (e.g., direct EC2 IP over HTTP)
    if (!copiedSuccessfully && typeof document !== "undefined") {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = textToCopy;
        textarea.style.position = "fixed";
        textarea.style.left = "-999999px";
        textarea.style.top = "-999999px";
        textarea.setAttribute("readonly", "");
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        copiedSuccessfully = document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch (err) {
        console.error("ExecCommand copy fallback failed:", err);
      }
    }

    if (copiedSuccessfully) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="single-window-root">
      {/* Background Ambience */}
      <div className="bg-ambient-wrapper" aria-hidden="true">
        <div className="bg-grid"></div>
        <div className="glow-orb glow-orb-1"></div>
        <div className="glow-orb glow-orb-2"></div>
        <div className="glow-orb glow-orb-3"></div>
      </div>

      {/* Main Single Window Application Shell */}
      <div className="app-container">
        {/* Clean Header (No API Status Badge) */}
        <header className="navbar">
          <div className="brand-logo">
            <div className="logo-icon-box">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </div>
            <span className="brand-name">CloudLink</span>
            <span className="brand-badge">PRO</span>
          </div>
        </header>

        {/* Hero & Central Workspace */}
        <main className="central-workspace">
          <div className="hero-compact">
            <div className="pill-announcement">
              <span className="pill-tag">Instant</span>
              <span>Fast URL Redirection & Built-in QR Engine</span>
            </div>

            <h1 className="hero-title">
              Shorten URLs. <span className="gradient-text">Generate QR Codes.</span>
            </h1>

            <p className="hero-subtitle">
              Transform long links into fast, secure short URLs and vector QR codes in real-time.
            </p>
          </div>

          {/* Input Glass Card */}
          <div className="shortener-box">
            <div className="glass-card">
              <form onSubmit={handleSubmit} className="url-input-form">
                <div className="input-field-wrapper">
                  <span className="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                  </span>

                  <input
                    type="text"
                    className="main-input"
                    placeholder="Enter or paste your link here (e.g., https://example.com/docs)..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                    disabled={loading}
                  />

                  {url && (
                    <button
                      type="button"
                      className="clear-btn"
                      onClick={() => setUrl("")}
                      title="Clear"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>

                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? (
                    <>
                      <div className="spinner" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <span>Shorten & QR</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Error Message */}
            {error && (
              <div className="error-banner">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Side-by-Side Compact Result Box */}
            {result && (
              <div className="result-card-unified">
                <div className="result-left-panel">
                  <div className="result-tag-row">
                    <span className="result-tag">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Short Link Created
                    </span>
                    <span className="code-badge">{result.shortCode}</span>
                  </div>

                  <div className="link-action-box">
                    <a
                      href={result.shortUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="short-link-text"
                    >
                      {result.shortUrl}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>

                    <p className="original-url-text">
                      Target: {result.originalUrl}
                    </p>
                  </div>

                  <div className="result-btn-row">
                    <button
                      type="button"
                      className={`btn-action-primary ${copied ? "copied" : ""}`}
                      onClick={() => handleCopy(result.shortUrl)}
                    >
                      {copied ? (
                        <>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                          <span>Copy URL</span>
                        </>
                      )}
                    </button>

                    <a
                      href={`${API_BASE}/api/qr/${result.shortCode}?download=true`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-action-secondary"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      <span>Download QR</span>
                    </a>
                  </div>
                </div>

                {/* Right QR Visual */}
                <div className="result-right-qr">
                  <div className="qr-box-inner">
                    <img
                      src={
                        result.qrCode ||
                        `${API_BASE}/api/qr/${result.shortCode}`
                      }
                      alt="Backend QR Code"
                      className="qr-image"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Quick feature pill row when no result yet */}
            {!result && (
              <div className="features-pill-row">
                <div className="feature-pill">
                  <span className="pill-dot"></span>
                  <span>Instant Redirection</span>
                </div>
                <div className="feature-pill">
                  <span className="pill-dot purple"></span>
                  <span>Native Vector QR</span>
                </div>
                <div className="feature-pill">
                  <span className="pill-dot cyan"></span>
                  <span>Cloud-Grade Security</span>
                </div>
              </div>
            )}

            {/* Recent links chip row */}
            {!result && history.length > 0 && (
              <div className="recent-chips-container">
                <span className="recent-label">Recent:</span>
                <div className="recent-chips-list">
                  {history.map((h) => (
                    <button
                      key={h.shortCode}
                      className="recent-chip"
                      onClick={() => {
                        setResult(h);
                        setUrl(h.originalUrl);
                      }}
                      title={h.originalUrl}
                    >
                      <span className="chip-code">{h.shortCode}</span>
                      <span className="chip-link">{h.shortUrl.replace(/^https?:\/\//, '')}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Polished Compact Footer */}
        <footer className="footer-compact">
          <span>© {new Date().getFullYear()} CloudLink. Zero-scroll unified workspace.</span>
          <div className="footer-pills">
            <span className="f-pill">Next.js</span>
            <span className="f-pill">Node.js</span>
            <span className="f-pill">Native QR Engine</span>
          </div>
        </footer>
      </div>
    </div>
  );
}