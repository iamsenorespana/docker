# Orchestrate container deployments using Docker Swarm

**Prerequisites**
 * If you did not complete the previous tutorial(s) per the [series](../master/README.md), switch to the `_prereq` directory and run `docker-compose up -f <file>` on each file in the directory.

In this tutorial, you will learn how to deploy containers using Docker swarm, which is a Docker orchestration platform to run container across multiple hosts. It will also provide the ability to run a highly available topology and scale containers up and down depending on workload and availability.

You will setup a two-node Docker swarm to demonstrate the master and worker node concepts. Each docker swarm must have a master node (host) that is responsible for scheduling and all other nodes within the swarm are worker nodes that communicate with the master node. 

**Important**
 * Stop existing containers run with the `docker-compose` command using `docker-compose down`.

 **Instructions**

1. Use `docker-machine` to provision the master node (i.e. virtual-machine with docker engine and labeled as master node). The flags that you pass into the `docker-machine` command depend on the driver that your using. If your using virtualbox, use the command:

	`docker-machine create --driver virtualbox --virtualbox-cpu-count=4 --virtualbox-memory-size=4096 manager-node`

2. Use the `docker-machine` command to provision the worker node (i.e. virtual-machine with docker engine provisioned and labelled as worker node).

	`docker-machine create --driver virtualbox --virtualbox-cpu-count=4 --virtualbox-memory-size=4096 worker1-node`

3. List the nodes that were created using `docker-machine ls`
	```
	NAME           ACTIVE   DRIVER         STATE     URL                         SWARM   DOCKER    ERRORS
	manager-node   -        vmwarefusion   Running   tcp://172.16.154.241:2376           v1.12.2

	worker1-node   -        vmwarefusion   Running   tcp://172.16.154.239:2376           v1.12.3
	```
4. Make the `manager-node` the swarm master 
	```
	eval $(docker-machine env manager-node)
	docker swarm init --advertise-addr $(docker-machine ip manager-node)
	```
5. The response to the `swarm init` action should provide a command to execute on worker nodes. Switch to the worker-node and run the same command.
	```
	eval $(docker-machine env worker1-node)
	docker swarm join \
	--token SWMTKN-1-0dzdhkkye2l2e7c7z0ggkjxdcpk7w9ny0eepmcc8s5foc6a01k-6dwq5cwgffrzs4f0in6vflqig \
	172.16.154.244:2377
	```
6. Examine the **swarm** status of the nodes (docker machines) with the commands:
	```
	eval $(docker-machine env manager-node)
	docker node ls
	ID                           HOSTNAME      STATUS  AVAILABILITY  MANAGER STATUS
	8mi0wjhdkaxhynna4v4s1hsl2 *  manager-node  Ready   Active        Leader
	evjx87a2f54cyzom7fkorev6a    worker1-node  Ready   Active
	```
	
Docker networking provides an infrastructure component called ingress load balancing, which is a virtual IP address (VIP) that all node workers listen for connections to published service ports and internally load balance it to the appropriate container.

8. Navigate to the `application` directory. Enter the following command to schedule containers in a docker swarm
	`docker stack deploy --compose-file docker-compose.yml `

9. Scale the number of containers instances with the command
	`docker service scale gateway=3`

## Multi-Host Deployments of ELK and Prometheus

You can deploy ELK and Prometheus using a similar approach, but the deployment of these stacks is different since the architecture consists of a management server that captures data from multiple containers.
* When deploying the ELK / Prometheus stacks, you will need to ensure that each host machine has access to the project directory (ie docker-compose files)
* Prometheus, elastic search and kibana containers only need to run on the manager-node, so you can restrict deployment using docker swarm constraints (ie node.hostname == manager-node)
* In order to monitor more hosts using Prometheus, deploy the node-exporter and cAdvisor containers on each host and point them to the Prometheus server.
* A startup issue was discovered during deployment when running Elastic search. Make sure you enter the following command: `sysctl -w vm.max_map_count=262144`


