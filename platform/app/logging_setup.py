"""Platform Gateway /*TODO-fr*/。"""

import logging
import sys

from app.config import settings

# ANSI /*TODO-fr*/
_COLORS = {
    "DEBUG": "\033[36m",       # /*TODO-fr*/
    "INFO": "\033[32m",        # /*TODO-fr*/
    "WARNING": "\033[33m",     # /*TODO-fr*/
    "ERROR": "\033[31m",       # /*TODO-fr*/
    "CRITICAL": "\033[1;31m",  # /*TODO-fr*/
}
_RESET = "\033[0m"


class ColorFormatter(logging.Formatter):
    """/*TODO-fr*/。"""

    def format(self, record: logging.LogRecord) -> str:
        color = _COLORS.get(record.levelname, "")
        record.levelname = f"{color}{record.levelname:<7}{_RESET}"
        return super().format(record)


def setup_logging() -> None:
    """/*TODO-fr*/。"""
    log_level = getattr(logging, settings.log_level.upper(), logging.INFO)

    root = logging.getLogger()
    root.setLevel(log_level)

    # /*TODO-fr*/ handler，/*TODO-fr*/
    root.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(log_level)
    handler.setFormatter(ColorFormatter(
        fmt="%(asctime)s %(levelname)s [%(name)s] %(message)s",
        datefmt="%H:%M:%S",
    ))
    root.addHandler(handler)

    # /*TODO-fr*/
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("litellm").setLevel(logging.WARNING)
    logging.getLogger("LiteLLM").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)


def log_settings_summary() -> None:
    """/*TODO-fr*/，/*TODO-fr*/。"""
    logger = logging.getLogger("platform.config")

    def _mask(key: str) -> str:
        """API Key /*TODO-fr*/：/*TODO-fr*/ 4 位。"""
        return f"{key[:4]}***" if len(key) > 4 else ("(/*TODO-fr*/)" if key else "(空)")

    logger.info("========== Platform Gateway /*TODO-fr*/ ==========")
    logger.info("  /*TODO-fr*/ openclaw : %s", settings.dev_openclaw_url or "(/*TODO-fr*/)")
    logger.info("  /*TODO-fr*/ gateway  : %s", settings.dev_gateway_url or "(/*TODO-fr*/)")
    logger.info("  /*TODO-fr*/          : %s", settings.default_model)
    logger.info("  /*TODO-fr*/            : %s", settings.database_url.split("@")[-1] if "@" in settings.database_url else settings.database_url)

    # LLM /*TODO-fr*/
    providers = {
        "anthropic": settings.anthropic_api_key,
        "openai": settings.openai_api_key,
        "deepseek": settings.deepseek_api_key,
        "dashscope": settings.dashscope_api_key,
        "minimax": settings.minimax_api_key,
        "kimi": settings.kimi_api_key,
        "moonshot": settings.moonshot_api_key,
        "aihubmix": settings.aihubmix_api_key,
        "evolink": settings.evolink_api_key,
        "openrouter": settings.openrouter_api_key,
        "zhipu": settings.zhipu_api_key,
    }
    configured = {k: _mask(v) for k, v in providers.items() if v}
    unconfigured = [k for k, v in providers.items() if not v]

    if configured:
        logger.info("  /*TODO-fr*/ LLM /*TODO-fr*/ : %s", ", ".join(f"{k}={v}" for k, v in configured.items()))
    else:
        logger.warning("  /*TODO-fr*/ LLM /*TODO-fr*/ : 无 —— /*TODO-fr*/ LLM /*TODO-fr*/!")

    if unconfigured:
        logger.info("  /*TODO-fr*/ LLM /*TODO-fr*/ : %s", ", ".join(unconfigured))

    # vLLM
    if settings.hosted_vllm_api_base:
        logger.info("  vLLM /*TODO-fr*/         : %s (key=%s)", settings.hosted_vllm_api_base, _mask(settings.hosted_vllm_api_key))
    logger.info("============================================")
