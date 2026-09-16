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

## Test autoscalingu

Uruchom generator ruchu z katalogu repozytorium. Domyslnie wysyla on mieszany ruch GET/POST/DELETE przez 60 sekund do lokalnego API:

```powershell
python .\backend\stress_test.py
```

Przy wdrozeniu w Kind skieruj ruch na Ingress i zwieksz obciazenie:

```powershell
python .\backend\stress_test.py `
  --url http://api.local `
  --workers 50 `
  --duration 300 `
  --pause 0.05
```

Po uruchomieniu obserwuj repliki i metryki:

```powershell
kubectl get hpa,pods -n kind -w
kubectl top pods -n kind
```

Skrypt obsluguje takze `STRESS_BASE_URL`, `--timeout` oraz wyswietla liczbe zadan, bledow i kodow HTTP po zakonczeniu.

## 5. Nazwy lokalne

Dodaj do `C:\Windows\System32\drivers\etc\hosts` (z uprawnieniami administratora):

```text
127.0.0.1 frontend.local api.local grafana.local prometheus.local
```

## 6. Wdrozenie

```powershell
kubectl create namespace kind --dry-run=client -o yaml | kubectl apply -f -

kubectl create configmap grafana-dashboards `
  --from-file=kongsberg-monitoring.json=.\monitoring\dashboards\kongsberg-monitoring.json `
  --namespace kind `
  --dry-run=client -o yaml | kubectl apply -f -

helm upgrade --install praktyki-kind .\praktyki `
  --namespace kind `
  --create-namespace `
  -f .\praktyki\values-kind.yaml

kubectl get ingress,svc,pods -n kind
```

W profilu Kind TLS jest wylaczony, a terminacja ruchu odbywa sie na HTTP Ingress. Dla produkcji uzyj `values-prod.yaml`, cert-managera oraz prawdziwego DNS/certyfikatu.

Profil Kind pozostaje HTTP-only. Profil `values-prod.yaml` wlacza TLS, ale wymaga certyfikatu dostarczonego przez pipeline, poniewaz hosty `.local` nie moga otrzymac certyfikatu Let's Encrypt.

Profile CI uzywaja odrebnych hostow, aby ingress-nginx nie odrzucal identycznych par host/path w roznych namespace'ach: `*.dev.local` dla DEV oraz `*.prod.local` dla PROD. W klastrze z dostepem do tych srodowisk skonfiguruj odpowiednie rekordy DNS albo wpisy w pliku hosts.

Pipeline pobiera sekret `delivery` z Azure Key Vault jako base64 PFX, wyciaga certyfikat, lancuch i klucz prywatny, sprawdza SAN-y oraz tworzy idempotentny sekret `praktyki-tls` przed wdrozeniem Helm. Wildcard `*.dev.local` lub `*.prod.local` obejmuje tylko jeden poziom nazwy. Certyfikat zawierajacy tylko `localhost` nie pasuje do tych hostow, nawet jesli jest zaufany w Windows.

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
kubectl exec deployment/grafana -n kind -- test -f /var/lib/grafana/dashboards/kongsberg-monitoring.json
curl.exe -u admin:change-me -H "Host: grafana.local" http://127.0.0.1/api/search
```

Po wdrozeniu DEV sprawdz sekret, SAN-y i odpowiedz HTTPS:

```powershell
kubectl get secret praktyki-tls -n dev -o jsonpath='{.type}{"\n"}'
kubectl get secret praktyki-tls -n dev -o jsonpath='{.data.tls\.crt}' | %{ [Text.Encoding]::ASCII.GetString([Convert]::FromBase64String($_)) } | openssl x509 -noout -subject -issuer -ext subjectAltName
curl.exe --resolve frontend.dev.local:443:127.0.0.1 https://frontend.dev.local/
curl.exe --resolve api.dev.local:443:127.0.0.1 https://api.dev.local/health
start https://frontend.dev.local/
```

Powtorz polecenia z `-n prod` i nazwami `*.prod.local` dla PROD. Przegladarka musi rozpoznawac nazwe DNS z SAN certyfikatu, a DNS lub plik `hosts` musi kierowac te nazwy na ingress-nginx.

Dashboard jest wczytywany z ConfigMap przez Grafana provisioning, a jego stan jest zapisywany w PVC `grafana-data`. Metryki CI są wysyłane do Pushgateway i trwale przechowywane w PVC `pushgateway-data`.

## Diagnostyka frontendu

Service powinien wskazywac pody z etykieta `app=frontend`, a endpointy powinny miec port 80:

```powershell
kubectl describe svc frontend -n kind
kubectl get endpoints frontend -n kind
kubectl get pods -n kind --show-labels
```

Prawidlowy port-forward to `kubectl port-forward svc/frontend 8080:80 -n kind`. Testuj go pod adresem `http://127.0.0.1:8080/`. Jesli pojawia sie cAdvisor, sprawdz namespace i nazwe Service; w tym chartcie cAdvisor nie jest backendem `frontend`.
