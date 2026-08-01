from collections import defaultdict, deque
from threading import Lock
from time import monotonic

from fastapi import HTTPException, status


class SlidingWindowRateLimiter:
    """محدودکننده ساده درون‌حافظه‌ای؛ برای چند worker بهتر است Redis جایگزین شود."""

    def __init__(self) -> None:
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def check(self, key: str, limit: int, window_seconds: int = 3600) -> None:
        now = monotonic()
        cutoff = now - window_seconds
        with self._lock:
            bucket = self._events[key]
            while bucket and bucket[0] < cutoff:
                bucket.popleft()
            if len(bucket) >= limit:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="تعداد درخواست‌ها زیاد شده است. کمی بعد دوباره تلاش کنید.",
                )
            bucket.append(now)


rate_limiter = SlidingWindowRateLimiter()
