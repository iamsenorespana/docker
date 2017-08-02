# Orchestrate container deployments using Kubernetes & Minikube

In this tutorial ...

Terminology differences between docker swarm
* **Pod**: one or more (tightly-coupled) containers with attached volumes. For example, nginx and microgateway could be deployed in a pod. Kubernetes schedules pods to run, which indirectly run containers.
* **Deployment**: defines an app with pod replicas. For example, it would define that the pod must have two instances for HA. This would be similar to a docker service concept within `docker-compose`.
* **Service**: groups together pods based on labels or other characteristics, enabling service discovery of pods, similar to how `docker-compose` uses the `port` attribute. For example, this would deploy the gateway pod (nginx + microgateway) on port 4430 on the host machine. This is similar to the docker ingress controller.
* **Ingress**: exposes clustered applications to external traffic

At this point, we have focused on defining our containers using docker-compose, so it would be less than ideal if we had to rewrite it again for Kubernetes. Fortunately, someone has already solved the problem. [Kompose](https://github.com/kubernetes-incubator/kompose) is a tool that translates a docker-compose file into Kubernetes resources.