# OpenStreetMap Screenshot Service

This service allows you to obtain screenshots of OpenStreetMap based on either coordinates (latitude and longitude) or a location name query.

## Features

- Generate map screenshots using latitude and longitude coordinates
- Generate map screenshots using location name queries (e.g., "Nedre Slottsgate, Oslo")
- Adjustable zoom level for map screenshots
- Simple web interface for interacting with the service
- RESTful API endpoints for integration with other applications
- Rate limiting capabilities
- Health check endpoint for monitoring

## Prerequisites

- Node.js (v16 or later)
- npm (Node Package Manager)

## Installation

1. Clone this repository or download the source code:

```bash
git clone https://github.com/yourusername/nominatim-screenshotter.git
cd nominatim-screenshotter
```

2. Install the required dependencies:

```bash
npm install
```

## Usage

### Starting the Service

Run the following command to start the service:

```bash
npm start
```

The service will start and listen on port 3000 by default (you can change this by setting the PORT environment variable).

### API Endpoints

#### 1. Map Screenshot by Coordinates

```
GET /map-screenshot?lat={latitude}&lon={longitude}&zoom={zoom}
```

Parameters:
- `lat`: Latitude (required)
- `lon`: Longitude (required)
- `zoom`: Zoom level (optional, default: 15, range: 1-19)

Example:
```
GET /map-screenshot?lat=59.911491&lon=10.757933&zoom=16
```

#### 2. Map Screenshot by Location Query

```
GET /location-screenshot?query={location}&zoom={zoom}
```

Parameters:
- `query`: Location name or address (required)
- `zoom`: Zoom level (optional, default: 15, range: 1-19)

Example:
```
GET /location-screenshot?query=Nedre%20Slottsgate,%20Oslo&zoom=17
```

### Web Interface

The service comes with a simple web interface that you can access in your browser:

```
http://localhost:3000/
```

From there, you can:
- Search by coordinates (latitude and longitude)
- Search by location name/address
- Adjust the zoom level
- View the generated map screenshots

## Deployment

### Environment Variables

- `PORT`: The port on which the service will run (default: 3000)
- `PUPPETEER_NO_SANDBOX`: Set to "true" to disable sandbox mode (recommended for containers)
- `REQUEST_TIMEOUT`: Timeout for requests in milliseconds (default: 30000)
- `RATE_LIMIT_REQUESTS`: Number of requests allowed per window (default: 0, disabled)
- `RATE_LIMIT_WINDOW_MS`: Time window for rate limiting in milliseconds (default: 60000)

### Docker Deployment

The easiest way to deploy this service is using Docker:

1. Build and start the container using Docker Compose:
```bash
docker-compose up -d
```

2. Or build and run the Docker container manually:
```bash
# Build the Docker image
docker build -t nominatim-screenshotter .

# Run the container
docker run -p 3000:3000 -d nominatim-screenshotter
```

The service will be available at http://localhost:3000.

### Coolify Deployment

For deployment with Coolify, see the [Coolify Deployment Guide](COOLIFY_DEPLOYMENT.md).

### Traditional Deployment

For traditional deployment, consider the following:

1. Use a process manager like PM2:
```bash
npm install -g pm2
pm2 start map-screenshot-service.js
```

2. Set up a reverse proxy with Nginx or similar

3. Add SSL/TLS certificates for secure connections

## Important Notes

- Respect OpenStreetMap's [Acceptable Use Policy](https://operations.osmfoundation.org/policies/acceptable-use/)
- Consider implementing rate limiting for production use
- The headless browser (Puppeteer) requires additional dependencies on some Linux distributions

## License

MIT