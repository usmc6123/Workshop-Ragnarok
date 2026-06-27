FROM ubuntu:24.04
WORKDIR /app
COPY lemon-website .
RUN chmod +x lemon-website
EXPOSE 8080
CMD ["./lemon-website", "--site-name", "Workshop: Ragnarok", "--slogan", "Your personal service manual library", "--production", "-l", "0.0.0.0:8080", "/data/charm/index.json", "/data/lemon/index.json"]
