# ---- Build stage ----
FROM golang:1.25 AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy go.mod and go.sum first (better layer caching)
COPY go.mod ./
COPY go.sum ./
RUN go mod download

# Copy the rest of the code
COPY . .

# Build the Go app as a statically linked binary
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server

# ---- Runtime stage ----
# FROM gcr.io/distroless/base-debian12
FROM alpine:3.14

WORKDIR /app
COPY --from=builder /app/server .

# Run the binary
CMD ["./server"]
