# Kongsberg Internship – Cloud-Native DevSecOps & Observability Platform

A microservices platform designed and deployed on Kubernetes utilizing Helm, automated Horizontal Pod Autoscaling (HPA), comprehensive observability, and multi-stage DevSecOps CI/CD delivery pipelines in Azure DevOps.

---

## 🌟 Key Features & Architecture

- **Application Architecture**:
  - **Frontend (`km_Praktyki`)**: React / TypeScript single-page application served via Nginx.
  - **Backend (`backend`)**: Python REST API (FastAPI / SQLAlchemy) integrated with a PostgreSQL database.
- **Infrastructure & Kubernetes**:
  - Local development environment powered by **Kind** alongside enterprise-grade cloud environments (**DEV** & **PROD**).
  - Packaged and managed with **Helm** charts (`praktyki/`) supporting environment profiles (`values-kind.yaml`, `values-dev.yaml`, `values-prod.yaml`).
  - **Autoscaling (HPA)**: Automated horizontal pod scaling based on CPU and memory metrics delivered via Metrics Server.
  - **Ingress & Networking**: NGINX Ingress Controller providing host-based routing, path rewrites, and TLS termination.
- **DevSecOps & Supply Chain Security**:
  - **Quality & Security Gates**: Automated gates in Azure DevOps enforcing zero critical vulnerabilities (`Trivy CRITICAL = 0` policy for PROD).
  - **SBOM (Software Bill of Materials)**: Automated CycloneDX SBOM generation across application components.
  - **Artifact Signing**: Container image and artifact signing workflows backed by **Cosign**.
  - **Secrets & Certificate Management**: Integrated with **Azure Key Vault** to handle intermediate TLS certificates and automated secret injection.
- **Observability Pipeline**:
  - Real-time container metrics collection using **cAdvisor**.
  - CI/CD build, security (Trivy), and quality metrics pushed via **Prometheus Pushgateway**.
  - Custom visualization dashboards (`kongsberg-monitoring.json`) pre-provisioned in **Grafana** alongside multi-channel alerting rules.

---

## 🚀 Local Deployment with Kind

### 1. Prerequisites
- Docker
- `kind`
- `kubectl`
- Helm v3
- Python 3.x (for running load/stress tests)

---

### 2. Cluster Creation

The cluster configuration maps host ports `80` and `443` directly to the `control-plane` node. Ensure no local process is occupying these ports prior to launch.

```powershell
kind create cluster --config kind-config.yaml
kubectl wait --namespace kube-system --for=condition=Ready node/praktyki-control-plane --timeout=120s
docker port praktyki-control-plane
```

> **Note**: Expected output must contain mappings for both `80/tcp` and `443/tcp`. If a cluster named `praktyki` already exists without these mappings, port bindings cannot be added dynamically via `kubectl`. Back up any persistent volume data before recreating the cluster:
> ```powershell
> kind delete cluster --name praktyki
> kind create cluster --name praktyki --config kind-config.yaml
> ```

---

### 3. NGINX Ingress Controller

The Helm chart expects an `IngressClass` named `nginx`. Deploy the official Kind-compatible controller manifest:

```powershell
kubectl apply -f [https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.12.1/deploy/static/provider/kind/deploy.yaml](https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.12.1/deploy/static/provider/kind/deploy.yaml)
kubectl wait --namespace ingress-nginx --for=condition=Ready pod --selector=app.kubernetes.io/component=controller --timeout=180s
```

---

### 4. Storage & Metrics Server (Autoscaling)

Kind does not bundle dynamic PVC storage provisioners or a Metrics Server out of the box. Deploy them before chart installation:

```powershell
# Install Local Path Provisioner
kubectl apply -f [https://raw.githubusercontent.com/rancher/local-path-provisioner/v0.0.31/deploy/local-path-storage.yaml](https://raw.githubusercontent.com/rancher/local-path-provisioner/v0.0.31/deploy/local-path-storage.yaml)

# Install Metrics Server with TLS patch for Kind
kubectl apply -f [https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml](https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml)
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

---

### 5. Build and Load Application Images

Build local application container images and side-load them into the Kind cluster nodes:

```powershell
docker build -t praktyki-api:local .\backend
docker build -t praktyki-frontend:local .\km_Praktyki
kind load docker-image praktyki-api:local praktyki-frontend:local --name praktyki
```

*PostgreSQL, Prometheus, Grafana, and Pushgateway images are pulled automatically from public container registries.*

---

### 6. Local DNS / Hosts Setup

Add domain mappings to your local hosts file (`C:\Windows\System32\drivers\etc\hosts` with Administrator privileges on Windows, or `/etc/hosts` on Linux/macOS):

```text
127.0.0.1 frontend.local api.local grafana.local prometheus.local
```

---

### 7. Helm Release Deployment

```powershell
# Create namespace
kubectl create namespace kind --dry-run=client -o yaml | kubectl apply -f -

# Create ConfigMap for Grafana dashboards
kubectl create configmap grafana-dashboards `
  --from-file=kongsberg-monitoring.json=.\monitoring\dashboards\kongsberg-monitoring.json `
  --namespace kind `
  --dry-run=client -o yaml | kubectl apply -f -

# Deploy Helm chart with Kind configuration values
helm upgrade --install praktyki-kind .\praktyki `
  --namespace kind `
  --create-namespace `
  -f .\praktyki\values-kind.yaml

kubectl get ingress,svc,pods -n kind
```

---

## 🧪 Verification & Load Testing

### Health Checks (Kind HTTP)
```powershell
curl.exe -H "Host: frontend.local" [http://127.0.0.1/](http://127.0.0.1/)
curl.exe -H "Host: api.local" [http://127.0.0.1/health](http://127.0.0.1/health)
curl.exe -H "Host: grafana.local" [http://127.0.0.1/api/health](http://127.0.0.1/api/health)
curl.exe -H "Host: prometheus.local" [http://127.0.0.1/-/ready](http://127.0.0.1/-/ready)
kubectl exec deployment/grafana -n kind -- test -f /var/lib/grafana/dashboards/kongsberg-monitoring.json
curl.exe -u admin:change-me -H "Host: grafana.local" [http://127.0.0.1/api/search](http://127.0.0.1/api/search)
```

### Autoscaling Stress Test (HPA)
Run the load generator from the repository root against the Ingress route:

```powershell
python .\backend\stress_test.py `
  --url [http://api.local](http://api.local) `
  --workers 50 `
  --duration 300 `
  --pause 0.05
```

In a separate terminal window, monitor horizontal pod autoscaling and node resource metrics:

```powershell
kubectl get hpa,pods -n kind -w
kubectl top pods -n kind
```

---

## 🔒 Production Deployment, TLS & CI/CD Pipeline

- **TLS Termination**: The local Kind profile operates over plain HTTP. The DEV (`values-dev.yaml`) and PROD (`values-prod.yaml`) environments enforce TLS and distinct domain namespaces to avoid routing collisions:
  - DEV: `*.dev.local`
  - PROD: `*.prod.local` (or standard corporate FQDNs such as `*.example.com`)
- **CI/CD Pipeline Workflow**:
  - Extracts wildcard PFX certificates from Azure Key Vault as base64, parses Subject Alternative Names (SANs), and provision an idempotent `praktyki-tls` Kubernetes secret prior to Helm execution.
  - Enforces vulnerability scans and publishes SBOM artifacts directly to Pushgateway.
- **Production Helm Deployment Example**:

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

---

## 🛠️ Troubleshooting & Diagnostics

If the frontend cannot be reached through the Ingress controller:

```powershell
# Verify service selectors and pod endpoints
kubectl describe svc frontend -n kind
kubectl get endpoints frontend -n kind
kubectl get pods -n kind --show-labels

# Direct port-forward test (bypassing Ingress)
kubectl port-forward svc/frontend 8080:80 -n kind
# Open [http://127.0.0.1:8080/](http://127.0.0.1:8080/) in your browser
```
