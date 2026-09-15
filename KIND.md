# Uruchomienie w Kind

## 1. Utworzenie klastra

Wymagane są Docker, `kind`, `kubectl` i Helm.

```powershell
kind create cluster --config kind-config.yaml
kubectl wait --namespace kube-system --for=condition=Ready node/praktyki-control-plane --timeout=120s
docker port praktyki-control-plane
```

Konfiguracja mapuje porty hosta 80 i 443 do control-plane. Nie uruchamiaj drugiego procesu zajmujacego te porty.
Oczekiwany wynik zawiera `80/tcp` oraz `443/tcp`. Jesli istnieje juz klaster `praktyki` utworzony bez tych mapowan, mapowania nie da sie dodac przez `kubectl`; po zabezpieczeniu danych trzeba odtworzyc klaster:

```powershell
kind delete cluster --name praktyki
kind create cluster --name praktyki --config kind-config.yaml
```

Usuniecie klastra usuwa zasoby lokalnego klastra, dlatego przed ta operacja wykonaj backup danych z PVC.

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
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
$metricsPatch = @'
{
  "spec": {
    "template": {
      "spec": {
        "containers": [
          {
            "name": "metrics-server",
            "image": "registry.k8s.io/metrics-server/metrics-server:v0.9.0",
            "ports": [{"name": "https", "containerPort": 10250, "protocol": "TCP"}],
            "args": [
              "--cert-dir=/tmp",
              "--secure-port=10250",
              "--kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname",
              "--kubelet-use-node-status-port",
              "--metric-resolution=15s",
              "--kubelet-insecure-tls"
            ]
          }
        ]
      }
    }
  }
}
'@
$metricsPatch | Set-Content .\metrics-server-patch.json
kubectl patch deployment metrics-server -n kube-system --type=merge --patch-file .\metrics-server-patch.json
kubectl rollout status deployment/metrics-server -n kube-system --timeout=120s
Remove-Item .\metrics-server-patch.json
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

## Diagnostyka frontendu

Service powinien wskazywac pody z etykieta `app=frontend`, a endpointy powinny miec port 80:

```powershell
kubectl describe svc frontend -n kind
kubectl get endpoints frontend -n kind
kubectl get pods -n kind --show-labels
```

Prawidlowy port-forward to `kubectl port-forward svc/frontend 8080:80 -n kind`. Testuj go pod adresem `http://127.0.0.1:8080/`. Jesli pojawia sie cAdvisor, sprawdz namespace i nazwe Service; w tym chartcie cAdvisor nie jest backendem `frontend`.
