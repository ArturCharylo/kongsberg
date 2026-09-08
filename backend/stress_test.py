import random
import threading
import time
from concurrent.futures import ThreadPoolExecutor

import requests

BASE_URL = "http://localhost:8000"

stop_event = threading.Event()


def create_text():
    try:
        requests.post(
            f"{BASE_URL}/api/texts",
            json={"content": f"Test {time.time()}"},
            timeout=5,
        )
    except Exception as e:
        print(f"POST error: {e}")


def list_texts():
    try:
        requests.get(
            f"{BASE_URL}/api/texts",
            timeout=5,
        )
    except Exception as e:
        print(f"GET error: {e}")


def generate_404():
    requests.delete(
        f"{BASE_URL}/api/texts/999999",
        timeout=5,
    )


def generate_400():
    requests.post(
        f"{BASE_URL}/api/texts",
        json={"content": "   "},
        timeout=5,
    )


def delete_random_text():
    try:
        response = requests.get(
            f"{BASE_URL}/api/texts",
            timeout=5,
        )

        if response.ok and response.json():
            item = random.choice(response.json())
            requests.delete(
                f"{BASE_URL}/api/texts/{item['id']}",
                timeout=5,
            )

    except Exception as e:
        print(f"DELETE error: {e}")


def worker():
    actions = [
        (list_texts, 0.7),
        (create_text, 0.2),
        (delete_random_text, 0.1),
        (generate_404, 0.05),
        (generate_400, 0.05),
    ]

    while not stop_event.is_set():
        action = random.choices(
            [a[0] for a in actions],
            weights=[a[1] for a in actions],
        )[0]

        action()

        time.sleep(0.1)


if __name__ == "__main__":
    threads = 20
    duration = 60

    print(f"Generating traffic with {threads} workers for {duration}s")

    with ThreadPoolExecutor(max_workers=threads) as executor:
        for _ in range(threads):
            executor.submit(worker)

        time.sleep(duration)
        stop_event.set()

    print("Done")