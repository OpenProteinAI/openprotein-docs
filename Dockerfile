FROM ubuntu:20.04 as build

WORKDIR /build

# Install system deps
ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update && \
    apt-get install -y curl && \
    rm -rf /var/lib/apt/lists/*

# Install quarto linux
RUN curl -LO https://github.com/quarto-dev/quarto-cli/releases/download/v1.3.340/quarto-1.3.340-linux-amd64.deb && \
    dpkg -i quarto-1.3.340-linux-amd64.deb && \
    rm quarto-1.3.340-linux-amd64.deb

# Install quarto macos
# RUN curl -LO https://github.com/quarto-dev/quarto-cli/releases/download/v1.3.433/quarto-1.3.433-linux-arm64.deb && \
#     dpkg -i quarto-1.3.433-linux-arm64.deb && \
#     rm quarto-1.3.433-linux-arm64.deb

COPY src /build

RUN quarto render

COPY nginx.conf /build

FROM nginx:1.21-alpine

COPY --from=build /build/_site /var/www/html/app

COPY --from=build /build/nginx.conf /etc/nginx/conf.d/default.conf

RUN chmod -R 755 /var/www/html/app

EXPOSE 5001

CMD ["nginx", "-g", "daemon off;"]
