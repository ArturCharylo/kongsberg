FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . ./backend

LABEL signer="Kongsberg-Maritime Code Signing"
LABEL cert-fingerprint="F1:5F:53:EB:4A:B2:19:91:C7:27:16:A3:D3:40:2F:5D:D1:40:C0:C7:F1:31:DB:95:7B:6E:F3:12:D2:A4:B3:E8"
LABEL image-signature="sha256:6e7e608cd85947c0c43e60cd4721393be1f703fb7ed747d8810af40988754a8e"


EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
