import { useState } from 'react'
import { generateApiToken } from '../lib/api'
import { Key, Copy, Check, RefreshCw } from 'lucide-react'

const AGENT_EXAMPLE = `import json
import time
import sys
from urllib.request import Request, urlopen
from urllib.error import HTTPError

BASE_URL = "http://YOUR_SERVER:8080"
API_TOKEN = "YOUR_API_TOKEN"  #  →API 


def api_request(path, method="GET", body=None, timeout=120):
    """ HTTP 。"""
    url = f"{BASE_URL}{path}"
    data = json.dumps(body).encode() if body else None
    req = Request(url, data=data, method=method, headers={
        "Authorization": f"Bearer {API_TOKEN}",
        "Content-Type": "application/json",
    })
    try:
        with urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read())
    except HTTPError as e:
        raise RuntimeError(f"API {method} {path}  ({e.code}): {e.read().decode()}")


def call_agent(agent_id, message, session_key=None, poll_interval=2.0,
               poll_timeout=300, stable_seconds=15):
    """Message agent 。

    agent （Outils），
    Message stable_seconds 。

    Args:
        agent_id:        agent ID（ "main"）
        message:         UtilisateurMessage
        session_key:     Sessions（Sessions）
        poll_interval:   （）
        poll_timeout:    （）
        stable_seconds:  Message（）

    Returns:
         assistant ， None
    """
    if not session_key:
        session_key = f"agent:{agent_id}:session-{int(time.time() * 1000)}"
    encoded_key = session_key.replace(":", "%3A")

    # Message
    try:
        before = api_request(f"/api/openclaw/sessions/{encoded_key}")
        msg_count_before = len(before.get("messages", []))
    except RuntimeError:
        msg_count_before = 0

    # Message
    result = api_request(
        f"/api/openclaw/sessions/{encoded_key}/messages",
        method="POST",
        body={"message": message},
    )
    print(f", runId={result.get('runId')}")

    # （Message stable_seconds ）
    start = time.time()
    last_count = msg_count_before
    last_change = time.time()
    replies = []

    while time.time() - start < poll_timeout:
        time.sleep(poll_interval)
        try:
            session = api_request(f"/api/openclaw/sessions/{encoded_key}")
        except RuntimeError:
            continue

        messages = session.get("messages", [])
        if len(messages) != last_count:
            last_count = len(messages)
            last_change = time.time()

        if len(messages) > msg_count_before:
            replies = [m.get("content", "") for m in messages[msg_count_before:]
                       if m.get("role") == "assistant"]

        if replies and (time.time() - last_change) >= stable_seconds:
            print(f" ({time.time() - start:.1f}s)")
            return replies

        sys.stdout.write(f"\\r agent ... {int(time.time()-start)}s")
        sys.stdout.flush()

    print(f"\\n ({poll_timeout}s)")
    return None


# ──  ──────────────────────────────────────────────────────

replies = call_agent(agent_id="main", message="，")
if replies:
    for i, text in enumerate(replies):
        if len(replies) > 1:
            print(f"---  {i+1} ---")
        print(text)
else:
    print("")
`

const CLI_EXAMPLE = `#  API Token 
python call_agent_api.py --api-token "eyJ..." --agent main -m ""

#  agent ID
python call_agent_api.py --api-token "eyJ..." --agent insurance -m ""

# Sessions（）
python call_agent_api.py --api-token "eyJ..." --agent main -m "" --session "agent:main:session-123"

# 
export OPENCLAW_API_TOKEN="eyJ..."
export OPENCLAW_BASE_URL="http://your-server:8080"
python call_agent_api.py --agent main -m ""
`

export default function ApiAccess() {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  async function handleGenerate() {
    setLoading(true)
    try {
      const res = await generateApiToken()
      setToken(res.api_token)
    } catch (e: unknown) {
      alert(': ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-dark-text">API </h1>
        <p className="mt-1 text-sm text-dark-text-secondary">
           API Token， Python  Agent
        </p>
      </div>

      {/* Token Section */}
      <div className="rounded-xl border border-dark-border bg-dark-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Key size={20} className="text-accent-blue" />
          <h2 className="text-lg font-semibold text-dark-text">API Token</h2>
        </div>
        <p className="text-sm text-dark-text-secondary mb-4">
          API Token  365 jours， Agent。
        </p>

        {token ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-dark-bg px-4 py-3 text-sm text-green-400 font-mono break-all border border-dark-border">
                {token}
              </code>
              <button
                onClick={() => copyToClipboard(token, 'token')}
                className="shrink-0 rounded-lg bg-dark-bg border border-dark-border px-3 py-3 text-dark-text-secondary hover:text-dark-text transition-colors"
                title=""
              >
                {copied === 'token' ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-yellow-500">Enregistrer，Token </span>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="ml-auto flex items-center gap-1.5 text-xs text-dark-text-secondary hover:text-dark-text transition-colors"
              >
                <RefreshCw size={14} />
                
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="rounded-lg bg-accent-blue px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-blue/90 transition-colors disabled:opacity-50"
          >
            {loading ? '...' : ' API Token'}
          </button>
        )}
      </div>

      {/* CLI Usage */}
      <div className="rounded-xl border border-dark-border bg-dark-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-dark-text"></h2>
          <button
            onClick={() => copyToClipboard(CLI_EXAMPLE, 'cli')}
            className="flex items-center gap-1.5 rounded-lg bg-dark-bg border border-dark-border px-3 py-1.5 text-xs text-dark-text-secondary hover:text-dark-text transition-colors"
          >
            {copied === 'cli' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            
          </button>
        </div>
        <p className="text-sm text-dark-text-secondary mb-3">
           <code className="text-accent-blue">call_agent_api.py</code> ：
        </p>
        <pre className="rounded-lg bg-dark-bg border border-dark-border p-4 text-sm text-dark-text-secondary font-mono overflow-x-auto leading-relaxed">
          {CLI_EXAMPLE}
        </pre>
      </div>

      {/* Python Example */}
      <div className="rounded-xl border border-dark-border bg-dark-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-dark-text">Exemple d'appel Python</h2>
          <button
            onClick={() => copyToClipboard(AGENT_EXAMPLE, 'agent')}
            className="flex items-center gap-1.5 rounded-lg bg-dark-bg border border-dark-border px-3 py-1.5 text-xs text-dark-text-secondary hover:text-dark-text transition-colors"
          >
            {copied === 'agent' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            
          </button>
        </div>
        <p className="text-sm text-dark-text-secondary mb-3">
          Message agent ， Python 。
        </p>
        <div className="text-xs text-dark-text-secondary mb-2 font-mono">
          : <code className="text-accent-blue">POST /api/openclaw/sessions/:key/messages</code>
          &nbsp;|&nbsp; : <code className="text-accent-blue">Bearer {'<API_TOKEN>'}</code>
        </div>
        <pre className="rounded-lg bg-dark-bg border border-dark-border p-4 text-sm text-dark-text-secondary font-mono overflow-x-auto max-h-[500px] overflow-y-auto leading-relaxed">
          {AGENT_EXAMPLE}
        </pre>
      </div>
    </div>
  )
}
