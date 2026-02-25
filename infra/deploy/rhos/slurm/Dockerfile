FROM rockylinux:9

# Install EPEL and SLURM
RUN dnf install -y epel-release && \
    dnf install -y slurm slurm-slurmctld slurm-slurmd munge sudo procps-ng && \
    dnf clean all

# Generate munge key and set permissions
RUN /usr/sbin/create-munge-key && \
    chown munge:munge /etc/munge/munge.key && \
    chmod 400 /etc/munge/munge.key && \
    mkdir -p /var/spool/slurmctld /var/spool/slurmd /var/log/slurm && \
    chown slurm:slurm /var/spool/slurmctld /var/spool/slurmd /var/log/slurm || true

# We will run as root for this demo controller/worker combo to avoid permission issues
# with munged and slurmctld in a single container.
# In a real cluster we would separate them and use proper SCCs.

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
