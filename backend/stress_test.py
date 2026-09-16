import argparse
import os
import random
import threading
import time
from concurrent.futures import ThreadPoolExecutor

import requests

stop_event = threading.Event()
stats_lock = threading.Lock()
stats = {
    "requests": 0,
    "errors": 0,
    "status_codes": {},
}


def record_response(status_code: int | None = None, error: bool = False) -> None:
    with stats_lock:
        stats["requests"] += 1
        if error:
            stats["errors"] += 1
        elif status_code is not None:
            status_codes = stats["status_codes"]
            status_codes[status_code] = status_codes.get(status_code, 0) + 1


def request(method: str, url: str, timeout: float, **kwargs) -> requests.Response | None:
    try:
        response = requests.request(method, url, timeout=timeout, **kwargs)
        record_response(response.status_code)
        return response
    except requests.RequestException:
        record_response(error=True)
        return None


def create_text(base_url: str, timeout: float) -> None:
    request(
        "POST",
        f"{base_url}/api/texts",
        timeout,
        json={"content": f"Stress test {time.time()}"},
    )


def list_texts(base_url: str, timeout: float) -> requests.Response | None:
    return request("GET", f"{base_url}/api/texts", timeout)


def generate_404(base_url: str, timeout: float) -> None:
    request("DELETE", f"{base_url}/api/texts/999999", timeout)


def generate_400(base_url: str, timeout: float) -> None:
    request("POST", f"{base_url}/api/texts", timeout, json={"content": "   "})


def delete_random_text(base_url: str, timeout: float) -> None:
    response = list_texts(base_url, timeout)
    if response is None or not response.ok:
        return

    try:
        items = response.json()
    except ValueError:
        return

    if items:
        item = random.choice(items)
        request("DELETE", f"{base_url}/api/texts/{item['id']}", timeout)


def worker(base_url: str, timeout: float, pause: float) -> None:
    actions = [
        (list_texts, 0.70),
        (create_text, 0.20),
        (delete_random_text, 0.05),
        (generate_404, 0.025),
        (generate_400, 0.025),
    ]

    while not stop_event.is_set():
        action = random.choices(*zip(*actions))[0]
        action(base_url, timeout)
        stop_event.wait(pause)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate traffic for API autoscaling tests.")
    parser.add_argument(
        "--url",
        default=os.getenv("STRESS_BASE_URL", "http://localhost:8000"),
        help="API base URL (default: %(default)s)",
    )
    parser.add_argument("--workers", type=int, default=20, help="Number of concurrent workers")
    parser.add_argument("--duration", type=float, default=60, help="Test duration in seconds")
    parser.add_argument("--pause", type=float, default=0.1, help="Pause between requests")
    parser.add_argument("--timeout", type=float, default=5, help="Request timeout in seconds")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.workers < 1 or args.duration <= 0 or args.pause < 0 or args.timeout <= 0:
        raise SystemExit("workers must be >= 1; duration and timeout > 0; pause >= 0")

    base_url = args.url.rstrip("/")
    print(f"Generating traffic against {base_url} with {args.workers} workers for {args.duration:g}s")

    executor = ThreadPoolExecutor(max_workers=args.workers)
    try:
        for _ in range(args.workers):
            executor.submit(worker, base_url, args.timeout, args.pause)
        time.sleep(args.duration)
    except KeyboardInterrupt:
        print("Stopping early...")
    finally:
        stop_event.set()
        executor.shutdown(wait=True)

    with stats_lock:
        status_codes = ", ".join(
            f"{status}: {count}" for status, count in sorted(stats["status_codes"].items())
        ) or "none"
        print(f"Requests: {stats['requests']}; errors: {stats['errors']}; status codes: {status_codes}")
    print("Done")


if __name__ == "__main__":
    main()