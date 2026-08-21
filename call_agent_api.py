#!/usr/bin/env python3
"""OpenClaw API / SSE 调试工具。

支持：
- 注册 dedicated / shared 账号
- 用户名密码登录获取 JWT
- 根据账号类型发起一次聊天请求
- 连接对应 SSE 端点，打印流式事件

典型用法：
  from call_agent_api import register_account, stream_chat_demo

  register_account('user2', 'user1@example.com', 'welcome', runtime_mode='dedicated')
  register_account('share2', 'share1@example.com', 'welcome', runtime_mode='shared')

  stream_chat_demo(username='user2', password='welcome', message='请用三句话自我介绍')
  stream_chat_demo(username='share2', password='welcome', message='请用三句话自我介绍')
"""

from __future__ import annotations

import json
import os
import threading
import time
import uuid
from typing import Any
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

BASE_URL = os.getenv("OPENCLAW_BASE_URL", "http://localhost:8080")
API_TOKEN = os.getenv("OPENCLAW_API_TOKEN", "")
USERNAME = os.getenv("OPENCLAW_USERNAME", "admin")
PASSWORD = os.getenv("OPENCLAW_PASSWORD", "admin123")

_jwt_cache: dict[tuple[str, str], str] = {}


def _json_request(
    url: str,
    *,
    method: str = "GET",
    payload: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
    timeout: int = 30,
) -> dict[str, Any] | list[Any]:
    request_headers = {"Content-Type": "application/json"}
    if headers:
        request_headers.update(headers)

    data = None
    if payload is not None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")

    req = Request(url, data=data, headers=request_headers, method=method)
    try:
        with urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        try:
            detail = json.loads(body)
        except json.JSONDecodeError:
            detail = {"detail": body or f"HTTP {exc.code}"}
        raise RuntimeError(f"请求失败 ({exc.code}): {detail}") from exc



def get_jwt(base_url: str = BASE_URL, username: str = USERNAME, password: str = PASSWORD) -> str:
    """用户名密码登录，获取 access token。"""
    cache_key = (base_url, username)
    if cache_key in _jwt_cache:
        return _jwt_cache[cache_key]

    result = _json_request(
        f"{base_url.rstrip('/')}/api/auth/login",
        method="POST",
        payload={"username": username, "password": password},
    )
    if not isinstance(result, dict) or not result.get("access_token"):
        raise RuntimeError(f"登录成功但未返回 access_token: {result}")

    _jwt_cache[cache_key] = str(result["access_token"])
    return _jwt_cache[cache_key]



def register_account(
    username: str,
    email: str,
    password: str,
    *,
    runtime_mode: str = "dedicated",
    base_url: str = BASE_URL,
) -> dict[str, Any]:
    """注册 dedicated/shared 账号。"""
    if runtime_mode not in {"dedicated", "shared"}:
        raise ValueError("runtime_mode 必须是 'dedicated' 或 'shared'")

    result = _json_request(
        f"{base_url.rstrip('/')}/api/auth/register",
        method="POST",
        payload={
            "username": username,
            "email": email,
            "password": password,
            "runtime_mode": runtime_mode,
        },
    )
    if not isinstance(result, dict):
        raise RuntimeError(f"注册返回格式异常: {result}")
    return result



def get_me(token: str, *, base_url: str = BASE_URL) -> dict[str, Any]:
    result = _json_request(
        f"{base_url.rstrip('/')}/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    if not isinstance(result, dict):
        raise RuntimeError(f"/api/auth/me 返回格式异常: {result}")
    return result



def get_shared_agent_info(token: str, *, base_url: str = BASE_URL) -> dict[str, Any]:
    result = _json_request(
        f"{base_url.rstrip('/')}/api/shared-openclaw/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    if not isinstance(result, dict):
        raise RuntimeError(f"/api/shared-openclaw/me 返回格式异常: {result}")
    return result



def list_agents(token: str, *, base_url: str = BASE_URL) -> list[dict[str, Any]]:
    result = _json_request(
        f"{base_url.rstrip('/')}/api/openclaw/agents",
        headers={"Authorization": f"Bearer {token}"},
    )
    if isinstance(result, list):
        return [item for item in result if isinstance(item, dict)]
    if isinstance(result, dict) and isinstance(result.get("agents"), list):
        return [item for item in result["agents"] if isinstance(item, dict)]
    raise RuntimeError(f"/api/openclaw/agents 返回格式异常: {result}")



def build_session_key(agent_id: str) -> str:
    return f"agent:{agent_id}:session-{int(time.time() * 1000)}-{uuid.uuid4().hex[:6]}"



def start_sse_listener(
    *,
    base_url: str,
    token: str,
    runtime_mode: str,
    session_key: str,
    print_prefix: str = "SSE",
) -> tuple[threading.Event, threading.Thread]:
    """开启一个后台线程监听 SSE，并打印当前 session 的 chat 事件。"""
    stop_event = threading.Event()

    if runtime_mode == "shared":
        stream_path = "/api/shared-openclaw/events/stream"
    else:
        stream_path = "/api/openclaw/events/stream"

    stream_url = f"{base_url.rstrip('/')}{stream_path}?{urlencode({'token': token})}"

    def _run() -> None:
        req = Request(stream_url, headers={"Accept": "text/event-stream"})
        try:
            with urlopen(req, timeout=120) as resp:
                buffer: list[str] = []
                while not stop_event.is_set():
                    raw = resp.readline()
                    if not raw:
                        break
                    line = raw.decode("utf-8", errors="replace").rstrip("\r\n")
                    if line == "":
                        _handle_sse_block(buffer, session_key, print_prefix)
                        buffer = []
                        continue
                    buffer.append(line)
        except Exception as exc:
            if not stop_event.is_set():
                print(f"[{print_prefix}] SSE 连接结束: {exc}")

    thread = threading.Thread(target=_run, daemon=True)
    thread.start()
    return stop_event, thread



def _handle_sse_block(lines: list[str], session_key: str, print_prefix: str) -> None:
    if not lines:
        return

    data_lines = [line[5:].lstrip() for line in lines if line.startswith("data:")]
    if not data_lines:
        return

    payload_text = "\n".join(data_lines)
    try:
        event = json.loads(payload_text)
    except json.JSONDecodeError:
        print(f"[{print_prefix}] 非 JSON SSE: {payload_text}")
        return

    payload = event.get("payload") if isinstance(event, dict) else None
    if event.get("event") != "chat" or not isinstance(payload, dict):
        return

    event_session_key = payload.get("sessionKey") or payload.get("session_key")
    if event_session_key != session_key:
        return

    state = payload.get("state")
    print(f"[{print_prefix}] state={state}")
    if state == "delta":
        message = payload.get("message") or {}
        content = message.get("content")
        if isinstance(content, list):
            text_parts = [part.get("text", "") for part in content if isinstance(part, dict) and part.get("type") == "text"]
            text = "".join(text_parts)
        elif isinstance(content, str):
            text = content
        else:
            text = ""
        if text:
            print(f"[{print_prefix}] delta: {text}")
    elif state in {"final", "error", "aborted"}:
        if payload.get("message"):
            print(f"[{print_prefix}] payload: {json.dumps(payload, ensure_ascii=False)}")



def send_chat_message(
    token: str,
    *,
    message: str,
    runtime_mode: str,
    session_key: str,
    base_url: str = BASE_URL,
    max_attempts: int = 12,
) -> dict[str, Any]:
    headers = {"Authorization": f"Bearer {token}"}
    last_error: Exception | None = None

    for attempt in range(1, max_attempts + 1):
        try:
            if runtime_mode == "shared":
                result = _json_request(
                    f"{base_url.rstrip('/')}/api/shared-openclaw/chat",
                    method="POST",
                    payload={"message": message, "session_key": session_key},
                    headers=headers,
                    timeout=120,
                )
            else:
                result = _json_request(
                    f"{base_url.rstrip('/')}/api/openclaw/sessions/{session_key}/messages",
                    method="POST",
                    payload={"message": message},
                    headers=headers,
                    timeout=120,
                )
            if not isinstance(result, dict):
                raise RuntimeError(f"发送消息返回格式异常: {result}")
            return result
        except RuntimeError as exc:
            last_error = exc
            error_text = str(exc)
            if runtime_mode == "dedicated" and "OpenClaw container is starting up" in error_text and attempt < max_attempts:
                wait_seconds = min(attempt * 2, 10)
                print(f"[INFO] dedicated 容器启动中，第 {attempt}/{max_attempts} 次重试，等待 {wait_seconds}s")
                time.sleep(wait_seconds)
                continue
            raise

    raise RuntimeError(f"发送消息失败: {last_error}")



def wait_for_run(
    token: str,
    *,
    runtime_mode: str,
    run_id: str,
    timeout_ms: int = 15000,
    max_wait_seconds: int = 120,
    base_url: str = BASE_URL,
) -> dict[str, Any]:
    headers = {"Authorization": f"Bearer {token}"}
    deadline = time.time() + max_wait_seconds

    if runtime_mode == "shared":
        wait_path = f"/api/shared-openclaw/runs/{run_id}/wait"
    else:
        wait_path = f"/api/openclaw/runs/{run_id}/wait"

    while time.time() < deadline:
        result = _json_request(
            f"{base_url.rstrip('/')}{wait_path}?{urlencode({'timeoutMs': timeout_ms})}",
            headers=headers,
            timeout=(timeout_ms // 1000) + 10,
        )
        if not isinstance(result, dict):
            raise RuntimeError(f"wait 返回格式异常: {result}")
        if result.get("status") != "timeout":
            return result

    return {"status": "timeout", "error": f"超过 {max_wait_seconds}s 仍未完成"}



def get_session_detail(
    token: str,
    *,
    runtime_mode: str,
    session_key: str,
    base_url: str = BASE_URL,
) -> dict[str, Any]:
    headers = {"Authorization": f"Bearer {token}"}
    if runtime_mode == "shared":
        path = f"/api/shared-openclaw/sessions/{session_key}"
    else:
        path = f"/api/openclaw/sessions/{session_key}"
    result = _json_request(f"{base_url.rstrip('/')}{path}", headers=headers, timeout=60)
    if not isinstance(result, dict):
        raise RuntimeError(f"会话详情返回格式异常: {result}")
    return result



def stream_chat_demo(
    *,
    username: str,
    password: str,
    message: str,
    base_url: str = BASE_URL,
    agent_id: str = "main",
) -> dict[str, Any]:
    """登录一个账号，连接 SSE，发一条消息并打印流式输出。

    返回：
      {
        'runtime_mode': ...,
        'session_key': ...,
        'run_result': ...,
        'final_messages': ...,
      }
    """
    token = get_jwt(base_url=base_url, username=username, password=password)
    me = get_me(token, base_url=base_url)
    runtime_mode = str(me.get("runtime_mode") or "dedicated")

    if runtime_mode == "shared":
        shared_info = get_shared_agent_info(token, base_url=base_url)
        agent_id = str(shared_info["agent_id"])

    session_key = build_session_key(agent_id)
    print(f"[INFO] username={username} runtime_mode={runtime_mode} session_key={session_key}")

    stop_event, thread = start_sse_listener(
        base_url=base_url,
        token=token,
        runtime_mode=runtime_mode,
        session_key=session_key,
        print_prefix=f"{username}:{runtime_mode}",
    )

    # 给 SSE 一点连接时间
    time.sleep(1.0)

    try:
        send_result = send_chat_message(
            token,
            message=message,
            runtime_mode=runtime_mode,
            session_key=session_key,
            base_url=base_url,
        )
        print(f"[INFO] send_result={json.dumps(send_result, ensure_ascii=False)}")

        run_id = send_result.get("runId")
        run_result = {"status": "no_run_id"}
        if run_id:
            run_result = wait_for_run(
                token,
                runtime_mode=runtime_mode,
                run_id=str(run_id),
                base_url=base_url,
            )
        print(f"[INFO] run_result={json.dumps(run_result, ensure_ascii=False)}")

        # 给 SSE final 事件一点输出时间
        time.sleep(2.0)
        detail = get_session_detail(
            token,
            runtime_mode=runtime_mode,
            session_key=session_key,
            base_url=base_url,
        )
        messages = detail.get("messages") or []
        print(f"[INFO] final_message_count={len(messages)}")
        if messages:
            last_message = messages[-1]
            print(f"[INFO] final_last_message={json.dumps(last_message, ensure_ascii=False)}")

        return {
            "runtime_mode": runtime_mode,
            "session_key": session_key,
            "run_result": run_result,
            "final_messages": messages,
        }
    finally:
        stop_event.set()
        thread.join(timeout=2)


if __name__ == "__main__":
    # 测试注册账号
    # register_account(username="user2",email="user1@example.com", password="welcome",runtime_mode="dedicated", base_url="http://localhost:8080")
    # register_account(username="share2",email="share1@example.com", password="welcome",runtime_mode="shared", base_url="http://localhost:8080")
    print("测试 dedicated 账号 SSE:")
    stream_chat_demo(
        username="user2",
        password="welcome",
        message="请用三句话写一首自我介绍",
    )
    print("\n测试 shared 账号 SSE:")
    stream_chat_demo(
        username="share2",
        password="welcome",
        message="请用三句话介绍一下什么是openclaw",
    )
