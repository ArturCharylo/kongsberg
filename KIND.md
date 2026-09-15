# Uruchomienie w Kind

## 1. Utworzenie klastra

Wymagane są Docker, `kind`, `kubectl` i Helm.

```powershell
kind create cluster --config kind-config.yaml
kubectl wait --namespace kube-system --for=condition=Ready node/praktyki-control-plane --timeout=120s
```

Konfiguracja mapuje porty hosta 80 i 443 do control-plane. Nie uruchamiaj drugiego procesu zajmujacego te porty.

## 2. Kontroler Ingress

```powershell
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.12.1/deploy/static/provider/kind/deploy.yaml
kubectl wait --namespace ingress-nginx --for=condition=Ready pod --selector=app.kubernetes.io/component=controller --timeout=180s
```

Chart wymaga `IngressClass` o nazwie `nginx`, dostarczanej przez powyzszy manifest.

## 3. Storage i autoscaling

Kind nie dostarcza automatycznie provisionera dla PVC ani Metrics Servera. Zainstaluj je przed wdrozeniem:

```powershell
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/v0.0.31/deploy/local-path-storage.yaml
kubectl patch storageclass local-path -p '{"metadata":{"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
kubectl patch deployment metrics-server -n kube-system --type=json -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'
```

## 4. Obrazy aplikacji

Zbuduj obrazy aplikacji i zaladuj je do Kind:

```powershell
docker build -t praktyki-api:local .\backend
docker build -t praktyki-frontend:local .\km_Praktyki
kind load docker-image praktyki-api:local praktyki-frontend:local --name praktyki
```

Obrazy PostgreSQL, Prometheusa i Grafany sa pobierane z publicznych rejestrow.

## 5. Nazwy lokalne

Dodaj do `C:\Windows\System32\drivers\etc\hosts` (z uprawnieniami administratora):

```text
127.0.0.1 frontend.local api.local grafana.local prometheus.local
```

## 6. Wdrozenie

```powershell
helm upgrade --install praktyki-kind .\praktyki `
  --namespace kind `
  --create-namespace `
  -f .\praktyki\values-kind.yaml

kubectl get ingress,svc,pods -n kind
```

W profilu Kind TLS jest wylaczony, a terminacja ruchu odbywa sie na HTTP Ingress. Dla produkcji uzyj `values-prod.yaml`, cert-managera oraz prawdziwego DNS/certyfikatu.

Profil `values-prod.yaml` celowo pozostawia TLS wylaczony, poniewaz hosty `.local` nie moga otrzymac certyfikatu Let's Encrypt. Po ustawieniu publicznych nazw DNS wlacz TLS i cert-managera przez osobny plik values, na przyklad:

```powershell
helm upgrade --install praktyki-prod .\praktyki `
  --namespace prod `
  -f .\praktyki\values-prod.yaml `
  --set ingress.hosts.frontend=app.example.com `
  --set ingress.hosts.api=api.example.com `
  --set ingress.hosts.grafana=grafana.example.com `
  --set ingress.hosts.prometheus=prometheus.example.com `
  --set ingress.tls.enabled=true `
  --set ingress.certManager.enabled=true
```

## Sprawdzenie

```powershell
curl.exe -H "Host: frontend.local" http://127.0.0.1/
curl.exe -H "Host: api.local" http://127.0.0.1/health
curl.exe -H "Host: grafana.local" http://127.0.0.1/api/health
curl.exe -H "Host: prometheus.local" http://127.0.0.1/-/ready
```
