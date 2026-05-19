# Spec: Web Server

## ADDED Requirements

### Requirement: Root Route Response

The web server SHALL respond to GET requests at `/` with the text "Hello World".

#### Scenario: Browser visits root

- **WHEN** a client sends a GET request to `http://localhost:8080/`
- **THEN** the server responds with HTTP 200
- **AND** the response body contains "Hello World"

### Requirement: Port Configuration

The server SHALL listen on the port defined by the `PORT` environment variable, defaulting to `8080`.

#### Scenario: Default port

- **WHEN** the `PORT` environment variable is not set
- **THEN** the server starts on port 8080

#### Scenario: Custom port via environment

- **WHEN** the `PORT` environment variable is set to a value
- **THEN** the server starts on that port
