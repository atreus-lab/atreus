FROM node:20-bookworm

RUN apt-get update && apt-get install -y curl git

RUN curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash && \
    /root/.nargo/bin/noirup -v 1.0.0-beta.22

ENV PATH="/root/.nargo/bin:${PATH}"
WORKDIR /app
