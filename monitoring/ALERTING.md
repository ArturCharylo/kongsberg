# Grafana alerting to Azure DevOps

Grafana sends a `POST` request to pipeline 3 when one of these alerts fires:

- API unavailable for 2 minutes
- critical Trivy vulnerability present for 5 minutes
- high Trivy vulnerability present for 5 minutes

The alerting configuration is in `alerting/alerting.yml`. The PAT is not stored in Git. It is read from the `AZURE_DEVOPS_PAT` environment variable and is sent as HTTP Basic Auth by Grafana.

## Create the PAT

In Azure DevOps, create a PAT for `arturcha` with only:

- `Build: Read & execute`

The PAT must be allowed to run pipeline 3 in project `kongsberg`.

## Helm / Kubernetes

For the CI/CD deployment, add a secret variable named `AZURE_DEVOPS_PAT` to the existing Azure DevOps variable group `km`. Mark it as secret. The pipeline creates the Kubernetes Secret automatically in both `dev` and `prod`.

For a manual deployment, paste the PAT only where marked below and run the command in the target namespace:

```powershell
kubectl create secret generic grafana-alerting `
  --from-literal=azure-devops-pat='PASTE_YOUR_PAT_HERE' `
  --namespace dev
```

Replace `PASTE_YOUR_PAT_HERE` with the PAT value. Do not put it in `values.yaml`, `alerting.yml`, or the pipeline URL.

For the Helm deployment, the default `grafana.alerting.existingSecret` value is `grafana-alerting`. If another Secret name is used, set it with `--set grafana.alerting.existingSecret=<secret-name>`.

Use `--namespace prod` for the production release. For Kind use `--namespace kind`. The plain `k8s` deployment also expects a Secret named `grafana-alerting` containing the key `azure-devops-pat`.

After creating or changing the Secret, restart Grafana:

```powershell
kubectl rollout restart deployment/grafana --namespace dev
```

Use the matching namespace (`kind` or `prod`) when applicable.

## Docker Compose

Set the PAT in the shell before starting Compose. PowerShell:

```powershell
$env:AZURE_DEVOPS_PAT = 'PASTE_YOUR_PAT_HERE'
docker compose up -d grafana
```

The alerting file is mounted read-only and the PAT is passed only through the container environment.
