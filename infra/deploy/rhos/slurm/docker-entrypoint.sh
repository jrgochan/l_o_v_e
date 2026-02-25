#!/bin/bash
set -e

HOSTNAME=$(hostname)

echo "Generating /etc/slurm/slurm.conf for $HOSTNAME..."
cat <<EOF > /etc/slurm/slurm.conf
ClusterName=love-slurm
SlurmctldHost=$HOSTNAME
MpiDefault=none
ProctrackType=proctrack/pgid
ReturnToService=1
SlurmctldPidFile=/var/run/slurmctld.pid
SlurmctldPort=6817
SlurmdPidFile=/var/run/slurmd.pid
SlurmdPort=6818
SlurmdSpoolDir=/var/spool/slurmd
SlurmUser=root
StateSaveLocation=/var/spool/slurmctld
SwitchType=switch/none
TaskPlugin=task/none
NodeName=$HOSTNAME CPUs=$(nproc) State=UNKNOWN
PartitionName=debug Nodes=ALL Default=YES MaxTime=INFINITE State=UP
EOF

echo "Starting munged..."
su -s /bin/bash munge -c "munged --force"

echo "Starting slurmctld..."
slurmctld -c

echo "Starting slurmd..."
slurmd -c

echo "SLURM all-in-one node is up. Ready for sbatch submissions."
# Keep container alive and stream logs
touch /var/log/slurm/slurmctld.log /var/log/slurm/slurmd.log
tail -f /var/log/slurm/slurmctld.log /var/log/slurm/slurmd.log
