# Technologies for building a born on the cloud startup

The technology barrier for startups is lower than ever with easy access to cloud services and mature open source technologies. In this post, I will talk about my vision for building a container-based cloud solution, focusing on open source technologies in a vendor agnostic approach. It will cover key functional and non-functional requirements, from logging, monitoring, security and application development. I don't have an idea for my startup at this time, but I consider that a small detail in the overall big picture :)

The choice of enterprise vs open source software is an organizational decision, based on many factors such as in-house skills, company culture, and cost. If your core competency is not IT, then building a relationship with an vendor is a good option. On the other hand, open source software is a good approach if your building out a team with a strong technology background. You may even take a hybrid approach of using both enterprise and open-source software.

In this tutorial, I will describe and demonstrate key areas that you need to design and build out when deploying a cloud-ready digital application. We will focus on building our solution using Docker containers so we can easily integrate it into a DevOps pipeline to support continous integration and scale in a cloud environment.

**Prerequisites**
 * [Docker Toolbox](https://www.docker.com/products/docker-toolbox) for Mac (or Windows) - this tutorial was written using Mac.
 * Intermediate Docker skills
 * Use `git` to download the artifacts from [here](https://github.com/ozairs/docker).
 * Laptop / server with lots of memory and RAM. Recommend atleast 16 cores / 16GB for running all the containers in the series. For individual labs, recommend atleast 4 cores / 4 GB RAM.

In this tutorial series, we will focus on the following areas:

1. [Deploying digital applications in a three-tier architecture](#../master/application/README.md)
2. [Log Management & Analytics using ELK](../master/elk/README.md)
3. [Container monitoring using Prometheus](../master/prometheus/README.md)
4. [Simplify infrastructure deployments with Docker networking](../master/networking/README.md)
5. [Continous Integration using Git and Jenkins](../master/devops/README.md)
6. [Orchestrate container deployments using Docker Swarm](../master/swarm/README.md)
7. [Orchestrate container deployments using Kubernetes & Minikube](../master/kubernetes/README.md)