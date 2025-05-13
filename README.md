# StreamGO - Educational Video Streaming Platform

StreamGO is a modern, microservices-based video streaming platform specifically designed for educational content. It features adaptive video streaming with HLS (HTTP Live Streaming), multipart uploads, and real-time video transcoding.

## Architecture

The platform consists of four main microservices:

1. **Client Service** (Port 3000)
   - Next.js-based frontend application
   - Responsive UI with Tailwind CSS
   - Google Authentication integration
   - HLS video player with adaptive bitrate streaming

2. **Upload Service** (Port 3001)
   - Handles multipart file uploads
   - AWS S3 integration for video storage
   - Kafka message publishing for transcoding requests
   - PostgreSQL database integration

3. **Transcoder Service** (Port 3002)
   - FFmpeg-based video transcoding
   - HLS stream generation with multiple quality levels
   - Kafka consumer for processing upload events
   - Adaptive bitrate streaming support

4. **Watch Service** (Port 3003)
   - Video playback management
   - Signed URL generation for secure access
   - Video metadata management
   - PostgreSQL database integration


![User Flow Diagram](client\public\user-worksflow-diagram.png)

## Features

- **Adaptive Streaming**: Multiple quality levels (240p to 1080p) using HLS
- **Chunk-based Uploads**: Large file uploads using multipart upload
- **Real-time Transcoding**: FFmpeg-powered video processing
- **Authentication**: Google OAuth integration
- **Microservices Architecture**: Scalable and maintainable design
- **Message Queue**: Kafka-based event processing
- **Database**: PostgreSQL for data persistence
- **Object Storage**: AWS S3 integration
- **Future Enhancement**: Elasticsearch integration for video search (planned)

## Prerequisites

- Docker and Docker Compose
- Node.js (v18 or higher)
- PostgreSQL
- FFmpeg
- AWS Account with S3 access
- Kafka cluster
- Google OAuth credentials

## Environment Variables

Each service requires specific environment variables. Create .env files in respective service directories:

### Client Service
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### Upload Service
```env
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
AWS_BUCKET=your_s3_bucket
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/streamgo
```

### Transcoder Service
```env
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
AWS_BUCKET=your_s3_bucket
```

### Watch Service
```env
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/streamgo
```

## Running the Application

1. Start the services using Docker Compose:
```bash
docker-compose up --build
```

2. Access the application:
   - Frontend: http://localhost:3000
   - Upload Service: http://localhost:3001
   - Transcoder Service: http://localhost:3002
   - Watch Service: http://localhost:3003


## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.