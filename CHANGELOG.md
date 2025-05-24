# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.1] - 2024-12-24

### Fixed
- CI/CD Docker build failures caused by missing package-lock.json file
- Updated Dockerfile to use `--omit=dev` instead of deprecated `--only=production` flag
- Resolved npm ci command compatibility issues with modern npm versions

### Added
- Generated package-lock.json file for consistent dependency resolution
- Improved Docker build reliability and reproducibility

## [0.8.0] - 2024-12-19

### Added
- Comprehensive CI/CD pipeline with GitHub Actions
- Docker containerization support for consistent deployments
- Automated deployment scripts with rollback mechanisms
- ESLint integration for code quality checks and security auditing
- Multi-platform Electron app building (Windows, macOS, Linux)
- Automated server deployment with PM2 process management
- Detailed CI/CD setup documentation and configuration guides
- Docker Compose for easy service orchestration
- Enhanced package.json with new deployment and maintenance scripts
- Secure configuration management with environment variables

### Changed
- Updated project structure to support CI/CD workflows
- Enhanced .gitignore to include CI/CD related files
- Improved deployment scripts with better error handling

## [0.7.3] - 2024-12-19

### Fixed
- DNS resolution issues with STUN servers that caused connection failures
- Enhanced connection stability for 2000km+ distance P2P connections

### Added
- TURN server support for improved NAT traversal in long-distance connections
- Enhanced WebRTC configuration with better ICE gathering and connection timeouts
- Automatic connection recovery and reconnection mechanisms
- Comprehensive connection quality monitoring and error handling
- Improved ICE candidate gathering with multiple reliable STUN/TURN servers
- Proper cleanup and resource management for failed connections

## [0.7.2] - 2024-12-19

### Added
- Centralized configuration management system
- `config/server.json` for easy server and STUN server configuration
- Configuration loading modules for both Node.js and browser environments
- `/config` API endpoint for browser-based configuration loading

### Changed
- Replaced hardcoded server URLs with configurable settings
- Improved maintainability by eliminating hardcoded network settings

## [0.7.1] - 2024-12-19

### Fixed
- STUN server URL format error that caused RTCPeerConnection construction to fail
- Removed invalid query parameter from Twilio STUN server URL
- Corrected STUN URL format to comply with WebRTC standards
- Improved connection reliability by fixing malformed STUN server configuration

## [0.7.0] - 2024-12-19

### Added
- Support for hosting the signaling server on a public server
- Remote signaling server connectivity
- Enhanced documentation for server deployment

### Changed
- Modified client code to connect to remote signaling server
- Updated connection sharing to use the public server URL
- Improved cross-network connectivity with remote signaling
