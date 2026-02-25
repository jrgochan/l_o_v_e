# L.O.V.E. Demonstration: Kubernetes & SLURM HPC Integration

This document serves as the presentation guide for the **Senior HPC Linux Systems Engineer** interview at ORNL. It maps the local containerized deployment of the L.O.V.E. emotional intelligence platform to the enterprise-scale architecture required for running systems like Frontier.

---

## 🏗️ 1. Infrastructure as Code (IaC)

### Local Implementation
The cluster was instantiated using **Ansible** (`kubernetes.core.k8s` collection) to declare the desired state of namespaces, RBAC, deployments, and services.

### Why it Matters at ORNL
Managing 10,000+ compute nodes requires immutable, declarative configurations. By bringing up the Postgres, Redis, and FastAPI microservices via Ansible, we demonstrate the ability to script reliable, repeatable environments that eliminate configuration drift across the cluster, a critical capability for RHOSP (Red Hat OpenStack Platform) and RHEL bare-metal deployments.

---

## 🔒 2. Container Security & Isolation

### Local Implementation
- Implemented **Podman / Makefile Container Scanning** (`make scan`) using Trivy to detect CVEs before pushing to the registry.
- Enforced **Namespaced Isolation** (`love-stack` vs. `slurm-cluster`) mimicking tenant isolation.
- Adapted SLURM daemons (`slurmd`, `slurmctld`, `munge`) to run correctly inside unprivileged OpenShift containers by bypassing systemd dbus interfaces and mapping `cgroup/v1` rules directly via `IgnoreSystemd=yes`.

### Why it Matters at ORNL
Federal systems demand strict compliance with DOE cybersecurity guidelines. Integrating CVE scanning into the build pipeline and aggressively locking down container execution context proves a "security-first" engineering mindset required for classified or highly sensitive batch workloads.

---

## 🚀 3. High Performance Computing (HPC) Workflows

### Local Implementation
We tested two distinct paradigms for parallel batch execution:
1. **Cloud-Native Batch:** Dispatched OpenShift `Job` resources (`parallelism: 3`, `completions: 10`) across the cluster to concurrently process L.O.V.E. emotion data.
2. **Traditional HPC (SLURM):** Deployed a fully functional SLURM scheduler dynamically within the container layer. We executed `sbatch` scripts that mapped natively to the `squeue` pipeline, mimicking exactly how researchers submit jobs to Frontier.

### Why it Matters at ORNL
Bridging the gap between legacy HPC schedulers (SLURM/LSF) and modern cloud-native orchestration (Kubernetes/OpenShift) is arguably the hardest challenge in modern supercomputing. This demo proves deep fluency in both ecosystems.

---

## 💾 4. Parallel Filesystem Simulation

### Local Implementation
We provisioned a `ReadWriteMany` (RWX) PersistentVolumeClaim using the CRC Hostpath Provisioner. The `emotional-batch-processor` jobs were configured to scatter data out to this shared scratch volume and gather the results asynchronously.

### Why it Matters at ORNL
Lustre and GPFS (Spectrum Scale) form the backbone of exascale storage. Providing a unified mounting semantic where thousands of concurrent Pods or SLURM jobs can access the exact same dataset concurrently without locking issues is a mandatory skillset.

---

## 📊 5. Advanced System Observability

### Local Implementation
Leveraged **OpenShift User Workload Monitoring** built on Prometheus.
Injected the `prometheus-fastapi-instrumentator` package into the `versor`, `observer`, and `listener` python monoliths. This enables scraping of core HTTP Dials, error histograms, and transaction throughput (`/metrics`).

### Why it Matters at ORNL
Scale amplifies failure. Being able to visualize bottleneck latency on a Grafana dashboard before a queue drops is the difference between a minor hiccup and an entire research division going offline. Instrumenting the application code directly provides the rich telemetry required to spot CPU/Memory spikes before they trigger OOM Killer.

---

## 🚨 6. Incident Response & High Availability (HA)

### Local Implementation
Performed a "Chaos Test" by manually executing `oc delete pod -l app=love-observer` to simulate a kernel panic or node failure taking down the application.
Observed OpenShift's reconciliation loop detect the drift and instantly spawn a new replica, routing traffic effectively within seconds.

### Why it Matters at ORNL
The 24/7 on-call responsibilities mentioned in the job description require a cool head. Documenting the kill-and-recover cycle verifies that the architecture is fault-tolerant and capable of self-healing, reducing middle-of-the-night pages for the Tier operations team.
